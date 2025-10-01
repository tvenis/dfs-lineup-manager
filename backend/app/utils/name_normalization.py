"""
Name normalization utilities for player matching.

Handles common punctuation and formatting differences that cause matching failures.
"""

import re
import unicodedata
from typing import Optional


def normalize_name(name: str) -> str:
    """
    Normalize a player name for consistent matching.
    
    Steps:
    1. Convert to lowercase
    2. Unicode normalization (NFKD) and remove accents
    3. Remove periods and dashes, replace with spaces
    4. Collapse multiple spaces to single space
    5. Strip leading/trailing whitespace
    
    Args:
        name: Player name to normalize
        
    Returns:
        Normalized name string
        
    Examples:
        "T.J. Hockenson" -> "tj hockenson"
        "Amon-Ra St. Brown" -> "amon ra st brown"
        "Marquis Brown Jr." -> "marquis brown" (suffixes handled separately)
    """
    if not name:
        return ""
    
    # Convert to lowercase
    normalized = name.lower()
    
    # Unicode normalization and remove accents
    normalized = unicodedata.normalize('NFKD', normalized)
    normalized = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    
    # Remove periods and dashes, replace with spaces
    normalized = re.sub(r'[.\-]', ' ', normalized)
    
    # Collapse multiple spaces to single space
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Strip leading/trailing whitespace
    normalized = normalized.strip()
    
    return normalized


def strip_suffixes(name: str) -> str:
    """
    Remove common name suffixes from a name string.
    
    Args:
        name: Name string that may contain suffixes
        
    Returns:
        Name with suffixes removed
        
    Examples:
        "Marquis Brown Jr." -> "Marquis Brown"
        "John Smith III" -> "John Smith"
    """
    if not name:
        return ""
    
    suffixes = {"jr", "sr", "ii", "iii", "iv", "v"}
    
    # Remove periods and commas, then split
    cleaned = name.replace(".", "").replace(",", " ")
    parts = [p for p in cleaned.split() if p.lower() not in suffixes]
    
    return " ".join(parts)


def normalize_for_matching(name: str) -> str:
    """
    Full normalization pipeline for player matching.
    
    Combines suffix removal and name normalization.
    
    Args:
        name: Player name to normalize for matching
        
    Returns:
        Fully normalized name for matching
    """
    if not name:
        return ""
    
    # First strip suffixes, then normalize
    without_suffixes = strip_suffixes(name)
    return normalize_name(without_suffixes)
