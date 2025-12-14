"""FastAPI application for the analytics agent web interface."""

import datetime
import json
import logging
import sys
from io import StringIO
from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

SRC_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = SRC_DIR.parent
WEB_DIR = BASE_DIR / "web"
STATIC_DIR = WEB_DIR / "static"
PROMPT_DIR = SRC_DIR / "prompt"

sys.path.insert(0, str(BASE_DIR))

from src.agents.analytics_agent import (  # noqa: E402
    reload_analytics_agent,
    stream_analytics_agent_with_history,
)
from src.config.settings import get_settings  # noqa: E402
from src.core.db import (  # noqa: E402
    add_message,
    create_session,
    delete_session,
    delete_user_conversations,
    ensure_conversation,
    get_messages,
    get_session_user,
    get_user_api_config,
    init_db,
    list_conversations,
    upsert_user,
    upsert_user_api_config,
)
from src.core.memory import get_csv_memory  # noqa: E402

logger = logging.getLogger(__name__)


def _load_dataframe_from_csv(csv_name: str):
    """Load DataFrame from CSV data for API preview/download."""
    csv_memory = get_csv_memory()
    csv_content = csv_memory.get_csv_data(csv_name)
    if csv_content is None:
        return None
    
    return pd.read_csv(StringIO(csv_content))

def _serve_html_page(page_name: str) -> HTMLResponse:
    """Serve HTML page with error handling."""
    html_path = WEB_DIR / f"{page_name}.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail=f"{page_name.title()} page not found")


def _validate_dataset_exists(dataset_name: str) -> pd.DataFrame:
    """Validate dataset exists and return DataFrame."""
    df = _load_dataframe_from_csv(dataset_name)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Dataset not found or empty")
    return df

app = FastAPI(
    title="MoveDot Data Analytics Platform",
    description="AI-powered analytics platform for data analysis across multiple sources via MCP",
    version="2.0.0"
)

@app.on_event("startup")
async def _startup():
    init_db()
    
    from .mcp_routes import router as mcp_router
    app.include_router(mcp_router)
    
    try:
        logger.info("MCP integration initialized. MCP servers will be loaded on-demand per user using langchain-mcp-adapters.")
    except Exception as e:
        logger.warning(f"Failed to initialize MCP integration: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class UserApiConfig(BaseModel):
    provider: str  # 'openai' or 'anthropic'
    api_key: Optional[str] = None  # Optional if updating existing config
    model: str
    temperature: Optional[float] = 0.1

class DataSource(BaseModel):
    name: str
    size: int
    source: str

class DataOverview(BaseModel):
    available_datasets: List[DataSource]
    total_datasets: int

# Auth & Sessions

def _require_google_config():
    settings = get_settings()
    if not (settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri):
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    return settings


def _set_session_cookie(response: Response, session_id: str):
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # set True in production behind HTTPS
        samesite="lax",
        path="/",
        max_age=7 * 24 * 3600,
    )


def current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return {"id": int(user["id"]), "email": user["email"], "name": user["name"], "picture": user["picture"]}


@app.get("/api/auth/login")
async def auth_login():
    settings = _require_google_config()
    from urllib.parse import urlencode
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "select_account",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@app.get("/api/auth/callback")
async def auth_callback(code: str, state: str = None):
    settings = _require_google_config()
    import httpx
    import base64
    import json
    
    return_to = "/"
    if state:
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
            return_to = state_data.get("return_to", "/")
        except Exception as e:
            logger.warning(f"Failed to decode state: {e}")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15.0,
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code")
    token_data = token_resp.json()

    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    # Validate ID token via tokeninfo
    async with httpx.AsyncClient() as client:
        info_resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=15.0,
        )

    if info_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid id_token")
    user_info = info_resp.json()

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")
    
    if not google_sub:
        raise HTTPException(status_code=400, detail="Invalid Google user")

    user_id = upsert_user(google_sub, email, name, picture)
    session_id = f"sess_{int(datetime.datetime.now().timestamp())}_{google_sub}"
    create_session(session_id, user_id)

    redirect_url = return_to if return_to and return_to.startswith('/') else "/index.html"
    resp = RedirectResponse(url=redirect_url)
    _set_session_cookie(resp, session_id)
    return resp


@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id:
        delete_session(session_id)
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie("session_id", path="/")
    return resp


