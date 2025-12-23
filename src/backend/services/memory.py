"""Memory management utilities for CSV data."""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import get_settings

logger = logging.getLogger(__name__)


class BaseMemoryManager:
    """Base class for memory managers with common functionality."""
    
    def __init__(self, file_name: str, data_key: str):
        """Initialize base memory manager for a given JSON file and root key."""
        settings = get_settings()
        self.file_name = file_name
        self.data_key = data_key
        self.data_dir = Path(settings.data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.file_path = self.data_dir / file_name
        self._initialize_file()
    
    def _initialize_file(self) -> None:
        """Create an empty memory file if it does not exist."""
        if not self.file_path.exists():
            initial_data = {
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                self.data_key: {}
            }
            self._save_data(initial_data)
            logger.info(f"Initialized {self.file_name} file: {self.file_path}")
    
    def _save_data(self, data: Dict[str, Any]) -> None:
        """Persist data to disk."""
        try:
            data["last_updated"] = datetime.now().isoformat()
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving {self.file_name}: {e}")
            raise
    
    def load_data(self, force_reload: bool = False) -> Dict[str, Any]:
        """Load data from the backing JSON file."""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except FileNotFoundError:
            logger.warning(f"{self.file_name} file {self.file_path} not found, initializing...")
            self._initialize_file()
            return self.load_data(force_reload=True)
        except Exception as e:
            logger.error(f"Error loading {self.file_name}: {e}")
            return {self.data_key: {}}


class CSVMemory(BaseMemoryManager):
    """Manages CSV data memory for persistent storage."""
    
    def __init__(self, csv_memory_file: Optional[str] = None):
        """Initialize CSV memory manager."""
        settings = get_settings()
        file_name = csv_memory_file or settings.csv_memory_file
        super().__init__(file_name, "csv_data")
        self._cache = None  # In-memory cache
        self._cache_timestamp = None  # Track when cache was last updated
    
    def load_csv_memory(self, force_reload: bool = False) -> Dict[str, Any]:
        """Load the CSV memory file with caching."""
        if not force_reload and self._cache is not None and self._cache_timestamp is not None:
            try:
                file_mtime = self.file_path.stat().st_mtime
                if file_mtime <= self._cache_timestamp:
                    logger.debug(f"Using cached CSV memory (cached at {self._cache_timestamp})")
                    return self._cache
            except OSError:
                pass
        
        csv_memory_data = self.load_data(force_reload)
        
        self._cache = csv_memory_data
        self._cache_timestamp = self.file_path.stat().st_mtime
        
        return csv_memory_data
    
    def _save_csv_memory(self, csv_memory_data: Dict[str, Any]):
        """Save the CSV memory file."""
        self._save_data(csv_memory_data)
        
        self._cache = csv_memory_data
        self._cache_timestamp = self.file_path.stat().st_mtime
    
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
_csv_memory: Optional[CSVMemory] = None


def get_csv_memory() -> CSVMemory:
    """Get the global CSV memory instance."""
    global _csv_memory
    if _csv_memory is None:
        _csv_memory = CSVMemory()
    return _csv_memory
