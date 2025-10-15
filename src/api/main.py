"""FastAPI application for the motorsports analytics agent web interface."""

import logging
from pathlib import Path
from typing import List, Optional
import json
import datetime
import pandas as pd

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel

# Add src to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.agents.analytics_agent import invoke_analytics_agent, reload_analytics_agent
from src.tools.analysis_tools import list_available_data, quick_data_check
from src.utils import get_csv_memory

logger = logging.getLogger(__name__)


# Helper function to load DataFrames for API endpoints (preview, download)
def _load_dataframe_from_csv(csv_name: str):
    """Load DataFrame from CSV data for API preview/download."""
    from io import StringIO
    import pandas as pd
    
    csv_memory = get_csv_memory()
    csv_content = csv_memory.get_csv_data(csv_name)
    if csv_content is None:
        return None
    
    return pd.read_csv(StringIO(csv_content))

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

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove broken connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.get("/")
async def read_root():
    """Serve the home page."""
    html_path = Path(__file__).parent.parent.parent / "web" / "home.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        return {"message": "MoveDot Motorsports Analytics Agent API", "status": "running"}

@app.get("/home.html")
async def read_home():
    """Serve the home page."""
    html_path = Path(__file__).parent.parent.parent / "web" / "home.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="Home page not found")

@app.get("/index.html")
async def read_dashboard():
    """Serve the dashboard page."""
    html_path = Path(__file__).parent.parent.parent / "web" / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="Dashboard page not found")

@app.get("/data-sources.html")
async def read_data_sources():
    """Serve the data sources page."""
    html_path = Path(__file__).parent.parent.parent / "web" / "data-sources.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="Data sources page not found")

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "motorsports-analytics-agent"}

@app.get("/api/data/overview", response_model=DataOverview)
async def get_data_overview():
    """Get overview of available data sources."""
    try:
        # Get available data
        data_info = list_available_data.invoke({})
        
        # Parse the data info to extract datasets
        datasets = []
        if "CSV Storage:" in data_info:
            lines = data_info.split('\n')
            for line in lines:
                if line.strip().startswith('- '):
                    # Parse line like "   - dataset_name: 1234 chars, source: openf1"
                    parts = line.strip()[2:].split(': ')
                    if len(parts) >= 2:
                        name = parts[0]
                        size_info = parts[1].split(' chars')[0]
                        source = parts[1].split('source: ')[1] if 'source: ' in parts[1] else 'unknown'
                        try:
                            size = int(size_info)
                            datasets.append(DataSource(name=name, size=size, source=source))
                        except ValueError:
                            continue
        
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
        # Load the dataframe
        df = _load_dataframe_from_csv(dataset_name)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Dataset not found or empty")
        
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
        
    except Exception as e:
        logger.error(f"Error getting dataset preview for {dataset_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading dataset: {str(e)}")

@app.get("/api/data/download/{dataset_name}")
async def download_dataset(dataset_name: str):
    """Download a specific dataset as CSV."""
    try:
        # Load the dataframe
        df = _load_dataframe_from_csv(dataset_name)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Dataset not found or empty")
        
        # Convert to CSV
        csv_content = df.to_csv(index=False)
        
        # Return as downloadable file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={dataset_name}"}
        )
        
    except Exception as e:
        logger.error(f"Error downloading dataset {dataset_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading dataset: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatMessage):
    """Chat with the analytics agent."""
    try:
        import datetime
        
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

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    await manager.connect(websocket)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process with agent
            response = invoke_analytics_agent(message_data.get("message", ""))
            
            # Send response back
            response_data = {
                "type": "agent_response",
                "response": response,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            await manager.send_personal_message(
                json.dumps(response_data), 
                websocket
            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# PRP Editor API endpoints
@app.get("/api/prp/content")
async def get_prp_content():
    """Get current PRP content."""
    try:
        prp_path = Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"
        if prp_path.exists():
            content = prp_path.read_text(encoding='utf-8')
            return {"content": content}
        else:
            return {"content": ""}
    except Exception as e:
        logger.error(f"Error reading PRP content: {e}")
        return {"content": ""}

@app.get("/api/prp/default")
async def get_default_prp():
    """Get default PRP content."""
    try:
        prp_path = Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"
        if prp_path.exists():
            content = prp_path.read_text(encoding='utf-8')
            return Response(content=content, media_type="text/plain")
        else:
            return Response(content="# Default PRP\nNo default content available.", media_type="text/plain")
    except Exception as e:
        logger.error(f"Error reading default PRP: {e}")
        return Response(content="# Error\nCould not load default PRP.", media_type="text/plain")

@app.post("/api/prp/save")
async def save_prp(request: dict):
    """Save custom PRP content."""
    try:
        content = request.get("content", "")
        if not content:
            raise HTTPException(status_code=400, detail="Content cannot be empty")
        
        # Save to main PRP file
        prp_path = Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"
        prp_path.parent.mkdir(exist_ok=True)
        prp_path.write_text(content, encoding='utf-8')
        
        logger.info(f"PRP saved successfully, {len(content)} characters")
        return {"status": "success", "message": "PRP saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving PRP: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving PRP: {str(e)}")

@app.post("/api/prp/update-agent")
async def update_agent_prp(request: dict):
    """Update the agent with new PRP content."""
    try:
        content = request.get("content", "")
        if not content:
            raise HTTPException(status_code=400, detail="Content cannot be empty")
        
        # Update the product_requirement_prompt.md file
        prp_path = Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"
        prp_path.parent.mkdir(exist_ok=True)
        prp_path.write_text(content, encoding='utf-8')
        
        # Reload the analytics agent with new PRP content
        reload_analytics_agent()
        
        logger.info(f"Agent PRP updated successfully, {len(content)} characters")
        return {"status": "success", "message": "Agent updated with new PRP"}
        
    except Exception as e:
        logger.error(f"Error updating agent PRP: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating agent PRP: {str(e)}")

# Mount static files
web_dir = Path(__file__).parent.parent.parent / "web"
static_dir = web_dir / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