@app.get("/api/auth/me")
async def auth_me(user=Depends(current_user)):
    picture = user.get("picture")
    if picture and isinstance(picture, str) and picture.strip():
        picture_url = picture.strip()
    else:
        picture_url = None
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "picture": picture_url
    }

@app.get("/")
async def read_root():
    """Serve the home page."""
    try:
        return _serve_html_page("home")
    except HTTPException:
        return {"message": "MoveDot Analytics Agent API", "status": "running"}

@app.get("/home.html")
async def read_home():
    """Serve the home page."""
    return _serve_html_page("home")

@app.get("/index.html")
async def read_dashboard():
    """Serve the dashboard page."""
    return _serve_html_page("index")

@app.get("/data-sources.html")
async def read_data_sources():
    """Serve the data sources page."""
    return _serve_html_page("data-sources")

@app.get("/mcp-servers.html")
async def read_mcp_servers():
    """Serve the MCP servers management page."""
    return _serve_html_page("mcp-servers")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "analytics-agent"}

@app.get("/api/data/overview", response_model=DataOverview)
async def get_data_overview():
    """Get overview of available data sources."""
    try:
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        
        datasets = []
        for name, data in csv_data.items():
            datasets.append(DataSource(
                name=name,
                size=data.get("size", 0),
                source=data.get("source", "unknown")
            ))
        
        return DataOverview(
            available_datasets=datasets,
            total_datasets=len(datasets)
        )
        
    except Exception as e:
        logger.error(f"Error getting data overview: {e}")
        return DataOverview(available_datasets=[], total_datasets=0)

