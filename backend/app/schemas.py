from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date

# Base schemas
class TeamBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)  # full team name
    abbreviation: Optional[str] = Field(None, max_length=10)  # short code
    mascot: Optional[str] = Field(None, max_length=50)  # team mascot/category
    logo: Optional[str] = Field(None, max_length=500)  # URL to team logo
    division: Optional[str] = Field(None, max_length=50)  # team division
    conference: Optional[str] = Field(None, max_length=50)  # team conference
    odds_api_id: Optional[str] = Field(None, max_length=50)  # Odds API team ID

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    abbreviation: Optional[str] = Field(None, max_length=10)
    mascot: Optional[str] = Field(None, max_length=50)
    logo: Optional[str] = Field(None, max_length=500)
    division: Optional[str] = Field(None, max_length=50)
    conference: Optional[str] = Field(None, max_length=50)
    odds_api_id: Optional[str] = Field(None, max_length=50)

class Team(TeamBase):
    id: int  # sequential integer starting at 1
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PlayerBase(BaseModel):
    playerDkId: int = Field(..., description="DraftKings player ID (unique key)")
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    displayName: str = Field(..., min_length=1, max_length=100)
    shortName: Optional[str] = Field(None, max_length=50)
    position: str = Field(..., min_length=1, max_length=10)  # 'QB' | 'RB' | 'WR' | 'TE' | 'DST'
    team: str = Field(..., min_length=1, max_length=10)  # team abbreviation
    team_id: Optional[int] = Field(None, description="Foreign key to teams.id")
    playerImage50: Optional[str] = Field(None, max_length=500, description="URL to 50x50 player image")
    playerImage160: Optional[str] = Field(None, max_length=500, description="URL to 160x160 player image")
    hidden: bool = Field(default=False, description="Whether to hide player from Player Profile list")

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    firstName: Optional[str] = Field(None, min_length=1, max_length=100)
    lastName: Optional[str] = Field(None, min_length=1, max_length=100)
    displayName: Optional[str] = Field(None, min_length=1, max_length=100)
    shortName: Optional[str] = Field(None, max_length=50)
    position: Optional[str] = Field(None, min_length=1, max_length=10)
    team: Optional[str] = Field(None, min_length=1, max_length=10)
    team_id: Optional[int] = Field(None, description="Foreign key to teams.id")
    playerImage50: Optional[str] = Field(None, max_length=500)
    playerImage160: Optional[str] = Field(None, max_length=500)
    hidden: Optional[bool] = Field(None, description="Whether to hide player from Player Profile list")

class Player(PlayerBase):
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WeekBase(BaseModel):
    week_number: int = Field(..., ge=1, le=18)  # Week 1-18 (or more for playoffs)
    year: int = Field(..., ge=2020, le=2030)  # Reasonable year range
    start_date: date
    end_date: date
    game_count: int = Field(default=0, ge=0)
    status: str = Field(default="Upcoming", pattern="^(Completed|Active|Upcoming)$")
    notes: Optional[str] = None

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

class WeekCreate(WeekBase):
    pass

class WeekUpdate(BaseModel):
    week_number: Optional[int] = Field(None, ge=1, le=18)
    year: Optional[int] = Field(None, ge=2020, le=2030)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    game_count: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(Completed|Active|Upcoming)$")
    notes: Optional[str] = None

class Week(WeekBase):
    id: int
    imported_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DraftGroupBase(BaseModel):
    draftGroup: int = Field(..., description="Draft Group ID")
    week_id: int = Field(..., description="Week ID from weeks table")
    draftGroup_description: Optional[str] = Field(None, max_length=255, description="Description of the draft group")
    games: int = Field(default=0, ge=0, description="Number of games in this draft group")

class DraftGroupCreate(DraftGroupBase):
    pass

class DraftGroupUpdate(BaseModel):
    draftGroup: Optional[int] = Field(None, description="Draft Group ID")
    week_id: Optional[int] = Field(None, description="Week ID from weeks table")
    draftGroup_description: Optional[str] = Field(None, max_length=255, description="Description of the draft group")
    games: Optional[int] = Field(None, ge=0, description="Number of games in this draft group")

