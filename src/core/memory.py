"""Memory management utilities for scratchpad and CSV data."""

import json
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from ..config import get_settings

logger = logging.getLogger(__name__)


class ScratchpadMemory:
    """Manages scratchpad memory for API documentation summaries."""
    
    def __init__(self, memory_file: Optional[str] = None):
        """Initialize scratchpad memory manager."""
        settings = get_settings()
        self.memory_file = memory_file or settings.memory_file
        self.data_dir = Path(settings.data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.memory_path = self.data_dir / self.memory_file
        self._initialize_memory_file()
    
    def _initialize_memory_file(self):
        """Initialize the memory file if it doesn't exist."""
        if not self.memory_path.exists():
            initial_memory = {
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "documentations": {}
            }
            self._save_memory(initial_memory)
            logger.info(f"Initialized memory file: {self.memory_path}")
    
    def load_memory(self) -> Dict[str, Any]:
        """Load the memory file."""
        logger.info(f"Loading memory from file: {self.memory_path}")
        try:
            with open(self.memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
                logger.info(f"Memory loaded successfully. Found {len(memory_data.get('documentations', {}))} documentation entries")
                return memory_data
        except FileNotFoundError:
            logger.warning(f"Memory file {self.memory_path} not found, initializing...")
            self._initialize_memory_file()
            return self.load_memory()
        except Exception as e:
            logger.error(f"Error loading memory: {e}")
            return {"documentations": {}}
    
    def _save_memory(self, memory_data: Dict[str, Any]):
        """Save the memory file."""
        logger.info(f"Saving memory to file: {self.memory_path}")
        try:
            memory_data["last_updated"] = datetime.now().isoformat()
            with open(self.memory_path, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Memory saved successfully to {self.memory_path}")
        except Exception as e:
            logger.error(f"Error saving memory: {e}")
            raise
    
    def write_documentation(self, api_name: str, summary: str, source_url: str = "local_file") -> str:
        """
        Save a new API documentation summary into the memory scratchpad.
        
        Args:
            api_name: Name of the API
            summary: Documentation summary content
            source_url: Source URL of the documentation
            
        Returns:
            Success message
        """
        logger.info(f"Writing documentation for API: {api_name}")
        
        memory = self.load_memory()
        
        # Create a unique ID for this documentation
        doc_id = f"{api_name.lower().replace(' ', '_')}_{int(datetime.now().timestamp())}"
        
        # Try to parse endpoints count safely
        endpoints_count = 0
        try:
            if summary.startswith('{'):
                parsed_summary = json.loads(summary)
                endpoints_count = len(parsed_summary.get("endpoints", []))
        except json.JSONDecodeError:
            endpoints_count = 0
        
        # Create the documentation entry
        doc_entry = {
            "api_name": api_name,
            "source_url": source_url,
            "summary": summary,
            "created_at": datetime.now().isoformat(),
            "endpoints_count": endpoints_count
        }
        
        # Add to memory
        memory["documentations"][doc_id] = doc_entry
        self._save_memory(memory)
        
        return f"Successfully saved documentation for **{api_name}** to memory scratchpad!"
    
    def get_documentation(self, api_name: Optional[str] = None) -> str:
        """
        Retrieve stored API documentation summaries from the memory scratchpad.
        
        Args:
            api_name: Specific API name to retrieve (optional)
            
        Returns:
            Documentation content
        """
        memory = self.load_memory()
        documentations = memory.get("documentations", {})
        
        if not documentations:
            return "No documentation found in memory."
        
        if api_name:
            # Find documentation by API name
            for doc_id, doc_data in documentations.items():
                if doc_data.get("api_name", "").lower() == api_name.lower():
                    return doc_data["summary"]
            return f"No documentation found for API: {api_name}"
        
        # Return all documentation
        result = "**Available Documentation in Memory:**\n\n"
        for doc_id, doc_data in documentations.items():
            result += f"**{doc_data['api_name']}**\n"
            result += f"Source: {doc_data['source_url']}\n"
            result += f"Created: {doc_data['created_at']}\n"
            result += f"Endpoints: {doc_data.get('endpoints_count', 0)}\n\n"
            result += f"**Documentation Summary:**\n{doc_data['summary']}\n\n"
            result += "---\n\n"
        
        return result
    
    def list_documentations(self) -> str:
        """List all stored API documentation summaries."""
        memory = self.load_memory()
        documentations = memory.get("documentations", {})
        
        if not documentations:
            return "Memory scratchpad is empty. No API documentation summaries found."
        
        result = f"Memory scratchpad contains {len(documentations)} API documentation summary(ies):\n\n"
        for doc_id, doc_data in documentations.items():
            result += f"**{doc_data.get('api_name', 'Unknown API')}**\n"
            result += f"   Source: {doc_data.get('source_url', 'Unknown')}\n"
            result += f"   Created: {doc_data.get('created_at', 'Unknown')}\n"
            result += f"   Endpoints: {doc_data.get('endpoints_count', 0)}\n\n"
        
        return result


class CSVMemory:
    """Manages CSV data memory for persistent storage."""
    
    def __init__(self, csv_memory_file: Optional[str] = None):
        """Initialize CSV memory manager."""
        settings = get_settings()
        self.csv_memory_file = csv_memory_file or settings.csv_memory_file
        self.data_dir = Path(settings.data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.csv_memory_path = self.data_dir / self.csv_memory_file
        self._cache = None  # In-memory cache
        self._cache_timestamp = None  # Track when cache was last updated
        self._initialize_csv_memory_file()
    
    def _initialize_csv_memory_file(self):
        """Initialize the CSV memory file if it doesn't exist."""
        if not self.csv_memory_path.exists():
            initial_csv_memory = {
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "csv_data": {}
            }
            self._save_csv_memory(initial_csv_memory)
            logger.info(f"Initialized CSV memory file: {self.csv_memory_path}")
    
    def load_csv_memory(self, force_reload: bool = False) -> Dict[str, Any]:
        """Load the CSV memory file with caching."""
        # Check if we have valid cache
        if not force_reload and self._cache is not None and self._cache_timestamp is not None:
            # Check if file has been modified since last cache
            try:
                file_mtime = self.csv_memory_path.stat().st_mtime
                if file_mtime <= self._cache_timestamp:
                    logger.debug(f"Using cached CSV memory (cached at {self._cache_timestamp})")
                    return self._cache
            except OSError:
                # File might not exist, fall through to load
                pass
        
        # Load from file
        logger.info(f"Loading CSV memory from file: {self.csv_memory_path}")
        try:
            with open(self.csv_memory_path, 'r', encoding='utf-8') as f:
                csv_memory_data = json.load(f)
                logger.info(f"CSV memory loaded successfully. Found {len(csv_memory_data.get('csv_data', {}))} CSV entries")
                
                # Update cache
                self._cache = csv_memory_data
                self._cache_timestamp = self.csv_memory_path.stat().st_mtime
                
                return csv_memory_data
        except FileNotFoundError:
            logger.warning(f"CSV memory file {self.csv_memory_path} not found, initializing...")
            self._initialize_csv_memory_file()
            return self.load_csv_memory(force_reload=True)
        except Exception as e:
            logger.error(f"Error loading CSV memory: {e}")
            return {"csv_data": {}}
    
    def _save_csv_memory(self, csv_memory_data: Dict[str, Any]):
        """Save the CSV memory file."""
        logger.info(f"Saving CSV memory to file: {self.csv_memory_path}")
        try:
            csv_memory_data["last_updated"] = datetime.now().isoformat()
            with open(self.csv_memory_path, 'w', encoding='utf-8') as f:
                json.dump(csv_memory_data, f, indent=2, ensure_ascii=False)
            
            # Update cache after successful save
            self._cache = csv_memory_data
            self._cache_timestamp = self.csv_memory_path.stat().st_mtime
            
            logger.info(f"CSV memory saved successfully to {self.csv_memory_path}")
        except Exception as e:
            logger.error(f"Error saving CSV memory: {e}")
            raise
    
    def store_csv_data(self, csv_name: str, csv_content: str, source: str = "OpenF1") -> None:
        """
        Store CSV data in persistent file.
        
        Args:
            csv_name: Name identifier for the CSV data
            csv_content: CSV content as string
            source: Source of the data (default: "OpenF1")
        """
        csv_memory = self.load_csv_memory()
        csv_memory["csv_data"][csv_name] = {
            "content": csv_content,
            "source": source,
            "stored_at": datetime.now().isoformat(),
            "size": len(csv_content)
        }
        self._save_csv_memory(csv_memory)
        logger.info(f"CSV data stored: {csv_name} ({len(csv_content)} characters)")
    
    def get_csv_data(self, csv_name: str) -> Optional[str]:
        """
        Get CSV data from persistent file.
        
        Args:
            csv_name: Name identifier for the CSV data
            
        Returns:
            CSV content as string or None if not found
        """
        csv_memory = self.load_csv_memory()
        if csv_name in csv_memory.get("csv_data", {}):
            return csv_memory["csv_data"][csv_name]["content"]
        return None
    
    def list_available_csvs(self) -> Dict[str, Any]:
        """
        List all available CSV datasets in persistent storage.
        
        Returns:
            Dictionary with available datasets information
        """
        csv_memory = self.load_csv_memory()
        csv_data = csv_memory.get("csv_data", {})
        
        if not csv_data:
            return {"message": "No CSV datasets available"}
        
        result = {"available_datasets": {}}
        for name, data in csv_data.items():
            result["available_datasets"][name] = {
                "source": data["source"],
                "stored_at": data["stored_at"],
                "size": data["size"]
            }
        return result
    
    def invalidate_cache(self):
        """Invalidate the in-memory cache to force reload on next access."""
        self._cache = None
        self._cache_timestamp = None
        logger.debug("CSV memory cache invalidated")


# Global instances
_scratchpad_memory: Optional[ScratchpadMemory] = None
_csv_memory: Optional[CSVMemory] = None


def get_scratchpad_memory() -> ScratchpadMemory:
    """Get the global scratchpad memory instance."""
    global _scratchpad_memory
    if _scratchpad_memory is None:
        _scratchpad_memory = ScratchpadMemory()
    return _scratchpad_memory


def get_csv_memory() -> CSVMemory:
    """Get the global CSV memory instance."""
    global _csv_memory
    if _csv_memory is None:
        _csv_memory = CSVMemory()
    return _csv_memory