@app.get("/api/data/preview/{dataset_name}")
async def get_dataset_preview(dataset_name: str):
    """Get preview of a specific dataset."""
    try:
        df = _validate_dataset_exists(dataset_name)
        
        rows = len(df)
        columns = len(df.columns)
        
        memory_usage = df.memory_usage(deep=True).sum()
        size_str = f"{memory_usage / 1024:.1f} KB"
        
        preview_df = df.head(15).fillna('N/A')
        preview_data = preview_df.to_dict('records')
        
        return {
            "rows": rows,
            "columns": columns,
            "size": size_str,
            "preview": preview_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dataset preview for {dataset_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading dataset: {str(e)}")

@app.get("/api/data/download/{dataset_name}")
async def download_dataset(dataset_name: str):
    """Download a specific dataset as CSV."""
    try:
        df = _validate_dataset_exists(dataset_name)
        
        csv_content = df.to_csv(index=False)
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={dataset_name}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading dataset {dataset_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading dataset: {str(e)}")

@app.post("/api/chat/stream")
async def stream_chat_with_agent(request: ChatMessage, user=Depends(current_user)):
    """Stream chat with the analytics agent using Server-Sent Events."""
    try:
        # Ensure conversation exists
        conv_id = ensure_conversation(user_id=int(user["id"]), conversation_id=request.conversation_id)
        add_message(conv_id, "user", request.message)
        
        history = get_messages(conv_id, limit=50)
        
        messages_history = []
        for msg in history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                messages_history.append({"role": "user", "content": content})
            elif role == "assistant":
                messages_history.append({"role": "assistant", "content": content})
        
        config = {"configurable": {"thread_id": str(conv_id)}}
        
        user_id = int(user["id"])
        user_api_config = get_user_api_config(user_id)
        user_config_dict = None
        if user_api_config:
            user_config_dict = {
                "provider": user_api_config["provider"],
                "api_key": user_api_config["api_key"],
                "model": user_api_config["model"],
                "temperature": user_api_config["temperature"],
                "user_id": user_id,
            }
        else:
            user_config_dict = {"user_id": user_id}
        
        async def generate_sse_stream():
            """Generate SSE stream from agent response."""
            full_content = ""  # Accumulate all streamed content
            logger.info(f"Starting SSE stream for conversation {conv_id}")
            logger.info(f"User message: {request.message[:100]}...")
            try:
                from ..mcp.loader import ensure_user_mcp_servers_loaded_async
                logger.info(f"Loading MCP servers for user {user_id} (for agent)...")
                servers_loaded = await ensure_user_mcp_servers_loaded_async(user_id)
                if servers_loaded > 0:
                    logger.info(f"Successfully loaded {servers_loaded} MCP server(s) for agent")
                else:
                    logger.warning("No MCP servers loaded for agent - check server configuration")
                
                logger.info("Calling stream_analytics_agent_with_history...")
                final_user_config = user_config_dict.copy() if user_config_dict else {}
                final_user_config['force_reload_agent'] = True
                async for event_type, data in stream_analytics_agent_with_history(messages_history, config, final_user_config):
                    logger.debug(f"SSE event: {event_type}")
                    if event_type == "token":
                        content = data.get("content", "") if isinstance(data, dict) else ""
                        full_content += content
                        yield f"event: token\n"
                        yield f"data: {json.dumps(data)}\n\n"
                    elif event_type == "complete":
                        yield f"event: complete\n"
                        yield f"data: {json.dumps(data)}\n\n"
                        if full_content:
                            add_message(conv_id, "assistant", full_content)
                        break
                    elif event_type == "error":
                        yield f"event: error\n"
                        yield f"data: {json.dumps(data)}\n\n"
                        break
                        
            except Exception as e:
                logger.error(f"Error in SSE stream: {e}", exc_info=True)
                yield f"event: error\n"
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_sse_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in SSE chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/list")
async def list_available_models(provider: str, api_key: Optional[str] = None, user=Depends(current_user)):
    """
    List available models for a provider using the user's API key.
    
    Args:
        provider: 'openai' or 'anthropic'
        api_key: Optional API key to validate (if not provided, uses saved config)
    """
    try:
        # Check if provided API key is a placeholder (bullet points)
        is_placeholder = (
            api_key and (
                api_key.startswith('•') or 
                api_key.startswith('\u2022') or 
                api_key.startswith('\u25CF') or
                all(c in ['•', '\u2022', '\u25CF'] for c in api_key)
            )
        ) if api_key else False
        
        if api_key and not is_placeholder:
            api_key_to_use = api_key
        else:
            user_config = get_user_api_config(int(user["id"]))
            if not user_config:
                raise HTTPException(status_code=400, detail=f"Please provide an API key or configure your {provider} API key first")
            
            if user_config["provider"] != provider.lower():
                raise HTTPException(status_code=400, detail=f"Your configured provider is {user_config['provider']}, but you requested {provider}")
            
            api_key_to_use = user_config["api_key"]
        
        import httpx
        
        if provider.lower() == "openai":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key_to_use}"},
                    timeout=30.0
                )
                if response.status_code != 200:
                    error_detail = response.text[:500] if response.text else "Unknown error"
                    logger.error(f"OpenAI API error: {response.status_code} - {error_detail}")
                    raise HTTPException(
                        status_code=response.status_code, 
                        detail=f"OpenAI API error: {error_detail}"
                    )
                data = response.json()
                models = [
                    {
                        "id": model["id"],
                        "display_name": model["id"],
                        "created": model.get("created"),
                        "owned_by": model.get("owned_by", "openai"),
                    }
                    for model in data.get("data", [])
                    if model.get("id", "").startswith(("gpt-", "o1-")) and "deprecated" not in model.get("id", "").lower()
                ]
                # Sort by created date (newest first)
                models.sort(key=lambda x: x.get("created", 0), reverse=True)
                return {"provider": "openai", "models": models}
        
        elif provider.lower() == "anthropic":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": api_key_to_use,
                        "anthropic-version": "2023-06-01"
                    },
                    timeout=30.0
                )
                if response.status_code != 200:
                    error_detail = response.text[:500] if response.text else "Unknown error"
                    logger.error(f"Anthropic API error: {response.status_code} - {error_detail}")
                    raise HTTPException(
                        status_code=response.status_code, 
                        detail=f"Anthropic API error: {error_detail}"
                    )
                data = response.json()
                models = [
                    {
                        "id": model["id"],
                        "display_name": model.get("display_name", model["id"]),
                        "created_at": model.get("created_at"),
                        "type": model.get("type", "model"),
                    }
                    for model in data.get("data", [])
                ]
                models.sort(key=lambda x: x.get("created_at", ""), reverse=True)
                return {"provider": "anthropic", "models": models}
        
        else:
            raise HTTPException(status_code=400, detail="Provider must be 'openai' or 'anthropic'")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/api-config")