class DraftGroup(DraftGroupBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PlayerPoolEntryBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    draftGroup: str = Field(..., description="Draft Group ID from DraftKings")
    playerDkId: int = Field(..., description="DraftKings player ID")
    draftableId: Optional[str] = Field(None, max_length=50, description="DraftKings draftable ID for this player pool entry")
    projectedPoints: Optional[float] = Field(None, description="Extracted projection value from draftStatAttributes")
    actuals: Optional[float] = Field(None, description="Actual points scored")
    ownership: Optional[float] = Field(None, ge=0, le=100, description="Ownership percentage from CSV imports (0.00-100.00)")
    salary: int = Field(..., ge=0, description="Player salary from DraftKings")
    status: str = Field(default="Available", max_length=20)
    isDisabled: bool = Field(default=False)
    excluded: bool = Field(default=False, description="Whether player is excluded from this week")
    tier: int = Field(default=4, ge=1, le=4, description="DFS tier: 1=Core/Cash, 2=Strong Plays, 3=GPP/Ceiling, 4=Avoids/Thin")
    playerGameHash: Optional[str] = Field(None, max_length=100)
    
    # JSON blobs for complex DraftKings data
    competitions: Optional[Union[Dict[str, Any], List[Any]]] = None
    draftStatAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    playerAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    teamLeagueSeasonAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    playerGameAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    draftAlerts: Optional[Union[Dict[str, Any], List[Any]]] = None
    externalRequirements: Optional[Union[Dict[str, Any], List[Any]]] = None

class PlayerPoolEntryCreate(PlayerPoolEntryBase):
    pass

class PlayerPoolEntryUpdate(BaseModel):
    draftableId: Optional[str] = Field(None, max_length=50)
    projectedPoints: Optional[float] = Field(None)
    salary: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=20)
    isDisabled: Optional[bool] = None
    excluded: Optional[bool] = None
    tier: Optional[int] = Field(None, ge=1, le=4, description="DFS tier: 1=Core/Cash, 2=Strong Plays, 3=GPP/Ceiling, 4=Avoids/Thin")
    playerGameHash: Optional[str] = Field(None, max_length=100)
    competitions: Optional[Union[Dict[str, Any], List[Any]]] = None
    draftStatAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    playerAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    teamLeagueSeasonAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    playerGameAttributes: Optional[Union[Dict[str, Any], List[Any]]] = None
    draftAlerts: Optional[Union[Dict[str, Any], List[Any]]] = None
    externalRequirements: Optional[Union[Dict[str, Any], List[Any]]] = None

class PlayerPoolEntry(PlayerPoolEntryBase):
    id: int
    player: Player
    week: Week
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class RecentActivityBase(BaseModel):
    # Core activity information
    timestamp: datetime
    action: str = Field(..., pattern="^[a-z-]+-(import|export)$", description="Action type like 'player-pool-import', 'projections-export'")
    category: str = Field(..., pattern="^(data-import|data-export|system-maintenance|user-action)$")
    
    # File and source information
    file_type: str = Field(..., pattern="^(API|CSV|JSON|XML)$")
    file_name: Optional[str] = Field(None, max_length=200)
    file_size_bytes: Optional[int] = Field(None, ge=0)
    import_source: Optional[str] = Field(None, max_length=50)
    
    # Context information
    week_id: int = Field(..., description="Week ID from weeks table")
    draft_group: Optional[str] = Field(None, max_length=50)
    
    # Operation results
    records_added: int = Field(default=0, ge=0)
    records_updated: int = Field(default=0, ge=0)
    records_skipped: int = Field(default=0, ge=0)
    records_failed: int = Field(default=0, ge=0)
    
    # Operation status and performance
    operation_status: str = Field(default="completed", pattern="^(completed|failed|partial|cancelled)$")
    duration_ms: Optional[int] = Field(None, ge=0)
    
    # Error handling
    errors: Optional[Dict[str, Any]] = Field(None, description="Structured error information")
    error_count: int = Field(default=0, ge=0)
    
    # Audit trail
    created_by: Optional[str] = Field(None, max_length=100)
    ip_address: Optional[str] = Field(None, max_length=45)
    session_id: Optional[str] = Field(None, max_length=100)
    user_agent: Optional[str] = None
    
    # Relationship tracking
    parent_activity_id: Optional[int] = Field(None, description="Parent activity ID for chained operations")
    
    # Additional metadata
    details: Optional[Dict[str, Any]] = Field(None, description="Structured metadata")
    user_name: Optional[str] = Field(None, max_length=100)  # Legacy field for backward compatibility
    
    # Data retention
    retention_until: Optional[datetime] = None
    is_archived: bool = Field(default=False)

