from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Index, CheckConstraint, Numeric, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
from app.database import Base, DATABASE_URL
import json

# Since we're using PostgreSQL everywhere, we can use native JSON
# No need for custom JSONString type anymore

class Sport(Base):
    __tablename__ = "sport"
    
    sport_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String)

class ContestType(Base):
    __tablename__ = "contest_type"
    
    contest_type_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False)

class GameType(Base):
    __tablename__ = "game_type"
    
    game_type_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False)

class Contest(Base):
    __tablename__ = "contest"
    
    entry_key = Column(BigInteger, primary_key=True)  # Unique per entry: maps to Entry_Key
    contest_id = Column(BigInteger)  # Contest_Key (can repeat across entries)
    week_id = Column(Integer, ForeignKey("weeks.id"))  # Passed from UI, optional
    sport_id = Column(Integer, ForeignKey("sport.sport_id"), nullable=False)
    lineup_id = Column(String(50), ForeignKey("lineups.id"))  # Nullable
    game_type_id = Column(Integer, ForeignKey("game_type.game_type_id"), nullable=False)
    contest_type_id = Column(Integer, ForeignKey("contest_type.contest_type_id"))
    contest_description = Column(String(500))  # maps to Entry column
    contest_opponent = Column(String(200))
    contest_date_utc = Column(DateTime(timezone=True), nullable=False)
    contest_place = Column(Integer)
    contest_points = Column(Float)
    winnings_non_ticket = Column(Numeric(12, 2))
    winnings_ticket = Column(Numeric(12, 2))
    contest_entries = Column(Integer, nullable=False)
    places_paid = Column(Integer, nullable=False)
    entry_fee_usd = Column(Numeric(12, 2), nullable=False)
    prize_pool_usd = Column(Numeric(12, 2), nullable=False)
    net_profit_usd = Column(Numeric(12, 2), nullable=False)
    result = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    week = relationship("Week")
    sport = relationship("Sport")
    lineup = relationship("Lineup")
    game_type = relationship("GameType")
    contest_type = relationship("ContestType")

    # Constraints
    __table_args__ = (
        Index('idx_contest_week', 'week_id'),
        Index('idx_contest_sport', 'sport_id'),
        Index('idx_contest_game_type', 'game_type_id'),
        Index('idx_contest_contest_type', 'contest_type_id'),
        Index('idx_contest_contest_id', 'contest_id'),
        CheckConstraint('contest_entries > 0', name='ck_contest_entries_positive'),
        CheckConstraint('places_paid >= 0', name='ck_places_paid_nonnegative'),
        CheckConstraint('entry_fee_usd >= 0', name='ck_entry_fee_nonnegative'),
        CheckConstraint('prize_pool_usd >= 0', name='ck_prize_pool_nonnegative'),
    )

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # sequential integer starting at 1
    full_name = Column(String(100), nullable=False)  # full team name
    abbreviation = Column(String(10), unique=True)  # short code (nullable)
    mascot = Column(String(50))  # team mascot/category
    logo = Column(String(500))  # URL to team logo
    division = Column(String(50))  # team division
    conference = Column(String(50))  # team conference
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    odds_api_id = Column(String(50))  # Odds API team ID for external API integration

class Player(Base):
    __tablename__ = "players"
    
    playerDkId = Column(Integer, primary_key=True)  # DraftKings player ID (unique key)
    firstName = Column(String(100), nullable=False)
    lastName = Column(String(100), nullable=False)
    displayName = Column(String(100), nullable=False)
    shortName = Column(String(50))
    position = Column(String(10), nullable=False)  # 'QB' | 'RB' | 'WR' | 'TE' | 'DST'
    team = Column(String(10), ForeignKey("teams.abbreviation"), nullable=False)  # team abbreviation
    team_id = Column(Integer, ForeignKey("teams.id"))  # traditional FK to teams.id
    playerImage50 = Column(String(500))  # URL to 50x50 player image
    playerImage160 = Column(String(500))  # URL to 160x160 player image
    hidden = Column(Boolean, default=False)  # Whether to hide player from Player Profile list
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    pool_entries = relationship("PlayerPoolEntry", back_populates="player")