async def save_user_api_config(config: UserApiConfig, user=Depends(current_user)):
    """Save or update user's API configuration."""
    try:
        if config.provider.lower() not in ["openai", "anthropic"]:
            raise HTTPException(status_code=400, detail="Provider must be 'openai' or 'anthropic'")
        
        existing_config = get_user_api_config(int(user["id"]))
        api_key_to_use = config.api_key
        
        is_placeholder = (
            not api_key_to_use or 
            api_key_to_use.startswith('•') or 
            api_key_to_use.startswith('\u2022') or 
            api_key_to_use.startswith('\u25CF') or
            all(c in ['•', '\u2022', '\u25CF'] for c in api_key_to_use) if api_key_to_use else False
        )
        
        if is_placeholder and existing_config:
            api_key_to_use = existing_config["api_key"]
        
        if not api_key_to_use:
            raise HTTPException(status_code=400, detail="API key is required")
        
        import httpx
        try:
            if config.provider.lower() == "openai":
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.openai.com/v1/models",
                        headers={"Authorization": f"Bearer {api_key_to_use}"},
                        timeout=30.0
                    )
                    if response.status_code != 200:
                        error_text = response.text[:500] if response.text else "Unknown error"
                        logger.error(f"OpenAI API validation error: {response.status_code} - {error_text}")
                        raise HTTPException(status_code=400, detail=f"Invalid OpenAI API key: {error_text}")
            elif config.provider.lower() == "anthropic":
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.anthropic.com/v1/models",
                        headers={
                            "x-api-key": api_key_to_use,
                            "anthropic-version": "2023-06-01"
                        },
                        timeout=30.0
                    )
                    if response.status_code != 200:
                        error_text = response.text[:500] if response.text else "Unknown error"
                        logger.error(f"Anthropic API validation error: {response.status_code} - {error_text}")
                        raise HTTPException(status_code=400, detail=f"Invalid Anthropic API key: {error_text}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating API key: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to validate API key: {str(e)}")
        
        upsert_user_api_config(
            user_id=int(user["id"]),
            provider=config.provider.lower(),
            api_key=api_key_to_use,
            model=config.model,
            temperature=0.0
        )
        
        return {"status": "success", "message": "API configuration saved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving API config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/api-config")
async def get_user_api_config_endpoint(user=Depends(current_user)):
    """Get user's API configuration (without exposing the API key)."""
    try:
        config = get_user_api_config(int(user["id"]))
        if config:
            return {
                "provider": config["provider"],
                "model": config["model"],
                "temperature": config["temperature"],
                "has_api_key": bool(config["api_key"])
            }
        return None
    except Exception as e:
        logger.error(f"Error getting API config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/user/api-config")
async def delete_user_api_config_endpoint(user=Depends(current_user)):
    """Delete user's API configuration."""
    try:
        from src.core.db import delete_user_api_config as db_delete_user_api_config
        db_delete_user_api_config(int(user["id"]))
        return {"status": "success", "message": "API configuration deleted"}
    except Exception as e:
        logger.error(f"Error deleting API config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Chat History APIs

class ConversationCreate(BaseModel):
    title: Optional[str] = None


@app.get("/api/chat/conversations")
async def chat_list_conversations(user=Depends(current_user)):
    return list_conversations(int(user["id"]))


@app.post("/api/chat/conversations")
async def chat_create_conversation(payload: ConversationCreate, user=Depends(current_user)):
    conv_id = ensure_conversation(int(user["id"]), None, title=payload.title)
    return {"id": conv_id}


@app.delete("/api/chat/conversations/clear")
async def chat_clear_all_conversations(user=Depends(current_user)):
    """Delete all conversations and messages for the current user."""
    deleted_count = delete_user_conversations(int(user["id"]))
    return {"status": "success", "deleted_conversations": deleted_count}


@app.get("/api/chat/conversations/{conversation_id}")
async def chat_get_conversation(conversation_id: str, user=Depends(current_user)):
    # Listing messages implies the conversation belongs to the user; ensure it exists
    msgs = get_messages(conversation_id)
    return {"id": conversation_id, "messages": msgs}

# Favicon endpoint - force no cache
@app.get("/favicon.ico")
async def favicon_ico():
    """Serve favicon.ico (SVG) with no-cache headers."""
    favicon_path = STATIC_DIR / "favicon.svg"
    if favicon_path.exists():
        content = favicon_path.read_bytes()
        return Response(
            content=content,
            media_type="image/svg+xml",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
                "ETag": '"v6"'
            }
        )
    return Response(status_code=404)

@app.get("/static/favicon.svg")
async def favicon_svg():
    """Serve favicon.svg with no-cache headers."""
    favicon_path = STATIC_DIR / "favicon.svg"
    if favicon_path.exists():
        content = favicon_path.read_bytes()
        return Response(
            content=content,
            media_type="image/svg+xml",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
                "ETag": '"v6"'
            }
        )
    return Response(status_code=404)

# Mount static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
