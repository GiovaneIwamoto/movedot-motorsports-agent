"""FastAPI application for the motorsports analytics agent web interface."""

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
    ensure_conversation,
    get_messages,
    get_session_user,
    init_db,
    list_conversations,
    upsert_user,
)
from src.core.memory import get_csv_memory  # noqa: E402

logger = logging.getLogger(__name__)


# Helper function to load DataFrames for API endpoints (preview, download)
def _load_dataframe_from_csv(csv_name: str):
    """Load DataFrame from CSV data for API preview/download."""
    csv_memory = get_csv_memory()
    csv_content = csv_memory.get_csv_data(csv_name)
    if csv_content is None:
        return None
    
    return pd.read_csv(StringIO(csv_content))

# Helper function to serve HTML pages
def _serve_html_page(page_name: str) -> HTMLResponse:
    """Serve HTML page with error handling."""
    html_path = WEB_DIR / f"{page_name}.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail=f"{page_name.title()} page not found")

# Helper function for PRP operations
def _get_prp_path() -> Path:
    """Get the PRP file path."""
    return PROMPT_DIR / "product_requirement_prompt.md"

def _read_prp_content() -> str:
    """Read PRP content from file."""
    try:
        prp_path = _get_prp_path()
        if prp_path.exists():
            return prp_path.read_text(encoding='utf-8')
        return ""
    except Exception as e:
        logger.error(f"Error reading PRP content: {e}")
        return ""

def _write_prp_content(content: str) -> None:
    """Write PRP content to file."""
    prp_path = _get_prp_path()
    prp_path.parent.mkdir(exist_ok=True)
    prp_path.write_text(content, encoding='utf-8')

def _validate_dataset_exists(dataset_name: str) -> pd.DataFrame:
    """Validate dataset exists and return DataFrame."""
    df = _load_dataframe_from_csv(dataset_name)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Dataset not found or empty")
    return df

# Create FastAPI app
app = FastAPI(
    title="MoveDot Motorsports Analytics Agent",
    description="AI-powered analytics platform for motorsports data analysis",
    version="1.0.0"
)
# Initialize DB at startup
@app.on_event("startup")
async def _startup():
    init_db()


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class DataSource(BaseModel):
    name: str
    size: int
    source: str

class DataOverview(BaseModel):
    available_datasets: List[DataSource]
    total_datasets: int

# -----------------
# Auth & Sessions
# -----------------

def _require_google_config():
    settings = get_settings()
    if not (settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri):
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    return settings


def _set_session_cookie(response: Response, session_id: str):
    # Set secure cookie attributes
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
    # Build Google OAuth URL
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
async def auth_callback(code: str):
    settings = _require_google_config()
    import httpx

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

    # Upsert user and create session
    user_id = upsert_user(google_sub, email, name, picture)
    session_id = f"sess_{int(datetime.datetime.now().timestamp())}_{google_sub}"
    create_session(session_id, user_id)

    resp = RedirectResponse(url="/index.html")
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
    return user

@app.get("/")
async def read_root():
    """Serve the home page."""
    try:
        return _serve_html_page("home")
    except HTTPException:
        return {"message": "MoveDot Motorsports Analytics Agent API", "status": "running"}

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


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "motorsports-analytics-agent"}

@app.get("/api/data/overview", response_model=DataOverview)
async def get_data_overview():
    """Get overview of available data sources."""
    try:
        # Get available data directly from memory
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
        
        # Get basic info
        rows = len(df)
        columns = len(df.columns)
        
        # Calculate approximate size
        memory_usage = df.memory_usage(deep=True).sum()
        size_str = f"{memory_usage / 1024:.1f} KB"
        
        # Get preview data (first 15 rows) - handle NaN values
        preview_df = df.head(15).fillna('N/A')  # Replace NaN with 'N/A'
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
        
        # Convert to CSV
        csv_content = df.to_csv(index=False)
        
        # Return as downloadable file
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
        # Save user message
        add_message(conv_id, "user", request.message)
        
        # Load conversation history for context (includes the message we just added)
        history = get_messages(conv_id, limit=50)
        
        # Convert history to agent message format
        messages_history = []
        for msg in history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                messages_history.append({"role": "user", "content": content})
            elif role == "assistant":
                messages_history.append({"role": "assistant", "content": content})
        
        # Current user message is already in history, no need to add again
        
        # Configuration for the agent
        config = {"configurable": {"thread_id": str(conv_id)}}
        
        async def generate_sse_stream():
            """Generate SSE stream from agent response."""
            full_content = ""  # Accumulate all streamed content
            try:
                # Stream tokens from the agent with history
                async for event_type, data in stream_analytics_agent_with_history(messages_history, config):
                    if event_type == "token":
                        # Send token event
                        content = data.get("content", "") if isinstance(data, dict) else ""
                        full_content += content  # Accumulate content
                        yield f"event: token\n"
                        yield f"data: {json.dumps(data)}\n\n"
                    elif event_type == "complete":
                        # Send completion event
                        yield f"event: complete\n"
                        yield f"data: {json.dumps(data)}\n\n"
                        # Persist complete assistant message
                        if full_content:
                            add_message(conv_id, "assistant", full_content)
                        break
                    elif event_type == "error":
                        # Send error event
                        yield f"event: error\n"
                        yield f"data: {json.dumps(data)}\n\n"
                        break
                        
            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")
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

# PRP Editor API endpoints
@app.get("/api/prp/content")
async def get_prp_content():
    """Get current PRP content."""
    content = _read_prp_content()
    return {"content": content}

@app.get("/api/prp/default")
async def get_default_prp():
    """Get default PRP content as plain text."""
    content = _read_prp_content()
    if not content:
        content = "# Default PRP\nNo default content available."
    return Response(content=content, media_type="text/plain")

@app.post("/api/prp/save")
async def save_prp(request: dict):
    """Save custom PRP content."""
    content = request.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    _write_prp_content(content)
    logger.info(f"PRP saved successfully, {len(content)} characters")
    return {"status": "success", "message": "PRP saved successfully"}

@app.post("/api/prp/update-agent")
async def update_agent_prp(request: dict):
    """Update the agent with new PRP content."""
    content = request.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    _write_prp_content(content)
    reload_analytics_agent()
    
    logger.info(f"Agent PRP updated successfully, {len(content)} characters")
    return {"status": "success", "message": "Agent updated with new PRP"}

# -----------------
# Chat History APIs
# -----------------

class ConversationCreate(BaseModel):
    title: Optional[str] = None


@app.get("/api/chat/conversations")
async def chat_list_conversations(user=Depends(current_user)):
    return list_conversations(int(user["id"]))


@app.post("/api/chat/conversations")
async def chat_create_conversation(payload: ConversationCreate, user=Depends(current_user)):
    conv_id = ensure_conversation(int(user["id"]), None, title=payload.title)
    return {"id": conv_id}


@app.get("/api/chat/conversations/{conversation_id}")
async def chat_get_conversation(conversation_id: str, user=Depends(current_user)):
    # Listing messages implies the conversation belongs to the user; ensure it exists
    msgs = get_messages(conversation_id)
    return {"id": conversation_id, "messages": msgs}

# Mount static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