class Week(Base):
    __tablename__ = "weeks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # sequential integer starting at 1
    week_number = Column(Integer, nullable=False)  # e.g., 1, 2, 3, etc.
    year = Column(Integer, nullable=False)  # e.g., 2024, 2025
    start_date = Column(Date, nullable=False)  # start of the week
    end_date = Column(Date, nullable=False)  # end of the week
    game_count = Column(Integer, default=0)  # number of games in this week
    status = Column(String(20), default="Upcoming")  # 'Completed', 'Active', 'Upcoming'
    notes = Column(Text)  # optional, week-specific notes
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lineups = relationship("Lineup", back_populates="week")
    player_pool_entries = relationship("PlayerPoolEntry", back_populates="week")
    recent_activities = relationship("RecentActivity", back_populates="week")
    draftgroups = relationship("DraftGroup", back_populates="week")

class DraftGroup(Base):
    __tablename__ = "draftgroups"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    draftGroup = Column(Integer, nullable=False)  # Draft Group ID
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Foreign key to weeks table
    draftGroup_description = Column(String(255))  # Description of the draft group
    games = Column(Integer, default=0)  # Number of games in this draft group
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week", back_populates="draftgroups")
    
    # Constraints
    __table_args__ = (
        Index('idx_draftgroups_week_id', 'week_id'),
        Index('idx_draftgroups_draftgroup', 'draftGroup'),
        Index('idx_draftgroups_unique', 'draftGroup', 'week_id', unique=True),
    )

class PlayerPoolEntry(Base):
    __tablename__ = "player_pool_entries"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Foreign key to weeks table
    draftGroup = Column(String(20), nullable=False)  # Draft Group ID from DraftKings
    playerDkId = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    draftableId = Column(String(50))  # DraftKings draftable ID for this player pool entry
    projectedPoints = Column(Float)  # Extracted projection value from draftStatAttributes
    actuals = Column(Float)
    salary = Column(Integer, nullable=False)  # from DraftKings API
    status = Column(String(20), default="Available")  # player status
    isDisabled = Column(Boolean, default=False)  # if player is disabled
    excluded = Column(Boolean, default=False)  # if player is excluded from this week
    tier = Column(Integer, default=4)  # DFS tier: 1=Core/Cash, 2=Strong Plays, 3=GPP/Ceiling, 4=Avoids/Thin
    playerGameHash = Column(String(100))  # game identifier hash
    
    # JSON blobs for complex DraftKings data
    competitions = Column(JSON)  # competition details
    draftStatAttributes = Column(JSON)  # draft statistics
    playerAttributes = Column(JSON)  # player attributes
    teamLeagueSeasonAttributes = Column(JSON)  # team/league/season data
    playerGameAttributes = Column(JSON)  # game-specific attributes
    draftAlerts = Column(JSON)  # draft alerts
    externalRequirements = Column(JSON)  # external requirements
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    player = relationship("Player", back_populates="pool_entries")
    week = relationship("Week")
    
    # Composite unique index on (week_id, draftGroup, playerDkId)
    __table_args__ = (
        Index('idx_week_draftgroup_player', 'week_id', 'draftGroup', 'playerDkId', unique=True),
    )

class RecentActivity(Base):
    __tablename__ = "recent_activity"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    action = Column(String(20), nullable=False)  # 'import' | 'export'
    fileType = Column(String(20), nullable=False)  # 'API' | 'CSV'
    fileName = Column(String(200))  # nullable, filename if applicable
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Foreign key to weeks table
    draftGroup = Column(String(30), nullable=False)  # draft group ID
    recordsAdded = Column(Integer, default=0)  # count of records added
    recordsUpdated = Column(Integer, default=0)  # count of records updated
    recordsSkipped = Column(Integer, default=0)  # count of records skipped
    errors = Column(JSON)  # error details as JSON
    user_name = Column(String(100))  # optional user identifier (renamed from 'user' to avoid PostgreSQL reserved keyword)
    details = Column(JSON)  # additional details as JSON
    
    # Relationships
    week = relationship("Week")
    
    def __init__(self, **kwargs):
        # Handle legacy 'user' parameter by mapping it to 'user_name'
        if 'user' in kwargs:
            kwargs['user_name'] = kwargs.pop('user')
        super().__init__(**kwargs)

