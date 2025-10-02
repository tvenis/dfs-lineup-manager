"""
Caching service for Player Profile data
"""

import json
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Week

class CacheService:
    """Simple in-memory cache for Player Profile data"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 300  # 5 minutes TTL
    
    def _generate_cache_key(self, **kwargs) -> str:
        """Generate a cache key from parameters"""
        # Sort parameters for consistent key generation
        sorted_params = sorted(kwargs.items())
        key_string = json.dumps(sorted_params, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is expired"""
        if 'timestamp' not in cache_entry:
            return True
        
        cache_time = datetime.fromisoformat(cache_entry['timestamp'])
        return datetime.now() - cache_time > timedelta(seconds=self._cache_ttl)
    
    def get(self, **kwargs) -> Optional[Dict[str, Any]]:
        """Get data from cache"""
        cache_key = self._generate_cache_key(**kwargs)
        
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            if not self._is_expired(cache_entry):
                return cache_entry.get('data')
            else:
                # Remove expired entry
                del self._cache[cache_key]
        
        return None
    
    def set(self, data: Dict[str, Any], **kwargs) -> None:
        """Set data in cache"""
        cache_key = self._generate_cache_key(**kwargs)
        self._cache[cache_key] = {
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    def invalidate_week(self, week_id: int) -> None:
        """Invalidate all cache entries for a specific week"""
        keys_to_remove = []
        for key, entry in self._cache.items():
            if entry.get('data', {}).get('week_id') == week_id:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self._cache)
        expired_entries = sum(1 for entry in self._cache.values() if self._is_expired(entry))
        
        return {
            'total_entries': total_entries,
            'expired_entries': expired_entries,
            'active_entries': total_entries - expired_entries,
            'cache_ttl_seconds': self._cache_ttl
        }

# Global cache instance
player_profile_cache = CacheService()
