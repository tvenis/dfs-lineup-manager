"""
NFLVerse Service - Fetches player stats from nflverse and maps to PlayerActuals schema
"""

from typing import List, Dict, Any, Optional, Tuple
import nflreadpy as nfl
import polars as pl
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models import Player, Week, Team, TeamStats, Game
from app.services.dk_defense_scoring_service import DKDefenseScoringService


class NFLVerseService:
    """Service to fetch and process NFL player stats from nflverse"""
    
    OFFENSE_POSITIONS = ["QB", "RB", "WR", "TE", "FB", "HB"]
    
    # Position mapping: NFLVerse → DraftKings
    # DraftKings doesn't have separate FB position, they're listed as RBs
    POSITION_MAPPING = {
        "FB": "RB",  # Fullbacks are RBs in DraftKings
        "HB": "RB",  # Halfbacks are RBs in DraftKings
    }
    
    # Field mapping: NFLVerse → PlayerActuals
    FIELD_MAPPING = {
        # Passing stats
        "completions": "completions",
        "attempts": "attempts",
        "passing_yards": "pass_yds",
        "passing_tds": "pass_tds",
        "passing_interceptions": "interceptions",
        
        # Rushing stats
        "carries": "rush_att",
        "rushing_yards": "rush_yds",
        "rushing_tds": "rush_tds",
        
        # Receiving stats
        "targets": "rec_tgt",
        "receptions": "receptions",
        "receiving_yards": "rec_yds",
        "receiving_tds": "rec_tds",
        
        # Special teams
        "special_teams_tds": "special_teams_tds",
        
        # Other stats
        "rushing_fumbles_lost": "fumbles_lost",
        "receiving_fumbles_lost": "fumbles_lost",  # will merge these
        "passing_2pt_conversions": "two_pt_pass",
        "rushing_2pt_conversions": "two_pt_md",
        "receiving_2pt_conversions": "two_pt_md",  # will merge these

        # Advanced stats
        "sacks": "sacks_suffered",
        "sack_yards": "sack_yards_lost",
        "sack_fumbles_lost": "sack_fumbles_lost",
        "passing_air_yards": "passing_air_yards",
        "passing_yards_after_catch": "passing_yards_after_catch",
        "passing_first_downs": "passing_first_downs",
        "passing_epa": "passing_epa",
        "cpoe": "passing_cpoe",
        "pacr": "pacr",
        "rushing_first_downs": "rushing_first_downs",
        "rushing_epa": "rushing_epa",
        "receiving_air_yards": "receiving_air_yards",
        "receiving_yards_after_catch": "receiving_yards_after_catch",
        "receiving_first_downs": "receiving_first_downs",
        "receiving_epa": "receiving_epa",
        "racr": "racr",
        "target_share": "target_share",
        "air_yards_share": "air_yards_share",
        "wopr": "wopr",
    }
    
    @staticmethod
    def fetch_week_stats(
        season: int, 
        week: int, 
        season_type: str = "REG",
        positions: Optional[List[str]] = None
    ) -> pl.DataFrame:
        """
        Fetch player stats from nflverse for a specific week
        
        Args:
            season: NFL season year (e.g., 2025)
            week: Week number (1-18)
            season_type: "REG", "POST", or "PRE"
            positions: List of positions to filter (default: offensive positions)
        
        Returns:
            Polars DataFrame with player stats
        """
        if positions is None:
            positions = NFLVerseService.OFFENSE_POSITIONS
        
        # Load player stats
        df = nfl.load_player_stats(seasons=[season], summary_level="week")
        
        # Filter to specific week and season type
        wk_df = df.filter(
            (pl.col("season") == season) & 
            (pl.col("season_type") == season_type) & 
            (pl.col("week") == week)
        )
        
        # Filter to specified positions
        wk_offense = wk_df.filter(pl.col("position").is_in(positions))
        
        return wk_offense
    
    @staticmethod
    def normalize_position(position: str) -> str:
        """
        Normalize NFLVerse position to DraftKings position.
        
        Args:
            position: NFLVerse position code (QB, RB, WR, TE, FB, HB)
        
        Returns:
            DraftKings position code (QB, RB, WR, TE)
        """
        return NFLVerseService.POSITION_MAPPING.get(position, position)
    
    @staticmethod
    def map_nflverse_to_actuals(nflverse_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map NFLVerse stats to PlayerActuals schema
        
        Args:
            nflverse_row: Dictionary with nflverse column names
        
        Returns:
            Dictionary with PlayerActuals column names
        """
        # Normalize position (FB/HB -> RB for DraftKings)
        raw_position = nflverse_row.get("position", "")
        normalized_position = NFLVerseService.normalize_position(raw_position)
        
        actuals_data = {
            "team": nflverse_row.get("team", ""),
            "position": normalized_position,
            "_original_position": raw_position,  # Keep for reference
        }
        
        # Map standard stats, defaulting missing values to 0 for proper sorting/UI
        for nflverse_field, actuals_field in NFLVerseService.FIELD_MAPPING.items():
            value = nflverse_row.get(nflverse_field)
            
            # Handle merging of fumbles_lost and two_pt_md
            if actuals_field in ["fumbles_lost", "two_pt_md"]:
                current_value = actuals_data.get(actuals_field, 0) or 0
                new_value = float(value) if value is not None else 0
                actuals_data[actuals_field] = current_value + new_value
            else:
                actuals_data[actuals_field] = float(value) if value is not None else 0
        
        # Calculate total TDs (sum of rushing, receiving, special teams TDs)
        rush_tds = actuals_data.get("rush_tds") or 0
        rec_tds = actuals_data.get("rec_tds") or 0
        special_teams_tds = actuals_data.get("special_teams_tds") or 0
        actuals_data["total_tds"] = float(rush_tds + rec_tds + special_teams_tds)
        
        # Store raw NFLVerse data for reference
        actuals_data["_nflverse_player_id"] = nflverse_row.get("player_id")
        actuals_data["_nflverse_player_name"] = nflverse_row.get("player_display_name")
        
        return actuals_data
    
    @staticmethod
    def calculate_dk_points(stats: Dict[str, Any]) -> float:
        """
        Calculate DraftKings fantasy points based on stats
        DraftKings NFL scoring:
        - Passing: 0.04 pts/yard, 4 pts/TD, -1 pt/INT
        - Rushing: 0.1 pts/yard, 6 pts/TD
        - Receiving: 0.1 pts/yard, 6 pts/TD, 1 pt/reception (PPR)
        - 2PT Conversions: 2 pts
        - Fumbles Lost: -1 pt
        """
        points = 0.0
        
        # Passing
        if stats.get("pass_yds"):
            points += stats["pass_yds"] * 0.04
            # 300+ Yard Passing Game bonus
            if stats["pass_yds"] >= 300:
                points += 3
        if stats.get("pass_tds"):
            points += stats["pass_tds"] * 4
        if stats.get("interceptions"):
            points -= stats["interceptions"] * 1
        
        # Rushing
        if stats.get("rush_yds"):
            points += stats["rush_yds"] * 0.1
            # 100+ Yard Rushing Game bonus
            if stats["rush_yds"] >= 100:
                points += 3
        if stats.get("rush_tds"):
            points += stats["rush_tds"] * 6
        
        # Receiving (PPR)
        if stats.get("receptions"):
            points += stats["receptions"] * 1
        if stats.get("rec_yds"):
            points += stats["rec_yds"] * 0.1
            # 100+ Yard Receiving Game bonus
            if stats["rec_yds"] >= 100:
                points += 3
        if stats.get("rec_tds"):
            points += stats["rec_tds"] * 6

        # Special teams TDs (punt/kickoff/FG returns, offensive fumble recovery TDs captured here)
        if stats.get("special_teams_tds"):
            points += stats["special_teams_tds"] * 6
        
        # 2-point conversions
        if stats.get("two_pt_md"):
            points += stats["two_pt_md"] * 2
        if stats.get("two_pt_pass"):
            points += stats["two_pt_pass"] * 2
        
        # Fumbles lost
        if stats.get("fumbles_lost"):
            points -= stats["fumbles_lost"] * 1
        
        return round(points, 2)
    
    @staticmethod
    def match_player(
        db: Session,
        nflverse_name: str,
        team: str,
        position: str
    ) -> Tuple[Optional[Player], str, List[Dict[str, Any]]]:
        """
        Match NFLVerse player to DraftKings player in database.
        Uses the shared find_player_match service for consistency.
        
        Args:
            db: Database session
            nflverse_name: Player name from nflverse (e.g., "Justin Herbert")
            team: Team abbreviation
            position: Position code (should be normalized - FB->RB, HB->RB)
        
        Returns:
            Tuple of (matched_player, confidence, possible_matches)
            confidence: 'exact', 'high', 'medium', 'low', 'none'
        """
        # Import here to avoid circular dependency
        from app.routers.projections import find_player_match
        
        # Use the shared player matching service from projections
        matched_player, confidence, candidates = find_player_match(
            db=db,
            name=nflverse_name,
            team=team,
            position=position
        )
        
        # Handle ambiguous matches
        if confidence.startswith('ambiguous'):
            return (None, 'none', candidates)
        
        # Map confidence levels to NFLVerse-friendly names
        confidence_map = {
            'exact': 'exact',
            'exact_no_team': 'high',
            'exact_normalized': 'high',
            'exact_normalized_no_team': 'high',
            'partial': 'medium',
            'partial_no_team': 'medium',
            'partial_normalized': 'medium',
            'suffix_agnostic': 'high',
            'suffix_agnostic_with_team': 'high',
            'fallback_first_last': 'low',
            'fallback_normalized': 'low',
            'name_only': 'low',
            'alias': 'high',  # Alias matches should be treated as high confidence
            'none': 'none'
        }
        
        mapped_confidence = confidence_map.get(confidence, 'low')
        
        return (matched_player, mapped_confidence, candidates)
    
    @staticmethod
    def process_week_stats(
        db: Session,
        week_id: int,
        season: int,
        week_number: int,
        season_type: str = "REG"
    ) -> Dict[str, Any]:
        """
        Fetch NFLVerse data and prepare for import into PlayerActuals
        
        Args:
            db: Database session
            week_id: Database week ID
            season: NFL season year
            week_number: Week number
            season_type: Season type (REG, POST, PRE)
        
        Returns:
            Dictionary with matched players and import statistics
        """
        # Verify week exists
        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            raise ValueError(f"Week ID {week_id} not found in database")
        
        # Fetch NFLVerse data
        nflverse_df = NFLVerseService.fetch_week_stats(season, week_number, season_type)
        
        # Convert to list of dicts
        nflverse_data = nflverse_df.to_dicts()
        
        matched_players = []
        unmatched_players = []
        match_stats = {
            'exact': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'none': 0
        }
        
        for nfl_player in nflverse_data:
            # Map stats
            actuals_data = NFLVerseService.map_nflverse_to_actuals(nfl_player)
            
            # Calculate DK points
            actuals_data["dk_actuals"] = NFLVerseService.calculate_dk_points(actuals_data)
            
            # Try to match player
            player_name = nfl_player.get("player_display_name", "")
            team = nfl_player.get("team", "")
            raw_position = nfl_player.get("position", "")
            # Normalize position for matching (FB -> RB)
            normalized_position = NFLVerseService.normalize_position(raw_position)
            
            matched_player, confidence, possible_matches = NFLVerseService.match_player(
                db, player_name, team, normalized_position
            )
            
            match_stats[confidence] += 1
            
            if matched_player:
                actuals_data["playerDkId"] = matched_player.playerDkId
                actuals_data["week_id"] = week_id
                actuals_data["name"] = player_name  # Keep for UI display
                actuals_data["match_confidence"] = confidence
                matched_players.append(actuals_data)
            else:
                unmatched_players.append({
                    "name": player_name,
                    "team": team,
                    "position": normalized_position,
                    "stats": actuals_data,
                    "match_confidence": confidence
                })
        
        return {
            "matched_players": matched_players,
            "unmatched_players": unmatched_players,
            "match_stats": match_stats,
            "total_players": len(nflverse_data),
            "season": season,
            "week": week_number,
            "season_type": season_type
        }
    
    @staticmethod
    def fetch_team_stats(
        season: int, 
        week: int, 
        season_type: str = "REG"
    ) -> pl.DataFrame:
        """
        Fetch team stats from nflverse for a specific week
        
        Args:
            season: NFL season year (e.g., 2025)
            week: Week number (1-18)
            season_type: "REG", "POST", or "PRE"
        
        Returns:
            Polars DataFrame with team stats
        """
        # Load team stats
        df = nfl.load_team_stats(seasons=[season], summary_level="week")
        
        # Filter to specific week and season type
        wk_df = df.filter(
            (pl.col("season") == season) & 
            (pl.col("season_type") == season_type) & 
            (pl.col("week") == week)
        )
        
        return wk_df
    
    @staticmethod
    def map_team_stats_to_defense(nflverse_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map NFLVerse team stats to TeamStats schema
        
        Args:
            nflverse_row: Dictionary with nflverse column names
        
        Returns:
            Dictionary with TeamStats column names
        """
        defense_data = {
            "team": nflverse_row.get("team", ""),
            "opponent_team": nflverse_row.get("opponent_team", ""),
        }
        
        # Map all the statistical fields, defaulting missing values to 0
        field_mapping = {
            # Offensive stats allowed
            "completions": "completions",
            "attempts": "attempts", 
            "passing_yards": "passing_yards",
            "passing_tds": "passing_tds",
            "passing_interceptions": "passing_interceptions",
            "sacks_suffered": "sacks_suffered",
            "sack_yards_lost": "sack_yards_lost",
            "sack_fumbles": "sack_fumbles",
            "sack_fumbles_lost": "sack_fumbles_lost",
            "passing_air_yards": "passing_air_yards",
            "passing_yards_after_catch": "passing_yards_after_catch",
            "passing_first_downs": "passing_first_downs",
            "passing_epa": "passing_epa",
            "passing_cpoe": "passing_cpoe",
            "passing_2pt_conversions": "passing_2pt_conversions",
            "carries": "carries",
            "rushing_yards": "rushing_yards",
            "rushing_tds": "rushing_tds",
            "rushing_fumbles": "rushing_fumbles",
            "rushing_fumbles_lost": "rushing_fumbles_lost",
            "rushing_first_downs": "rushing_first_downs",
            "rushing_epa": "rushing_epa",
            "rushing_2pt_conversions": "rushing_2pt_conversions",
            "receptions": "receptions",
            "targets": "targets",
            "receiving_yards": "receiving_yards",
            "receiving_tds": "receiving_tds",
            "receiving_fumbles": "receiving_fumbles",
            "receiving_fumbles_lost": "receiving_fumbles_lost",
            "receiving_air_yards": "receiving_air_yards",
            "receiving_yards_after_catch": "receiving_yards_after_catch",
            "receiving_first_downs": "receiving_first_downs",
            "receiving_epa": "receiving_epa",
            "receiving_2pt_conversions": "receiving_2pt_conversions",
            "special_teams_tds": "special_teams_tds",
            
            # Defensive stats
            "def_tackles_solo": "def_tackles_solo",
            "def_tackles_with_assist": "def_tackles_with_assist",
            "def_tackle_assists": "def_tackle_assists",
            "def_tackles_for_loss": "def_tackles_for_loss",
            "def_tackles_for_loss_yards": "def_tackles_for_loss_yards",
            "def_fumbles_forced": "def_fumbles_forced",
            "def_sacks": "def_sacks",
            "def_sack_yards": "def_sack_yards",
            "def_qb_hits": "def_qb_hits",
            "def_interceptions": "def_interceptions",
            "def_interception_yards": "def_interception_yards",
            "def_pass_defended": "def_pass_defended",
            "def_tds": "def_tds",
            "def_fumbles": "def_fumbles",
            "def_safeties": "def_safeties",
            "misc_yards": "misc_yards",
            "fumble_recovery_own": "fumble_recovery_own",
            "fumble_recovery_yards_own": "fumble_recovery_yards_own",
            "fumble_recovery_opp": "fumble_recovery_opp",
            "fumble_recovery_yards_opp": "fumble_recovery_yards_opp",
            "fumble_recovery_tds": "fumble_recovery_tds",
            "penalties": "penalties",
            "penalty_yards": "penalty_yards",
        }
        
        for nflverse_field, defense_field in field_mapping.items():
            value = nflverse_row.get(nflverse_field)
            defense_data[defense_field] = float(value) if value is not None else 0.0
        
        # Store raw NFLVerse data for reference
        defense_data["_nflverse_team"] = nflverse_row.get("team")
        defense_data["_nflverse_opponent"] = nflverse_row.get("opponent_team")
        
        return defense_data
    
    @staticmethod
    def calculate_dk_defense_score(stats: Dict[str, Any], db: Session = None, team_id: int = None, week_id: int = None) -> float:
        """
        Calculate DraftKings fantasy points for defense based on stats
        
        Args:
            stats: Dictionary containing team defensive statistics
            db: Database session (optional, for getting points allowed)
            team_id: Team ID (optional, for getting points allowed from games table)
            week_id: Week ID (optional, for getting points allowed from games table)
        
        Returns:
            Total DraftKings fantasy points for defense
        """
        # Calculate basic stats using our dedicated service
        points_allowed = 0
        
        # Try to get points allowed from games table if database session is provided
        if db and team_id and week_id:
            try:
                # Get the game record for this team and week
                game = db.query(Game).filter(
                    and_(
                        Game.team_id == team_id,
                        Game.week_id == week_id
                    )
                ).first()
                
                if game and game.away_score is not None and game.home_score is not None:
                    # Determine points allowed based on home/away
                    if game.homeoraway == 'H':
                        # Home team, so away team scored against them
                        points_allowed = game.away_score
                    elif game.homeoraway == 'A':
                        # Away team, so home team scored against them
                        points_allowed = game.home_score
                    else:
                        # Neutral site, use the appropriate score
                        points_allowed = game.away_score if game.homeoraway == 'A' else game.home_score
                        
            except Exception as e:
                print(f"Warning: Could not get points allowed for team {team_id}, week {week_id}: {e}")
                points_allowed = 0
        
        # Use our dedicated DK Defense Scoring Service
        return DKDefenseScoringService.calculate_defense_score_from_dict(stats, points_allowed)
    
    @staticmethod
    def get_points_allowed_for_team(db: Session, team_id: int, week_id: int) -> int:
        """
        Get points allowed for a team from the games table.
        
        Args:
            db: Database session
            team_id: Team ID
            week_id: Week ID
            
        Returns:
            Points scored against the team's defense
        """
        try:
            # Get the game record for this team and week
            game = db.query(Game).filter(
                and_(
                    Game.team_id == team_id,
                    Game.week_id == week_id
                )
            ).first()
            
            if game and game.away_score is not None and game.home_score is not None:
                # Determine points allowed based on home/away
                if game.homeoraway == 'H':
                    # Home team, so away team scored against them
                    return game.away_score
                elif game.homeoraway == 'A':
                    # Away team, so home team scored against them
                    return game.home_score
                else:
                    # Neutral site, use the appropriate score
                    return game.away_score if game.homeoraway == 'A' else game.home_score
            
            return 0
            
        except Exception as e:
            print(f"Warning: Could not get points allowed for team {team_id}, week {week_id}: {e}")
            return 0
    
    @staticmethod
    def match_team(
        db: Session,
        nflverse_team: str
    ) -> Tuple[Optional[Team], str]:
        """
        Match NFLVerse team abbreviation to database team
        
        Args:
            db: Database session
            nflverse_team: Team abbreviation from nflverse (e.g., "KC", "BUF")
        
        Returns:
            Tuple of (matched_team, confidence)
            confidence: 'exact', 'none'
        """
        # Special handling for LA -> LAR mapping
        if nflverse_team == "LA":
            team = db.query(Team).filter(Team.id == 19).first()  # LAR team_id = 19
            if team:
                return (team, 'exact')
            else:
                return (None, 'none')
        
        # Try exact match first
        team = db.query(Team).filter(Team.abbreviation == nflverse_team).first()
        
        if team:
            return (team, 'exact')
        else:
            return (None, 'none')
    
    @staticmethod
    def process_team_stats(
        db: Session,
        week_id: int,
        season: int,
        week_number: int,
        season_type: str = "REG"
    ) -> Dict[str, Any]:
        """
        Fetch NFLVerse team stats and prepare for import into TeamStats
        
        Args:
            db: Database session
            week_id: Database week ID
            season: NFL season year
            week_number: Week number
            season_type: Season type (REG, POST, PRE)
        
        Returns:
            Dictionary with matched teams and import statistics
        """
        # Verify week exists
        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            raise ValueError(f"Week ID {week_id} not found in database")
        
        # Fetch NFLVerse data
        nflverse_df = NFLVerseService.fetch_team_stats(season, week_number, season_type)
        
        # Convert to list of dicts
        nflverse_data = nflverse_df.to_dicts()
        
        matched_teams = []
        unmatched_teams = []
        match_stats = {
            'exact': 0,
            'none': 0
        }
        
        for nfl_team in nflverse_data:
            # Map stats
            defense_data = NFLVerseService.map_team_stats_to_defense(nfl_team)
            
            # Try to match team first (needed for points allowed calculation)
            team_abbr = nfl_team.get("team", "")
            opponent_abbr = nfl_team.get("opponent_team", "")
            
            matched_team, team_confidence = NFLVerseService.match_team(db, team_abbr)
            matched_opponent, opponent_confidence = NFLVerseService.match_team(db, opponent_abbr)
            
            match_stats[team_confidence] += 1
            
            if matched_team:
                defense_data["team_id"] = matched_team.id
                defense_data["week_id"] = week_id
                defense_data["team_name"] = team_abbr  # Keep for UI display
                defense_data["match_confidence"] = team_confidence
                
                # Add opponent if matched
                if matched_opponent:
                    defense_data["opponent_team_id"] = matched_opponent.id
                    defense_data["opponent_name"] = opponent_abbr
                else:
                    defense_data["opponent_team_id"] = None
                    defense_data["opponent_name"] = opponent_abbr
                
                # Calculate DK defense score with points allowed from games table
                defense_data["dk_defense_score"] = NFLVerseService.calculate_dk_defense_score(
                    defense_data, 
                    db=db, 
                    team_id=matched_team.id, 
                    week_id=week_id
                )
                
                # Also store points_allowed for future reference
                defense_data["points_allowed"] = NFLVerseService.get_points_allowed_for_team(
                    db, matched_team.id, week_id
                )
                
                matched_teams.append(defense_data)
            else:
                unmatched_teams.append({
                    "team": team_abbr,
                    "opponent": opponent_abbr,
                    "stats": defense_data,
                    "match_confidence": team_confidence
                })
        
        return {
            "matched_teams": matched_teams,
            "unmatched_teams": unmatched_teams,
            "match_stats": match_stats,
            "total_teams": len(nflverse_data),
            "season": season,
            "week": week_number,
            "season_type": season_type
        }
    
    @staticmethod
    def fetch_game_results(
        season: int, 
        week: int, 
        season_type: str = "REG"
    ) -> pl.DataFrame:
        """
        Fetch game results from nflverse for a specific week
        
        Args:
            season: NFL season year (e.g., 2025)
            week: Week number (1-18)
            season_type: "REG", "POST", or "PRE"
        
        Returns:
            Polars DataFrame with game results
        """
        # Load schedules data
        df = nfl.load_schedules(seasons=[season])
        
        # Filter to specific week and game type (season_type maps to game_type in NFLVerse)
        wk_df = df.filter(
            (pl.col("season") == season) & 
            (pl.col("game_type") == season_type) & 
            (pl.col("week") == week)
        )
        
        return wk_df
    
    @staticmethod
    def map_game_results_to_schema(nflverse_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map NFLVerse game results to Game schema
        
        Args:
            nflverse_row: Dictionary with nflverse column names
        
        Returns:
            Dictionary with Game column names
        """
        game_data = {}
        
        # Map all the statistical fields, defaulting missing values appropriately
        field_mapping = {
            # Core game data
            "game_id": "nflverse_game_id",
            "away_score": "away_score",
            "home_score": "home_score", 
            "result": "result",
            "total": "total",
            "overtime": "overtime",
            "weekday": "weekday",
            "gsis": "gsis",
            "pfr": "pfr",
            "pff": "pff",
            "espn": "espn",
            "away_rest": "away_rest",
            "home_rest": "home_rest",
            "div_game": "div_game",
            "roof": "roof",
            "surface": "surface",
            "temp": "temp",
            "wind": "wind",
            "stadium_id": "stadium_id",
            "stadium": "stadium",
        }
        
        for nflverse_field, game_field in field_mapping.items():
            value = nflverse_row.get(nflverse_field)
            
            # Handle different data types appropriately
            if value is not None:
                if game_field == "nflverse_game_id":
                    # String field for NFLVerse game ID
                    game_data[game_field] = str(value)
                elif game_field in ["away_score", "home_score", "gsis", "espn", "away_rest", "home_rest", "temp", "wind"]:
                    # Integer fields
                    game_data[game_field] = int(value)
                elif game_field in ["pfr", "pff"]:
                    # String fields for PFR/PFF IDs (can be strings like '202409050kan')
                    game_data[game_field] = str(value) if value is not None else None
                elif game_field in ["result", "total"]:
                    # Float fields
                    game_data[game_field] = float(value)
                elif game_field in ["overtime", "div_game"]:
                    # Boolean fields
                    game_data[game_field] = bool(value)
                else:
                    # String fields
                    game_data[game_field] = str(value)
            else:
                # Set appropriate defaults for None values
                if game_field == "nflverse_game_id":
                    game_data[game_field] = None
                elif game_field in ["away_score", "home_score", "gsis", "espn", "away_rest", "home_rest", "temp", "wind"]:
                    game_data[game_field] = None
                elif game_field in ["pfr", "pff"]:
                    game_data[game_field] = None
                elif game_field in ["result", "total"]:
                    game_data[game_field] = None
                elif game_field in ["overtime", "div_game"]:
                    game_data[game_field] = None
                else:
                    game_data[game_field] = None
        
        # Store raw NFLVerse data for reference
        game_data["_nflverse_away_team"] = nflverse_row.get("away_team")
        game_data["_nflverse_home_team"] = nflverse_row.get("home_team")
        
        return game_data
    
    @staticmethod
    def process_game_results(
        db: Session,
        week_id: int,
        season: int,
        week_number: int,
        season_type: str = "REG"
    ) -> Dict[str, Any]:
        """
        Fetch NFLVerse game results and prepare for import into Games table
        
        Args:
            db: Database session
            week_id: Database week ID
            season: NFL season year
            week_number: Week number
            season_type: Season type (REG, POST, PRE)
        
        Returns:
            Dictionary with matched games and import statistics
        """
        # Verify week exists
        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            raise ValueError(f"Week ID {week_id} not found in database")
        
        # Fetch NFLVerse data
        nflverse_df = NFLVerseService.fetch_game_results(season, week_number, season_type)
        
        # Convert to list of dicts
        nflverse_data = nflverse_df.to_dicts()
        
        matched_games = []
        unmatched_games = []
        match_stats = {
            'exact': 0,
            'none': 0
        }
        
        for nfl_game in nflverse_data:
            # Map game data
            game_data = NFLVerseService.map_game_results_to_schema(nfl_game)
            
            # Try to match teams
            away_team_abbr = nfl_game.get("away_team", "")
            home_team_abbr = nfl_game.get("home_team", "")
            
            matched_away_team, away_confidence = NFLVerseService.match_team(db, away_team_abbr)
            matched_home_team, home_confidence = NFLVerseService.match_team(db, home_team_abbr)
            
            # Both teams must match for the game to be importable
            if matched_away_team and matched_home_team:
                match_stats['exact'] += 1
                
                # Create two game records (one for each team's perspective)
                # Away team record
                away_game_data = game_data.copy()
                away_game_data.update({
                    "team_id": matched_away_team.id,
                    "opponent_team_id": matched_home_team.id,
                    "homeoraway": "A",
                    "team_name": away_team_abbr,
                    "opponent_name": home_team_abbr,
                    "match_confidence": away_confidence
                })
                matched_games.append(away_game_data)
                
                # Home team record
                home_game_data = game_data.copy()
                home_game_data.update({
                    "team_id": matched_home_team.id,
                    "opponent_team_id": matched_away_team.id,
                    "homeoraway": "H",
                    "team_name": home_team_abbr,
                    "opponent_name": away_team_abbr,
                    "match_confidence": home_confidence
                })
                matched_games.append(home_game_data)
                
            else:
                match_stats['none'] += 1
                unmatched_games.append({
                    "away_team": away_team_abbr,
                    "home_team": home_team_abbr,
                    "away_matched": bool(matched_away_team),
                    "home_matched": bool(matched_home_team),
                    "away_confidence": away_confidence,
                    "home_confidence": home_confidence,
                    "game_data": game_data
                })
        
        return {
            "matched_games": matched_games,
            "unmatched_games": unmatched_games,
            "match_stats": match_stats,
            "total_games": len(nflverse_data),
            "season": season,
            "week": week_number,
            "season_type": season_type
        }