class Lineup(Base):
    __tablename__ = "lineups"
    
    id = Column(String(50), primary_key=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Updated to Integer
    name = Column(String(200), nullable=False)
    tags = Column(JSON)  # string[] (free-form labels)
    game_style = Column(String(50))  # e.g., 'Classic', 'Showdown', etc.
    slots = Column(JSON, nullable=False)  # QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerId
    status = Column(String(20), default="created")  # 'created' | 'exported' | 'uploaded' | 'submitted'
    salary_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week", back_populates="lineups")

class Projection(Base):
    __tablename__ = "projections"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)
    playerDkId = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    position = Column(String(10), nullable=False)  # Position from CSV file
    # New projection detail columns mapped from CSV
    attemps = Column(Float)  # Attempts (intentional spelling per spec)
    comps = Column(Float)  # Completions
    passYards = Column(Float)  # Pass Yards
    passTDs = Column(Float)  # Pass TDs
    ints = Column(Float)  # Interceptions
    receptions = Column(Float)  # Receptions
    recYards = Column(Float)  # Receiving Yards
    recTDs = Column(Float)  # Receiving TDs
    rushYards = Column(Float)  # Rushing Yards
    rushTDs = Column(Float)  # Rushing TDs
    fumbles = Column(Float)  # Fumbles
    rank = Column(Integer)  # Rank
    pprProjections = Column(Float)  # PPR Projections from CSV 'Projections'
    actuals = Column(Float)  # Actuals
    source = Column(String(100), nullable=False)  # Source column as text value
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week")
    player = relationship("Player")
    
    # Composite unique index on (week_id, playerDkId, source) for upserts
    __table_args__ = (
        Index('idx_week_player_source', 'week_id', 'playerDkId', 'source', unique=True),
    )

class Game(Base):
    __tablename__ = "games"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # unique sequential integer starting at 1
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # foreign key to week table
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)  # foreign key to teams table
    opponent_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)  # foreign key to opponent team
    homeoraway = Column(String(1), nullable=False)  # 'H' for home, 'A' for away, 'N' for neutral site
    start_time = Column(DateTime(timezone=True))  # game start time
    proj_spread = Column(Float)  # projected spread (can be positive or negative)
    proj_total = Column(Float)  # projected total
    implied_team_total = Column(Float)  # implied team total
    money_line = Column(Float)  # money line
    actual_spread = Column(Float)  # actual spread
    actual_total = Column(Float)  # actual total
    odds_api_gameid = Column(String(50))  # Odds API game ID for external API integration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week")
    team = relationship("Team", foreign_keys=[team_id])
    opponent_team = relationship("Team", foreign_keys=[opponent_team_id])
    
    # Constraints
    __table_args__ = (
        Index('idx_week_team', 'week_id', 'team_id', unique=True),  # Each team can only have one game per week
    )

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(50), primary_key=True)
    player_id = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    content = Column(Text, nullable=False)  # rich text, HTML/Markdown
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    player = relationship("Player")

class PlayerPropBet(Base):
    __tablename__ = "player_prop_bets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    bookmaker = Column(String(100))
    market = Column(String(100))  # Note: originally specified as 'maket'
    outcome_name = Column(String(200))
    outcome_description = Column(String(500))
    playerDkId = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    outcome_price = Column(Integer)
    outcome_point = Column(Float)
    outcome_likelihood = Column(Float)  # percentage value (e.g., 62.5 for 62.5%)
    updated_by = Column(String(100), default="API")
    last_prop_update = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week")
    game = relationship("Game")
    player = relationship("Player")
    
    # Indexes for common lookup patterns
    __table_args__ = (
        Index('ux_prop_bets_unique', 'week_id', 'game_id', 'bookmaker', 'market', 'outcome_name', 'playerDkId', 'outcome_point', unique=True),
    )

class DKContestDetail(Base):
    __tablename__ = "dk_contest_detail"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    contest_id = Column(String(50), nullable=False)  # maps to Contest_Key from file
    name = Column(String(250))
    sport_id = Column(Integer, ForeignKey("sport.sport_id"))
    contest_type_id = Column(Integer, ForeignKey("contest_type.contest_type_id"))
    summary = Column(Text)
    draftGroupId = Column(Integer)
    payoutDescription = Column(Text)
    rake_percentage = Column(Float)  # ((max_entries*entry_fee)-total_payouts)/total_payouts
    total_payouts = Column(Numeric(12, 2))
    is_guaranteed = Column(Boolean)
    is_private = Column(Boolean)
    is_cashprize_only = Column(Boolean)
    entry_fee = Column(Numeric(12, 2))
    entries = Column(Integer)
    max_entries = Column(Integer)
    max_entries_per_user = Column(Integer)
    contest_state = Column(String(50))
    contest_start_time = Column(DateTime(timezone=True))
    attributes = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_dkdetail_contest_id', 'contest_id', unique=True),
        Index('idx_dkdetail_sport', 'sport_id'),
        Index('idx_dkdetail_contest_type', 'contest_type_id'),
    )

