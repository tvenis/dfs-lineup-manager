from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date

# Base schemas
class TeamBase(BaseModel):
    id: str = Field(..., min_length=1, max_length=10)  # e.g., 'NE', 'DAL'
    name: str = Field(..., min_length=1, max_length=100)  # full team name
    abbreviation: str = Field(..., min_length=1, max_length=10)  # short code

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    abbreviation: Optional[str] = Field(None, min_length=1, max_length=10)

class Team(TeamBase):
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
