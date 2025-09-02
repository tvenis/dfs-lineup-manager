from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
from app.database import Base
import json

class JSONString(TypeDecorator):
    """Custom JSON type for SQLite compatibility"""
    impl = String
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None
    
    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(String(10), primary_key=True)  # e.g., 'NE', 'DAL'
    name = Column(String(100), nullable=False)  # full team name
    abbreviation = Column(String(10), nullable=False, unique=True)  # short code
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Player(Base):
    __tablename__ = "players"
    
    playerDkId = Column(Integer, primary_key=True)  # DraftKings player ID (unique key)
    firstName = Column(String(100), nullable=False)
    lastName = Column(String(100), nullable=False)
    displayName = Column(String(100), nullable=False)
    shortName = Column(String(50))
    position = Column(String(10), nullable=False)  # 'QB' | 'RB' | 'WR' | 'TE' | 'DST'
    team = Column(String(10), ForeignKey("teams.abbreviation"), nullable=False)  # team abbreviation
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

class PlayerPoolEntry(Base):
    __tablename__ = "player_pool_entries"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Foreign key to weeks table
    draftGroup = Column(String(20), nullable=False)  # Draft Group ID from DraftKings
    playerDkId = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    draftableId = Column(String(50))  # DraftKings draftable ID for this player pool entry
    projectedPoints = Column(Float)  # Extracted projection value from draftStatAttributes
    salary = Column(Integer, nullable=False)  # from DraftKings API
    status = Column(String(20), default="Available")  # player status
    isDisabled = Column(Boolean, default=False)  # if player is disabled
    excluded = Column(Boolean, default=False)  # if player is excluded from this week
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
    draftGroup = Column(String(20), nullable=False)  # draft group ID
    recordsAdded = Column(Integer, default=0)  # count of records added
    recordsUpdated = Column(Integer, default=0)  # count of records updated
    recordsSkipped = Column(Integer, default=0)  # count of records skipped
    errors = Column(JSON)  # error details as JSON
    user = Column(String(100))  # optional user identifier
    details = Column(JSON)  # additional details as JSON
    
    # Relationships
    week = relationship("Week")

class Lineup(Base):
    __tablename__ = "lineups"
    
    id = Column(String(50), primary_key=True)
    week_id = Column(Integer, ForeignKey("weeks.id"), nullable=False)  # Updated to Integer
    name = Column(String(200), nullable=False)
    tags = Column(JSONString)  # string[] (free-form labels) - using custom JSON type
    game_style = Column(String(50))  # e.g., 'Classic', 'Showdown', etc.
    slots = Column(JSONString, nullable=False)  # QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST; each references playerId - using custom JSON type
    salary_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    week = relationship("Week", back_populates="lineups")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(50), primary_key=True)
    player_id = Column(Integer, ForeignKey("players.playerDkId"), nullable=False)
    content = Column(Text, nullable=False)  # rich text, HTML/Markdown
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    player = relationship("Player")
