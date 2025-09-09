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

class PlayerPoolEntryBase(BaseModel):
    week_id: int = Field(..., description="Week ID from weeks table")
    draftGroup: str = Field(..., description="Draft Group ID from DraftKings")
    playerDkId: int = Field(..., description="DraftKings player ID")
    draftableId: Optional[str] = Field(None, max_length=50, description="DraftKings draftable ID for this player pool entry")
    projectedPoints: Optional[float] = Field(None, description="Extracted projection value from draftStatAttributes")
    salary: int = Field(..., gt=0, description="Player salary from DraftKings")
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
    salary: Optional[int] = Field(None, gt=0)
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
    timestamp: datetime
    action: str = Field(..., pattern="^(import|export)$")
    fileType: str = Field(..., pattern="^(API|CSV)$")
    fileName: Optional[str] = Field(None, max_length=200)
    week_id: int = Field(..., description="Week ID from weeks table")
    draftGroup: str = Field(..., max_length=20)
    recordsAdded: int = Field(default=0, ge=0)
    recordsUpdated: int = Field(default=0, ge=0)
    recordsSkipped: int = Field(default=0, ge=0)
    errors: List[str] = Field(default_factory=list)
    user: Optional[str] = Field(None, max_length=100)
    details: Optional[Dict[str, Any]] = None

class RecentActivity(RecentActivityBase):
    id: int
    week: Week
    
    class Config:
        from_attributes = True

class LineupBase(BaseModel):
    week_id: int = Field(..., gt=0)  # Updated to Integer
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])  # string[] (free-form labels)
    game_style: Optional[str] = Field(None, max_length=50)  # e.g., 'Classic', 'Showdown', etc.
    slots: Dict[str, Optional[int]] = Field(..., description="QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerDkId")
    salary_used: int = Field(default=0)

class LineupCreate(BaseModel):
    week_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=200)
    tags: List[str] = Field(default=[])
    game_style: Optional[str] = Field(None, max_length=50)
    slots: Dict[str, Optional[int]] = Field(..., description="QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerDkId")

class LineupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    tags: Optional[List[str]] = None
    game_style: Optional[str] = Field(None, max_length=50)
    slots: Optional[Dict[str, Optional[str]]] = None
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
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    id: str = Field(..., min_length=1, max_length=50)
    player_id: str = Field(..., min_length=1, max_length=50)
    content: str = Field(..., min_length=1)  # rich text, HTML/Markdown

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class Comment(CommentBase):
    player: Player
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

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