class RecentActivity(RecentActivityBase):
    id: int
    week: Week
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RecentActivityCreate(RecentActivityBase):
    """Schema for creating new activity records"""
    pass

class RecentActivityUpdate(BaseModel):
    """Schema for updating activity records"""
    operation_status: Optional[str] = Field(None, pattern="^(completed|failed|partial|cancelled)$")
    duration_ms: Optional[int] = Field(None, ge=0)
    errors: Optional[Dict[str, Any]] = None
    error_count: Optional[int] = Field(None, ge=0)
    details: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None


class LineupBase(BaseModel):
    week_id: int = Field(..., gt=0)  # Updated to Integer
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])  # string[] (free-form labels)
    game_style: Optional[str] = Field(None, max_length=50)  # e.g., 'Classic', 'Showdown', etc.
    slots: Dict[str, Optional[int]] = Field(..., description="QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerDkId")
    status: Optional[str] = Field(default="created", pattern="^(created|exported|uploaded|submitted)$")
    salary_used: int = Field(default=0)

class LineupCreate(BaseModel):
    week_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])
    game_style: Optional[str] = Field(None, max_length=50)
    slots: Dict[str, Optional[int]] = Field(..., description="QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerDkId")
    status: Optional[str] = Field(default="created", pattern="^(created|exported|uploaded|submitted)$")

class LineupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    tags: Optional[List[str]] = None
    game_style: Optional[str] = Field(None, max_length=50)
    slots: Optional[Dict[str, Optional[str]]] = None
    status: Optional[str] = Field(None, pattern="^(created|exported|uploaded|submitted)$")
    salary_used: Optional[int] = None

class Lineup(LineupBase):
    id: str = Field(..., min_length=1, max_length=50)
    week: Optional[Week] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LineupSimple(BaseModel):
    id: str = Field(..., min_length=1, max_length=50)
    week_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])
    game_style: Optional[str] = Field(None, max_length=50)
    slots: Dict[str, Optional[int]] = Field(..., description="QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerDkId")
    salary_used: int = Field(default=0)
    status: Optional[str] = Field(default="created", pattern="^(created|exported|uploaded|submitted)$")
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)  # rich text, HTML/Markdown

class CommentCreate(CommentBase):
    playerDkId: Optional[int] = None
    week_id: Optional[int] = None
    url: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)
    playerDkId: Optional[int] = None
    week_id: Optional[int] = None
    url: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None

class Comment(CommentBase):
    id: int
    playerDkId: Optional[int] = None
    week_id: Optional[int] = None
    url: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    player: Optional[Player] = None
    week: Optional[Week] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Quick note schema for bookmarklet
class QuickNote(BaseModel):
    note: str = Field(..., min_length=1)
    url: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = "web"

