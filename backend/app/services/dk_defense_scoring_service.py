"""
DK Defense Scoring Service

Handles the calculation of DraftKings defense/special teams scoring based on NFLVerse team stats.
"""

from typing import Optional
from app.models import TeamStats


class DKDefenseScoringService:
    """Service for calculating DraftKings defense/special teams fantasy points."""
    
    @staticmethod
    def get_points_allowed_bonus(points_allowed: int) -> int:
        """
        Calculate DraftKings points bonus/penalty based on points allowed.
        
        Args:
            points_allowed: Points scored against the defense
            
        Returns:
            DraftKings points (positive for bonus, negative for penalty)
        """
        if points_allowed == 0:
            return 10
        elif 1 <= points_allowed <= 6:
            return 7
        elif 7 <= points_allowed <= 13:
            return 4
        elif 14 <= points_allowed <= 20:
            return 1
        elif 21 <= points_allowed <= 27:
            return 0
        elif 28 <= points_allowed <= 34:
            return -1
        elif points_allowed >= 35:
            return -4
        else:
            # Handle negative points (shouldn't happen but safety first)
            return 0
    
    @staticmethod
    def calculate_defense_score(team_stats: TeamStats, points_allowed: int) -> float:
        """
        Calculate total DraftKings defense/special teams fantasy points.
        
        Args:
            team_stats: TeamStats object with defensive statistics
            points_allowed: Points scored against the defense (from games table)
            
        Returns:
            Total DraftKings fantasy points for defense/special teams
        """
        score = 0.0
        
        # Basic defensive stats (per DraftKings scoring rules)
        # Sack +1 Pt
        if team_stats.def_sacks:
            score += team_stats.def_sacks * 1
        
        # Interception +2 Pts
        if team_stats.def_interceptions:
            score += team_stats.def_interceptions * 2
        
        # Fumble Recovery +2 Pts
        if team_stats.fumble_recovery_opp:
            score += team_stats.fumble_recovery_opp * 2
        
        # Touchdowns +6 Pts each
        # def_tds covers: Interception Return TD, Fumble Recovery TD
        if team_stats.def_tds:
            score += team_stats.def_tds * 6
        
        # Special Teams TDs +6 Pts each
        # special_teams_tds covers: Punt/Kickoff/FG Return for TD
        if team_stats.special_teams_tds:
            score += team_stats.special_teams_tds * 6
        
        # Safety +2 Pts (also covers 2 Pt Conversion/Extra Point Return)
        if team_stats.def_safeties:
            score += team_stats.def_safeties * 2
        
        # Blocked Kick +2 Pts
        # Note: This field may need to be added to TeamStats model
        # For now, we'll handle it if the field exists
        if hasattr(team_stats, 'blocked_kicks') and team_stats.blocked_kicks:
            score += team_stats.blocked_kicks * 2
        
        # Points Allowed bonus/penalty
        points_allowed_bonus = DKDefenseScoringService.get_points_allowed_bonus(points_allowed)
        score += points_allowed_bonus
        
        return score
    
    @staticmethod
    def calculate_defense_score_from_dict(
        team_stats_dict: dict, 
        points_allowed: int
    ) -> float:
        """
        Calculate DraftKings defense score from a dictionary of team stats.
        
        Args:
            team_stats_dict: Dictionary containing team statistics
            points_allowed: Points scored against the defense
            
        Returns:
            Total DraftKings fantasy points for defense/special teams
        """
        score = 0.0
        
        # Basic defensive stats
        score += (team_stats_dict.get('def_sacks', 0) or 0) * 1
        score += (team_stats_dict.get('def_interceptions', 0) or 0) * 2
        score += (team_stats_dict.get('fumble_recovery_opp', 0) or 0) * 2
        score += (team_stats_dict.get('def_tds', 0) or 0) * 6
        score += (team_stats_dict.get('special_teams_tds', 0) or 0) * 6
        score += (team_stats_dict.get('def_safeties', 0) or 0) * 2
        
        # Blocked Kick (if field exists)
        score += (team_stats_dict.get('blocked_kicks', 0) or 0) * 2
        
        # Points Allowed bonus/penalty
        points_allowed_bonus = DKDefenseScoringService.get_points_allowed_bonus(points_allowed)
        score += points_allowed_bonus
        
        return score
    
    @staticmethod
    def get_scoring_breakdown(team_stats: TeamStats, points_allowed: int) -> dict:
        """
        Get detailed breakdown of DraftKings defense scoring.
        
        Args:
            team_stats: TeamStats object with defensive statistics
            points_allowed: Points scored against the defense
            
        Returns:
            Dictionary with scoring breakdown
        """
        breakdown = {
            'sacks': (team_stats.def_sacks or 0) * 1,
            'interceptions': (team_stats.def_interceptions or 0) * 2,
            'fumble_recoveries': (team_stats.fumble_recovery_opp or 0) * 2,
            'defensive_tds': (team_stats.def_tds or 0) * 6,
            'special_teams_tds': (team_stats.special_teams_tds or 0) * 6,
            'safeties': (team_stats.def_safeties or 0) * 2,
            'blocked_kicks': (getattr(team_stats, 'blocked_kicks', 0) or 0) * 2,
            'points_allowed': DKDefenseScoringService.get_points_allowed_bonus(points_allowed),
            'total': 0.0
        }
        
        breakdown['total'] = sum(breakdown.values())
        
        return breakdown
