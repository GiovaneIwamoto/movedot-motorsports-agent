"""FastAPI application for the motorsports analytics agent web interface."""

import json
import datetime
import pandas as pd

from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from io import StringIO

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response, StreamingResponse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.agents.analytics_agent import invoke_analytics_agent, reload_analytics_agent, stream_analytics_agent
from src.core.memory import get_csv_memory

import logging
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
    html_path = Path(__file__).parent.parent.parent / "web" / f"{page_name}.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail=f"{page_name.title()} page not found")

# Helper function for PRP operations
def _get_prp_path() -> Path:
    """Get the PRP file path."""
    return Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"

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
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    plots: Optional[List[str]] = None

class DataSource(BaseModel):
    name: str
    size: int
    source: str

class DataOverview(BaseModel):
    available_datasets: List[DataSource]
    total_datasets: int

# SSE streaming imports
import asyncio
import json

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

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatMessage):
    """Chat with the analytics agent."""
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{int(datetime.datetime.now().timestamp())}"
        
        # Invoke the analytics agent
        response = invoke_analytics_agent(request.message)
        
        # Check for any generated plots
        plots = []
        plots_dir = Path("plots")
        if plots_dir.exists():
            plot_files = list(plots_dir.glob("*.png"))
            # Get the most recent plots (last 5)
            plot_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            plots = [str(p.relative_to(Path.cwd())) for p in plot_files[:5]]
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            timestamp=datetime.datetime.now().isoformat(),
            plots=plots if plots else None
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def stream_chat_with_agent(request: ChatMessage):
    """Stream chat with the analytics agent using Server-Sent Events."""
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{int(datetime.datetime.now().timestamp())}"
        
        # Configuration for the agent
        config = {"configurable": {"thread_id": session_id}}
        
        async def generate_sse_stream():
            """Generate SSE stream from agent response."""
            try:
                # Stream tokens from the agent
                async for event_type, data in stream_analytics_agent(request.message, config):
                    if event_type == "token":
                        # Send token event
                        yield f"event: token\n"
                        yield f"data: {json.dumps(data)}\n\n"
                    elif event_type == "complete":
                        # Send completion event
                        yield f"event: complete\n"
                        yield f"data: {json.dumps(data)}\n\n"
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

# Mount static files
web_dir = Path(__file__).parent.parent.parent / "web"
static_dir = web_dir / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