# DraftKings Import schemas
class DraftKingsImportRequest(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    draft_group: str = Field(..., description="Draft Group ID from DraftKings")

class DraftKingsImportResponse(BaseModel):
    players_added: int = Field(..., ge=0, description="Number of new players added")
    players_updated: int = Field(..., ge=0, description="Number of existing players updated")
    entries_added: int = Field(..., ge=0, description="Number of new player pool entries added")
    entries_updated: int = Field(..., ge=0, description="Number of existing player pool entries updated")
    entries_skipped: int = Field(..., ge=0, description="Number of entries skipped due to duplicates")
    auto_excluded_count: int = Field(..., ge=0, description="Number of players auto-excluded due to zero/null projections")
    status_updates: int = Field(..., ge=0, description="Number of player status updates applied")
    errors: List[str] = Field(default=[], description="List of error messages")
    total_processed: int = Field(..., ge=0, description="Total number of draftables processed")

# Response schemas for common queries
class PlayerListResponse(BaseModel):
    players: List[Player]
    total: int
    page: int
    size: int

class LineupListResponse(BaseModel):
    lineups: List[LineupSimple]
    total: int
    page: int
    size: int

class TeamListResponse(BaseModel):
    teams: List[Team]
    total: int

class PlayerPoolResponse(BaseModel):
    entries: List[PlayerPoolEntry]
    total: int
    week_id: int

class WeekListResponse(BaseModel):
    weeks: List[Week]
    total: int

class WeekSimpleResponse(BaseModel):
    id: int
    week_number: int
    year: int
    start_date: date
    end_date: date
    game_count: int
    status: str
    notes: Optional[str] = None
    imported_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

class WeekListSimpleResponse(BaseModel):
    weeks: List[WeekSimpleResponse]
    total: int

# CSV Import specific schemas
class CSVRow(BaseModel):
    player_id: str
    name: str
    position: str
    team: str
    salary: int
    avg_points: Optional[float] = None
    game_info: Optional[str] = None
    roster_position: Optional[str] = None

class CSVImportResponse(BaseModel):
    success: bool
    message: str
    week_id: int  # Updated to Integer
    rows_processed: int
    rows_successful: int
    rows_failed: int
    errors: List[str] = []

# Lineup validation schemas
class LineupValidationRequest(BaseModel):
    week_id: int  # Updated to Integer
    slots: Dict[str, Optional[str]]

class LineupValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    salary_used: int
    salary_remaining: int
    projected_points: Optional[float] = None

# Optimization schemas
class DefaultPlayer(BaseModel):
    position: str
    playerId: int

class OptimizerSettings(BaseModel):
    salaryCap: int = Field(50000, ge=1000, le=100000)
    rosterSize: int = Field(9, ge=1, le=20)
    qbMin: int = Field(1, ge=0, le=3)
    rbMin: int = Field(2, ge=0, le=5)
    wrMin: int = Field(3, ge=0, le=5)
    teMin: int = Field(1, ge=0, le=3)
    dstMin: int = Field(1, ge=0, le=3)
    flexMin: int = Field(1, ge=0, le=5)
    maxPerTeam: Optional[int] = Field(None, ge=1, le=8)
    enforceQbStack: bool = Field(True)
    enforceBringback: bool = Field(False)
    defaultPlayers: List[DefaultPlayer] = Field(default_factory=list)

class OptimizedPlayer(BaseModel):
    playerDkId: int
    name: str
    team: str
    position: str
    salary: int
    projectedPoints: float

class OptimizationRequest(BaseModel):
    week_id: int
    settings: OptimizerSettings

class OptimizationResult(BaseModel):
    success: bool
    lineup: List[OptimizedPlayer] = []
    totalSalary: int = 0
    totalProjection: float = 0.0
    salaryCap: int = 50000
    weekId: int
    settings: OptimizerSettings
    error: Optional[str] = None

# Projection schemas
class ProjectionBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    playerDkId: int = Field(..., description="DraftKings player ID")
    position: str = Field(..., min_length=1, max_length=10, description="Position from CSV file")
    attemps: Optional[float] = Field(None, description="Attempts")
    comps: Optional[float] = Field(None, description="Completions")
    passYards: Optional[float] = Field(None, description="Pass Yards")
    passTDs: Optional[float] = Field(None, description="Pass TDs")
    ints: Optional[float] = Field(None, description="Interceptions")
    receptions: Optional[float] = Field(None, description="Receptions")
    recYards: Optional[float] = Field(None, description="Receiving Yards")
    recTDs: Optional[float] = Field(None, description="Receiving TDs")
    rushYards: Optional[float] = Field(None, description="Rushing Yards")
    rushTDs: Optional[float] = Field(None, description="Rushing TDs")
    fumbles: Optional[float] = Field(None, description="Fumbles")
    rank: Optional[int] = Field(None, description="Rank")
    pprProjections: Optional[float] = Field(None, description="PPR Projections")
    actuals: Optional[float] = Field(None, description="Actuals")
    source: str = Field(..., min_length=1, max_length=100, description="Source column as text value")

class ProjectionCreate(ProjectionBase):
    pass

class ProjectionUpdate(BaseModel):
    position: Optional[str] = Field(None, min_length=1, max_length=10)
    attemps: Optional[float] = None
    comps: Optional[float] = None
    passYards: Optional[float] = None
    passTDs: Optional[float] = None
    ints: Optional[float] = None
    receptions: Optional[float] = None
    recYards: Optional[float] = None
    recTDs: Optional[float] = None
    rushYards: Optional[float] = None
    rushTDs: Optional[float] = None
    fumbles: Optional[float] = None
    rank: Optional[int] = None
    pprProjections: Optional[float] = None
    actuals: Optional[float] = None
    source: Optional[str] = Field(None, min_length=1, max_length=100)

class Projection(ProjectionBase):
    id: int
    week: Week
    player: Player
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Projection import schemas
class ProjectionImportRequest(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    projection_source: str = Field(..., min_length=1, max_length=100, description="Source name for projections")
    csv_data: List[Dict[str, Any]] = Field(..., description="Parsed CSV data")

class ProjectionImportResponse(BaseModel):
    total_processed: int = Field(..., ge=0, description="Total number of records processed")
    successful_matches: int = Field(..., ge=0, description="Number of successful player matches")
    failed_matches: int = Field(..., ge=0, description="Number of failed player matches")
    projections_created: int = Field(..., ge=0, description="Number of new projections created")
    projections_updated: int = Field(..., ge=0, description="Number of existing projections updated")
    player_pool_updated: int = Field(..., ge=0, description="Number of player pool entries updated")
    errors: List[str] = Field(default=[], description="List of error messages")
    unmatched_players: List[Dict[str, Any]] = Field(default=[], description="List of unmatched players for manual review")

# Game schemas
class GameBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    team_id: int = Field(..., description="Team ID from teams table")
    opponent_team_id: Optional[int] = Field(None, description="Opponent team ID from teams table")
    homeoraway: str = Field(..., pattern="^[HAN]$", description="'H' for home, 'A' for away, 'N' for neutral site")
    start_time: Optional[datetime] = Field(None, description="Game start time")
    proj_spread: Optional[float] = Field(None, description="Projected spread (can be positive or negative)")
    proj_total: Optional[float] = Field(None, description="Projected total")
    implied_team_total: Optional[float] = Field(None, description="Implied team total")
    money_line: Optional[float] = Field(None, description="Money line")
    actual_spread: Optional[float] = Field(None, description="Actual spread")
    actual_total: Optional[float] = Field(None, description="Actual total")
    odds_api_gameid: Optional[str] = Field(None, max_length=50, description="Odds API game ID for external API integration")

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    opponent_team_id: Optional[int] = Field(None, description="Opponent team ID from teams table")
    homeoraway: Optional[str] = Field(None, pattern="^[HAN]$", description="'H' for home, 'A' for away, 'N' for neutral site")
    start_time: Optional[datetime] = Field(None, description="Game start time")
    proj_spread: Optional[float] = Field(None, description="Projected spread (can be positive or negative)")
    proj_total: Optional[float] = Field(None, description="Projected total")
    implied_team_total: Optional[float] = Field(None, description="Implied team total")
    money_line: Optional[float] = Field(None, description="Money line")
    actual_spread: Optional[float] = Field(None, description="Actual spread")
    actual_total: Optional[float] = Field(None, description="Actual total")
    odds_api_gameid: Optional[str] = Field(None, max_length=50, description="Odds API game ID for external API integration")

class Game(GameBase):
    id: int
    week: Week
    team: Team
    opponent_team: Optional[Team] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GameSimple(BaseModel):
    id: int
    week_id: int
    team_id: int
    opponent_team_id: Optional[int] = None
    homeoraway: str
    start_time: Optional[datetime] = None
    proj_spread: Optional[float] = None
    proj_total: Optional[float] = None
    implied_team_total: Optional[float] = None
    money_line: Optional[float] = None
    actual_spread: Optional[float] = None
    actual_total: Optional[float] = None
    odds_api_gameid: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GameListResponse(BaseModel):
    games: List[GameSimple]
    total: int
    week_id: int

# Analysis types for player pool joined with games
class WeekAnalysisData(BaseModel):
    opponent_abbr: Optional[str] = None
    homeoraway: Optional[str] = None
    proj_spread: Optional[float] = None
    proj_total: Optional[float] = None
    implied_team_total: Optional[float] = None

class PlayerPoolEntryWithAnalysis(BaseModel):
    entry: PlayerPoolEntry
    analysis: WeekAnalysisData

class PlayerPoolAnalysisResponse(BaseModel):
    entries: List[PlayerPoolEntryWithAnalysis]
    total: int
    week_id: int

# Player Prop Bets schemas
class PlayerPropBetBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    game_id: int = Field(..., description="Foreign key to games.id")
    bookmaker: Optional[str] = Field(None, max_length=100)
    market: Optional[str] = Field(None, max_length=100)
    outcome_name: Optional[str] = Field(None, max_length=200)
    outcome_description: Optional[str] = Field(None, max_length=500)
    playerDkId: int = Field(..., description="Foreign key to players.playerDkId")
    outcome_price: Optional[int] = None
    outcome_point: Optional[float] = None
    outcome_likelihood: Optional[float] = Field(None, ge=0, le=100, description="Percentage 0-100")
    updated_by: Optional[str] = Field("API", max_length=100)
    last_prop_update: Optional[datetime] = None

class PlayerPropBetCreate(PlayerPropBetBase):
    pass

class PlayerPropBetUpdate(BaseModel):
    bookmaker: Optional[str] = Field(None, max_length=100)
    market: Optional[str] = Field(None, max_length=100)
    outcome_name: Optional[str] = Field(None, max_length=200)
    outcome_description: Optional[str] = Field(None, max_length=500)
    outcome_price: Optional[int] = None
    outcome_point: Optional[float] = None
    outcome_likelihood: Optional[float] = Field(None, ge=0, le=100)
    updated_by: Optional[str] = Field(None, max_length=100)
    last_prop_update: Optional[datetime] = None

class PlayerPropBet(PlayerPropBetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Response schemas for Player Props enriched with opponent and week metadata
class PlayerPropBetWithMeta(BaseModel):
    week_number: int
    opponent: Optional[str] = None
    homeoraway: Optional[str] = None
    bookmaker: Optional[str] = None
    market: Optional[str] = None
    outcome_name: Optional[str] = None
    outcome_price: Optional[int] = None
    outcome_point: Optional[float] = None
    probability: Optional[float] = None
    updated: Optional[datetime] = None

class PlayerPropsResponse(BaseModel):
    props: List[PlayerPropBetWithMeta]
    total: int

# Player Actuals schemas
class PlayerActualsBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    playerDkId: int = Field(..., description="DraftKings player ID")
    team: str = Field(..., min_length=1, max_length=10, description="Team abbreviation from CSV")
    position: str = Field(..., min_length=1, max_length=10, description="Position from CSV")
    
    # Passing statistics
    completions: Optional[float] = Field(None, description="Completions")
    attempts: Optional[float] = Field(None, description="Attempts")
    pass_yds: Optional[float] = Field(None, description="Pass Yards")
    pass_tds: Optional[float] = Field(None, description="Pass TDs")
    interceptions: Optional[float] = Field(None, description="Interceptions")
    
    # Rushing statistics
    rush_att: Optional[float] = Field(None, description="Rush Attempts")
    rush_yds: Optional[float] = Field(None, description="Rush Yards")
    rush_tds: Optional[float] = Field(None, description="Rush TDs")
    
    # Receiving statistics
    rec_tgt: Optional[float] = Field(None, description="Receiving Targets")
    receptions: Optional[float] = Field(None, description="Receptions")
    rec_yds: Optional[float] = Field(None, description="Receiving Yards")
    rec_tds: Optional[float] = Field(None, description="Receiving TDs")
    
    # Other statistics
    fumbles: Optional[float] = Field(None, description="Fumbles")
    fumbles_lost: Optional[float] = Field(None, description="Fumbles Lost")
    total_tds: Optional[float] = Field(None, description="Total TDs")
    two_pt_md: Optional[float] = Field(None, description="2-Point Conversions Made")
    two_pt_pass: Optional[float] = Field(None, description="2-Point Conversion Passes")
    
    # Fantasy scoring and rankings
    dk_actuals: Optional[float] = Field(None, description="DraftKings actual points")
    vbd: Optional[float] = Field(None, description="Value Based Draft")
    pos_rank: Optional[int] = Field(None, description="Position rank")
    ov_rank: Optional[int] = Field(None, description="Overall rank")

class PlayerActualsCreate(PlayerActualsBase):
    pass

class PlayerActualsUpdate(BaseModel):
    team: Optional[str] = Field(None, min_length=1, max_length=10)
    position: Optional[str] = Field(None, min_length=1, max_length=10)
    completions: Optional[float] = None
    attempts: Optional[float] = None
    pass_yds: Optional[float] = None
    pass_tds: Optional[float] = None
    interceptions: Optional[float] = None
    rush_att: Optional[float] = None
    rush_yds: Optional[float] = None
    rush_tds: Optional[float] = None
    rec_tgt: Optional[float] = None
    receptions: Optional[float] = None
    rec_yds: Optional[float] = None
    rec_tds: Optional[float] = None
    fumbles: Optional[float] = None
    fumbles_lost: Optional[float] = None
    total_tds: Optional[float] = None
    two_pt_md: Optional[float] = None
    two_pt_pass: Optional[float] = None
    dk_actuals: Optional[float] = None
    vbd: Optional[float] = None
    pos_rank: Optional[int] = None
    ov_rank: Optional[int] = None

class PlayerActuals(PlayerActualsBase):
    id: int
    week: Week
    player: Player
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Player Actuals import schemas
class PlayerActualsImportRequest(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    csv_data: List[Dict[str, Any]] = Field(..., description="Parsed CSV data")

class PlayerActualsImportResponse(BaseModel):
    total_processed: int = Field(..., ge=0, description="Total number of records processed")
    successful_matches: int = Field(..., ge=0, description="Number of successful player matches")
    failed_matches: int = Field(..., ge=0, description="Number of failed player matches")
    actuals_created: int = Field(..., ge=0, description="Number of new actuals created")
    actuals_updated: int = Field(..., ge=0, description="Number of existing actuals updated")
    errors: List[str] = Field(default=[], description="List of error messages")
    unmatched_players: List[Dict[str, Any]] = Field(default=[], description="List of unmatched players for manual review")

class PlayerActualsListResponse(BaseModel):
    actuals: List[PlayerActuals]
    total: int
    week_id: int

# Tips Configuration schemas
class TipsConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None)
    is_active: bool = Field(default=True)
    configuration_data: str = Field(..., description="JSON string containing tips configuration")

class TipsConfigCreate(TipsConfigBase):
    pass

class TipsConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    configuration_data: Optional[str] = Field(None, description="JSON string containing tips configuration")

class TipsConfigResponse(TipsConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Contest Roster Details schemas
class ContestRosterDetailsBase(BaseModel):
    draftgroup: Optional[int] = Field(None, description="Draft Group ID")
    contest_id: int = Field(..., description="Contest ID from DraftKings")
    enter_key: int = Field(..., description="Entry key from DraftKings")
    username: str = Field(..., min_length=1, max_length=255, description="Opponent username")
    fantasy_points: float = Field(..., ge=0, description="Total fantasy points scored")
    
    # Player positions and scores
    qb_name: Optional[str] = Field(None, max_length=255, description="Quarterback name")
    qb_score: Optional[float] = Field(None, ge=0, description="Quarterback fantasy points")
    rb1_name: Optional[str] = Field(None, max_length=255, description="Running back 1 name")
    rb1_score: Optional[float] = Field(None, ge=0, description="Running back 1 fantasy points")
    rb2_name: Optional[str] = Field(None, max_length=255, description="Running back 2 name")
    rb2_score: Optional[float] = Field(None, ge=0, description="Running back 2 fantasy points")
    wr1_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 1 name")
    wr1_score: Optional[float] = Field(None, ge=0, description="Wide receiver 1 fantasy points")
    wr2_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 2 name")
    wr2_score: Optional[float] = Field(None, ge=0, description="Wide receiver 2 fantasy points")
    wr3_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 3 name")
    wr3_score: Optional[float] = Field(None, ge=0, description="Wide receiver 3 fantasy points")
    te_name: Optional[str] = Field(None, max_length=255, description="Tight end name")
    te_score: Optional[float] = Field(None, ge=0, description="Tight end fantasy points")
    flex_name: Optional[str] = Field(None, max_length=255, description="Flex position name")
    flex_score: Optional[float] = Field(None, ge=0, description="Flex position fantasy points")
    dst_name: Optional[str] = Field(None, max_length=255, description="Defense/Special teams name")
    dst_score: Optional[float] = Field(None, ge=0, description="Defense/Special teams fantasy points")
    
    # JSON data for flexibility
    contest_json: Optional[Dict[str, Any]] = Field(None, description="Complete contest and roster data as JSON")

class ContestRosterDetailsCreate(ContestRosterDetailsBase):
    pass

class ContestRosterDetailsUpdate(BaseModel):
    draftgroup: Optional[int] = Field(None, description="Draft Group ID")
    contest_id: Optional[int] = Field(None, description="Contest ID from DraftKings")
    enter_key: Optional[int] = Field(None, description="Entry key from DraftKings")
    username: Optional[str] = Field(None, min_length=1, max_length=255, description="Opponent username")
    fantasy_points: Optional[float] = Field(None, ge=0, description="Total fantasy points scored")
    
    # Player positions and scores
    qb_name: Optional[str] = Field(None, max_length=255, description="Quarterback name")
    qb_score: Optional[float] = Field(None, ge=0, description="Quarterback fantasy points")
    rb1_name: Optional[str] = Field(None, max_length=255, description="Running back 1 name")
    rb1_score: Optional[float] = Field(None, ge=0, description="Running back 1 fantasy points")
    rb2_name: Optional[str] = Field(None, max_length=255, description="Running back 2 name")
    rb2_score: Optional[float] = Field(None, ge=0, description="Running back 2 fantasy points")
    wr1_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 1 name")
    wr1_score: Optional[float] = Field(None, ge=0, description="Wide receiver 1 fantasy points")
    wr2_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 2 name")
    wr2_score: Optional[float] = Field(None, ge=0, description="Wide receiver 2 fantasy points")
    wr3_name: Optional[str] = Field(None, max_length=255, description="Wide receiver 3 name")
    wr3_score: Optional[float] = Field(None, ge=0, description="Wide receiver 3 fantasy points")
    te_name: Optional[str] = Field(None, max_length=255, description="Tight end name")
    te_score: Optional[float] = Field(None, ge=0, description="Tight end fantasy points")
    flex_name: Optional[str] = Field(None, max_length=255, description="Flex position name")
    flex_score: Optional[float] = Field(None, ge=0, description="Flex position fantasy points")
    dst_name: Optional[str] = Field(None, max_length=255, description="Defense/Special teams name")
    dst_score: Optional[float] = Field(None, ge=0, description="Defense/Special teams fantasy points")
    
    # JSON data for flexibility
    contest_json: Optional[Dict[str, Any]] = Field(None, description="Complete contest and roster data as JSON")

class ContestRosterDetails(ContestRosterDetailsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ContestRosterDetailsSimple(BaseModel):
    """Simplified version for list responses"""
    id: int
    contest_id: int
    enter_key: int
    username: str
    fantasy_points: float
    qb_name: Optional[str] = None
    qb_score: Optional[float] = None
    rb1_name: Optional[str] = None
    rb1_score: Optional[float] = None
    rb2_name: Optional[str] = None
    rb2_score: Optional[float] = None
    wr1_name: Optional[str] = None
    wr1_score: Optional[float] = None
    wr2_name: Optional[str] = None
    wr2_score: Optional[float] = None
    wr3_name: Optional[str] = None
    wr3_score: Optional[float] = None
    te_name: Optional[str] = None
    te_score: Optional[float] = None
    flex_name: Optional[str] = None
    flex_score: Optional[float] = None
    dst_name: Optional[str] = None
    dst_score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ContestRosterDetailsListResponse(BaseModel):
    """Response schema for listing contest roster details"""
    rosters: List[ContestRosterDetailsSimple]
    total: int
    contest_id: int

class ContestRosterDetailsResponse(BaseModel):
    """Response schema for individual contest roster details"""
    success: bool
    message: str
    roster: Optional[ContestRosterDetails] = None
    error: Optional[str] = None