class PlayerActuals(Base):
    __tablename__ = "player_actuals"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)
    playerDkId = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    team = Column(String(10), nullable=False)  # Team abbreviation from CSV
    position = Column(String(10), nullable=False)  # Position from CSV
    
    # Passing statistics
    completions = Column(Float)
    attempts = Column(Float)
    pass_yds = Column(Float)
    pass_tds = Column(Float)
    interceptions = Column(Float)
    
    # Rushing statistics
    rush_att = Column(Float)
    rush_yds = Column(Float)
    rush_tds = Column(Float)
    
    # Receiving statistics
    rec_tgt = Column(Float)
    receptions = Column(Float)
    rec_yds = Column(Float)
    rec_tds = Column(Float)
    
    # Other statistics
    fumbles = Column(Float)
    fumbles_lost = Column(Float)
    total_tds = Column(Float)
    two_pt_md = Column(Float)
    two_pt_pass = Column(Float)
    
    # Fantasy scoring and rankings
    dk_actuals = Column(Float)  # DraftKings actual points
    vbd = Column(Float)  # Value Based Draft
    pos_rank = Column(Integer)  # Position rank
    ov_rank = Column(Integer)  # Overall rank
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week")
    player = relationship("Player")
    
    # Composite unique index on (week_id, playerDkId) for upserts
    __table_args__ = (
        Index('idx_player_actuals_week_player', 'week_id', 'playerDkId', unique=True),
        Index('idx_player_actuals_week', 'week_id'),
        Index('idx_player_actuals_player', 'playerDkId'),
    )

class TipsConfiguration(Base):
    __tablename__ = "tips_configuration"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, default="Default")
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    configuration_data = Column(Text, nullable=False)  # JSON stored as TEXT for SQLite compatibility
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes for common lookup patterns
    __table_args__ = (
        Index('idx_tips_config_active', 'is_active'),
        Index('idx_tips_config_name', 'name'),
    )


class ScrapedData(Base):
    """Model for storing scraped data from Firecrawl API"""
    __tablename__ = "scraped_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(2000), nullable=False)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    raw_data = Column(JSON, nullable=False)  # The actual scraped JSON data
    metadata = Column(JSON)  # Firecrawl metadata (title, description, etc.)
    processing_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    processing_error = Column(Text)  # Error message if processing failed
    import_program_used = Column(String(100))  # Name of the import program that processed this data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes for common lookup patterns
    __table_args__ = (
        Index('idx_scraped_data_url', 'url'),
        Index('idx_scraped_data_scraped_at', 'scraped_at'),
        Index('idx_scraped_data_status', 'processing_status'),
        Index('idx_scraped_data_import_program', 'import_program_used'),
    )


class ScrapingJob(Base):
    """Model for tracking scraping jobs and batch operations"""
    __tablename__ = "scraping_jobs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_name = Column(String(200), nullable=False)
    job_type = Column(String(50), nullable=False)  # single, batch, scheduled
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    total_urls = Column(Integer, default=0)
    completed_urls = Column(Integer, default=0)
    failed_urls = Column(Integer, default=0)
    schema_used = Column(String(200))  # Name of schema or prompt used
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes for common lookup patterns
    __table_args__ = (
        Index('idx_scraping_jobs_status', 'status'),
        Index('idx_scraping_jobs_type', 'job_type'),
        Index('idx_scraping_jobs_created_at', 'created_at'),
    )


class ScrapingJobUrl(Base):
    """Model for tracking individual URLs within a scraping job"""
    __tablename__ = "scraping_job_urls"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("scraping_jobs.id"), nullable=False)
    url = Column(String(2000), nullable=False)
    status = Column(String(50), default="pending")  # pending, completed, failed
    scraped_data_id = Column(Integer, ForeignKey("scraped_data.id"))  # Link to scraped data
    error_message = Column(Text)
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    job = relationship("ScrapingJob")
    scraped_data = relationship("ScrapedData")
    
    # Indexes for common lookup patterns
    __table_args__ = (
        Index('idx_scraping_job_urls_job_id', 'job_id'),
        Index('idx_scraping_job_urls_status', 'status'),
        Index('idx_scraping_job_urls_scraped_data_id', 'scraped_data_id'),
    )
