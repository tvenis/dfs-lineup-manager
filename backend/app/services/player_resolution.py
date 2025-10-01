from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, Tuple, List, Dict, Any
from app.models import Player
from app.utils.name_normalization import normalize_for_matching


class PlayerResolutionService:
    """Service for resolving player names from text using fuzzy matching"""
    
    @staticmethod
    def resolve_player_from_text(db: Session, text: str) -> Tuple[Optional[Player], str, List[Dict[str, Any]]:
        """
        Resolve a player from text using fuzzy matching.
        
        Args:
            db: Database session
            text: Text to search for player name
            
        Returns:
            Tuple of (Player or None, confidence_level, possible_matches)
        """
        if not text or not text.strip():
            return None, 'none', []
        
        # Normalize the text for consistent matching
        text_normalized = normalize_for_matching(text.strip())
        
        # Try different matching strategies in order of confidence
        
        # 1. Exact canonical match on displayName
        exact_match = db.query(Player).filter(
            func.lower(Player.displayName) == text.strip().lower()
        ).first()
        if exact_match:
            return exact_match, 'exact', []
        
        # 2. Exact normalized match on displayName
        exact_normalized = db.query(Player).filter(
            Player.normalized_display_name == text_normalized
        ).first()
        if exact_normalized:
            return exact_normalized, 'exact_normalized', []
        
        # 3. Try parsing "Lastname, Firstname" format
        if ',' in text:
            parts = [p.strip() for p in text.split(',', 1)]
            if len(parts) == 2:
                last_name, first_name = parts
                # Try canonical first
                player = db.query(Player).filter(
                    and_(
                        func.lower(Player.lastName) == last_name.lower(),
                        func.lower(Player.firstName) == first_name.lower()
                    )
                ).first()
                if player:
                    return player, 'exact_last_first', []
                
                # Try normalized
                last_normalized = normalize_for_matching(last_name)
                first_normalized = normalize_for_matching(first_name)
                player = db.query(Player).filter(
                    and_(
                        Player.normalized_last_name == last_normalized,
                        Player.normalized_first_name == first_normalized
                    )
                ).first()
                if player:
                    return player, 'exact_last_first_normalized', []
        
        # 4. Try parsing "Firstname Lastname" format
        name_parts = text.split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            
            # Try canonical first/last
            player = db.query(Player).filter(
                and_(
                    func.lower(Player.firstName) == first_name.lower(),
                    func.lower(Player.lastName) == last_name.lower()
                )
            ).first()
            if player:
                return player, 'exact_first_last', []
            
            # Try normalized first/last
            first_normalized = normalize_for_matching(first_name)
            last_normalized = normalize_for_matching(last_name)
            player = db.query(Player).filter(
                and_(
                    Player.normalized_first_name == first_normalized,
                    Player.normalized_last_name == last_normalized
                )
            ).first()
            if player:
                return player, 'exact_first_last_normalized', []
            
            # 5. Suffix-agnostic matching: Compare base names ignoring suffixes on either side
            suffix_agnostic_candidates = db.query(Player).filter(
                and_(
                    Player.normalized_first_name == first_normalized,
                    Player.normalized_last_name == last_normalized,
                )
            ).all()
            
            if len(suffix_agnostic_candidates) == 1:
                return suffix_agnostic_candidates[0], 'suffix_agnostic', []
            elif len(suffix_agnostic_candidates) > 1:
                return None, 'ambiguous_suffix_agnostic', [
                    {
                        'playerDkId': p.playerDkId,
                        'name': p.displayName,
                        'position': p.position,
                        'team': p.team,
                    }
                    for p in suffix_agnostic_candidates
                ]
        
        # 6. Partial match on displayName (contains)
        partial_matches = db.query(Player).filter(
            Player.displayName.ilike(f"%{text.strip()}%")
        ).all()
        
        if len(partial_matches) == 1:
            return partial_matches[0], 'partial', []
        elif len(partial_matches) > 1:
            return None, 'ambiguous_partial', [
                {
                    'playerDkId': p.playerDkId,
                    'name': p.displayName,
                    'position': p.position,
                    'team': p.team,
                }
                for p in partial_matches
            ]
        
        # 7. Partial normalized match
        partial_normalized_matches = db.query(Player).filter(
            Player.normalized_display_name.ilike(f"%{text_normalized}%")
        ).all()
        
        if len(partial_normalized_matches) == 1:
            return partial_normalized_matches[0], 'partial_normalized', []
        elif len(partial_normalized_matches) > 1:
            return None, 'ambiguous_partial_normalized', [
                {
                    'playerDkId': p.playerDkId,
                    'name': p.displayName,
                    'position': p.position,
                    'team': p.team,
                }
                for p in partial_normalized_matches
            ]
        
        # 8. Try first name + last name partial matching
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            
            partial_name_matches = db.query(Player).filter(
                and_(
                    Player.firstName.ilike(f"%{first_name}%"),
                    Player.lastName.ilike(f"%{last_name}%")
                )
            ).all()
            
            if len(partial_name_matches) == 1:
                return partial_name_matches[0], 'partial_name', []
            elif len(partial_name_matches) > 1:
                return None, 'ambiguous_partial_name', [
                    {
                        'playerDkId': p.playerDkId,
                        'name': p.displayName,
                        'position': p.position,
                        'team': p.team,
                    }
                    for p in partial_name_matches
                ]
        
        # 9. Try last name only (if single word)
        if len(name_parts) == 1:
            last_name_matches = db.query(Player).filter(
                Player.lastName.ilike(f"%{text.strip()}%")
            ).all()
            
            if len(last_name_matches) == 1:
                return last_name_matches[0], 'last_name_only', []
            elif len(last_name_matches) > 1:
                return None, 'ambiguous_last_name', [
                    {
                        'playerDkId': p.playerDkId,
                        'name': p.displayName,
                        'position': p.position,
                        'team': p.team,
                    }
                    for p in last_name_matches
                ]
        
        # 10. Try shortName if available
        short_name_matches = db.query(Player).filter(
            Player.shortName.ilike(f"%{text.strip()}%")
        ).all()
        
        if len(short_name_matches) == 1:
            return short_name_matches[0], 'short_name', []
        elif len(short_name_matches) > 1:
            return None, 'ambiguous_short_name', [
                {
                    'playerDkId': p.playerDkId,
                    'name': p.displayName,
                    'position': p.position,
                    'team': p.team,
                }
                for p in short_name_matches
            ]
        
        return None, 'none', []
    
    @staticmethod
    def get_player_suggestions(db: Session, text: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get player suggestions for autocomplete.
        
        Args:
            db: Database session
            text: Text to search for
            limit: Maximum number of suggestions
            
        Returns:
            List of player dictionaries
        """
        if not text or len(text) < 2:
            return []
        
        suggestions = db.query(Player).filter(
            Player.displayName.ilike(f"%{text}%")
        ).limit(limit).all()
        
        return [
            {
                'playerDkId': p.playerDkId,
                'name': p.displayName,
                'position': p.position,
                'team': p.team,
            }
            for p in suggestions
        ]