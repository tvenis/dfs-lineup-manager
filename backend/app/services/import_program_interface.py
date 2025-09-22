"""
Import Program Interface for DFS App

This module provides a standardized interface for processing scraped JSON data
from Firecrawl and integrating it with the existing DFS database models.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import ScrapedData, ScrapingJob, ScrapingJobUrl
from ..database import get_db

logger = logging.getLogger(__name__)


class ImportProgram(ABC):
    """
    Abstract base class for import programs that process scraped data.
    
    Each import program should inherit from this class and implement
    the process_data method to handle specific types of scraped data.
    """
    
    def __init__(self, program_name: str):
        """
        Initialize the import program.
        
        Args:
            program_name: Unique name for this import program
        """
        self.program_name = program_name
        self.logger = logging.getLogger(f"{__name__}.{program_name}")
    
    @abstractmethod
    def process_data(
        self, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process scraped JSON data and integrate it with the database.
        
        Args:
            json_data: The scraped JSON data to process
            metadata: Additional metadata from the scraping process
            scraped_data_id: ID of the ScrapedData record in the database
            db_session: Database session for database operations
            
        Returns:
            True if processing was successful, False otherwise
        """
        pass
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        """
        Validate that the JSON data contains expected fields.
        Override this method in subclasses for specific validation.
        
        Args:
            json_data: The JSON data to validate
            
        Returns:
            True if data is valid, False otherwise
        """
        return isinstance(json_data, dict) and len(json_data) > 0
    
    def log_processing_result(
        self, 
        scraped_data_id: int, 
        success: bool, 
        error_message: Optional[str] = None,
        db_session: Optional[Session] = None
    ):
        """
        Log the processing result to the database.
        
        Args:
            scraped_data_id: ID of the ScrapedData record
            success: Whether processing was successful
            error_message: Error message if processing failed
            db_session: Database session
        """
        if not db_session:
            return
        
        try:
            scraped_data = db_session.query(ScrapedData).filter(
                ScrapedData.id == scraped_data_id
            ).first()
            
            if scraped_data:
                scraped_data.processing_status = "completed" if success else "failed"
                scraped_data.processing_error = error_message
                scraped_data.import_program_used = self.program_name
                scraped_data.updated_at = datetime.utcnow()
                db_session.commit()
                
                self.logger.info(f"Updated processing status for scraped_data_id {scraped_data_id}: {scraped_data.processing_status}")
            
        except Exception as e:
            self.logger.error(f"Error updating processing status: {e}")
            db_session.rollback()


class PlayerDataImportProgram(ImportProgram):
    """
    Import program for processing player data scraped from web pages.
    """
    
    def __init__(self):
        super().__init__("player_data_import")
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        """Validate player data has required fields."""
        required_fields = ["player_name"]
        return all(field in json_data for field in required_fields)
    
    def process_data(
        self, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process player data and integrate with existing Player models.
        
        This is a placeholder implementation. You would need to:
        1. Map the scraped data to your existing Player model fields
        2. Check for existing players and update or create as needed
        3. Handle any related data (team, position, etc.)
        """
        try:
            if not self.validate_data(json_data):
                error_msg = "Invalid player data: missing required fields"
                self.logger.error(error_msg)
                if scraped_data_id and db_session:
                    self.log_processing_result(scraped_data_id, False, error_msg, db_session)
                return False
            
            self.logger.info(f"Processing player data for: {json_data.get('player_name')}")
            
            # TODO: Implement actual player data processing
            # Example:
            # 1. Check if player exists in database
            # 2. Update existing player or create new one
            # 3. Handle related data (team, position, salary, etc.)
            # 4. Update projections or other DFS-specific data
            
            # Placeholder processing
            player_name = json_data.get("player_name")
            position = json_data.get("position")
            team = json_data.get("team")
            salary = json_data.get("salary")
            projected_points = json_data.get("projected_points")
            
            self.logger.info(f"Processed player: {player_name}, Position: {position}, Team: {team}")
            
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, True, None, db_session)
            
            return True
            
        except Exception as e:
            error_msg = f"Error processing player data: {str(e)}"
            self.logger.error(error_msg)
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, False, error_msg, db_session)
            return False


class ContestDataImportProgram(ImportProgram):
    """
    Import program for processing contest data scraped from web pages.
    """
    
    def __init__(self):
        super().__init__("contest_data_import")
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        """Validate contest data has required fields."""
        required_fields = ["contest_name"]
        return all(field in json_data for field in required_fields)
    
    def process_data(
        self, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process contest data and integrate with existing Contest models.
        """
        try:
            if not self.validate_data(json_data):
                error_msg = "Invalid contest data: missing required fields"
                self.logger.error(error_msg)
                if scraped_data_id and db_session:
                    self.log_processing_result(scraped_data_id, False, error_msg, db_session)
                return False
            
            self.logger.info(f"Processing contest data for: {json_data.get('contest_name')}")
            
            # TODO: Implement actual contest data processing
            # Example:
            # 1. Check if contest exists in database
            # 2. Update existing contest or create new one
            # 3. Handle contest type, game type, sport relationships
            # 4. Update prize pool, entry fee, etc.
            
            contest_name = json_data.get("contest_name")
            entry_fee = json_data.get("entry_fee")
            total_prizes = json_data.get("total_prizes")
            contest_type = json_data.get("contest_type")
            
            self.logger.info(f"Processed contest: {contest_name}, Entry Fee: {entry_fee}, Prizes: {total_prizes}")
            
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, True, None, db_session)
            
            return True
            
        except Exception as e:
            error_msg = f"Error processing contest data: {str(e)}"
            self.logger.error(error_msg)
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, False, error_msg, db_session)
            return False


class NewsDataImportProgram(ImportProgram):
    """
    Import program for processing news data scraped from web pages.
    """
    
    def __init__(self):
        super().__init__("news_data_import")
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        """Validate news data has required fields."""
        required_fields = ["headline", "content"]
        return all(field in json_data for field in required_fields)
    
    def process_data(
        self, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process news data and potentially store it for DFS analysis.
        """
        try:
            if not self.validate_data(json_data):
                error_msg = "Invalid news data: missing required fields"
                self.logger.error(error_msg)
                if scraped_data_id and db_session:
                    self.log_processing_result(scraped_data_id, False, error_msg, db_session)
                return False
            
            self.logger.info(f"Processing news data: {json_data.get('headline')}")
            
            # TODO: Implement actual news data processing
            # Example:
            # 1. Store news article for later analysis
            # 2. Extract player mentions for injury reports, etc.
            # 3. Analyze sentiment for DFS impact
            # 4. Update player projections based on news
            
            headline = json_data.get("headline")
            content = json_data.get("content")
            author = json_data.get("author")
            published_date = json_data.get("published_date")
            
            self.logger.info(f"Processed news: {headline} by {author}")
            
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, True, None, db_session)
            
            return True
            
        except Exception as e:
            error_msg = f"Error processing news data: {str(e)}"
            self.logger.error(error_msg)
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, False, error_msg, db_session)
            return False


class OwnershipDataImportProgram(ImportProgram):
    """
    Import program for processing DFS ownership data from RotoWire and similar sources.
    """
    
    def __init__(self):
        super().__init__("ownership_data_import")
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        """Validate ownership data has required fields."""
        required_fields = ["players"]
        if not all(field in json_data for field in required_fields):
            return False
        
        # Validate that players is a list and has at least one player
        players = json_data.get("players", [])
        if not isinstance(players, list) or len(players) == 0:
            return False
        
        # Validate that each player has required fields
        for player in players:
            if not isinstance(player, dict):
                return False
            # At minimum, we need player name and ownership percentage
            if "name" not in player or "ownership_percentage" not in player:
                return False
        
        return True
    
    def process_data(
        self, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process ownership data and integrate with existing DFS models.
        """
        try:
            if not self.validate_data(json_data):
                error_msg = "Invalid ownership data: missing required fields or invalid structure"
                self.logger.error(error_msg)
                if scraped_data_id and db_session:
                    self.log_processing_result(scraped_data_id, False, error_msg, db_session)
                return False
            
            players = json_data.get("players", [])
            slate_info = json_data.get("slate_info", {})
            source = json_data.get("source", "Unknown")
            
            self.logger.info(f"Processing ownership data for {len(players)} players from {source}")
            
            processed_players = 0
            errors = []
            
            for player_data in players:
                try:
                    # Extract player information
                    player_name = player_data.get("name")
                    position = player_data.get("position")
                    team = player_data.get("team")
                    salary = player_data.get("salary")
                    ownership_percentage = player_data.get("ownership_percentage")
                    projected_points = player_data.get("projected_points")
                    opponent = player_data.get("opponent")
                    game_info = player_data.get("game_info")
                    
                    self.logger.info(f"Processing player: {player_name} ({position}, {team}) - {ownership_percentage}% owned")
                    
                    # TODO: Implement actual ownership data processing
                    # This could include:
                    # 1. Update existing Player records with ownership data
                    # 2. Create new PlayerOwnership records
                    # 3. Update projections based on ownership levels
                    # 4. Store slate-specific data
                    # 5. Analyze ownership trends for lineup construction
                    
                    # Example processing logic:
                    # - Check if player exists in database
                    # - Update or create player record with ownership data
                    # - Store ownership data with slate information
                    # - Update player projections based on ownership
                    
                    processed_players += 1
                    
                except Exception as e:
                    error_msg = f"Error processing player {player_data.get('name', 'Unknown')}: {str(e)}"
                    self.logger.error(error_msg)
                    errors.append(error_msg)
            
            # Log slate information
            if slate_info:
                slate_date = slate_info.get("date")
                slate_type = slate_info.get("slate_type", "Unknown")
                games = slate_info.get("games", [])
                self.logger.info(f"Processed slate: {slate_type} on {slate_date} with {len(games)} games")
            
            # Store processed data summary
            self.logger.info(f"Successfully processed {processed_players}/{len(players)} players")
            if errors:
                self.logger.warning(f"Encountered {len(errors)} errors during processing")
            
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, True, None, db_session)
            
            return True
            
        except Exception as e:
            error_msg = f"Error processing ownership data: {str(e)}"
            self.logger.error(error_msg)
            if scraped_data_id and db_session:
                self.log_processing_result(scraped_data_id, False, error_msg, db_session)
            return False


class ImportProgramRegistry:
    """
    Registry for managing and routing scraped data to appropriate import programs.
    """
    
    def __init__(self):
        self.programs: Dict[str, ImportProgram] = {}
        self._register_default_programs()
    
    def _register_default_programs(self):
        """Register the default import programs."""
        self.register_program(PlayerDataImportProgram())
        self.register_program(ContestDataImportProgram())
        self.register_program(NewsDataImportProgram())
        self.register_program(OwnershipDataImportProgram())
    
    def register_program(self, program: ImportProgram):
        """
        Register an import program.
        
        Args:
            program: The import program to register
        """
        self.programs[program.program_name] = program
        logger.info(f"Registered import program: {program.program_name}")
    
    def get_program(self, program_name: str) -> Optional[ImportProgram]:
        """
        Get an import program by name.
        
        Args:
            program_name: Name of the program to get
            
        Returns:
            The import program or None if not found
        """
        return self.programs.get(program_name)
    
    def process_with_program(
        self, 
        program_name: str, 
        json_data: Dict[str, Any], 
        metadata: Optional[Dict[str, Any]] = None,
        scraped_data_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> bool:
        """
        Process data with a specific import program.
        
        Args:
            program_name: Name of the program to use
            json_data: The JSON data to process
            metadata: Additional metadata
            scraped_data_id: ID of the ScrapedData record
            db_session: Database session
            
        Returns:
            True if processing was successful
        """
        program = self.get_program(program_name)
        if not program:
            logger.error(f"Import program not found: {program_name}")
            return False
        
        return program.process_data(json_data, metadata, scraped_data_id, db_session)
    
    def auto_detect_program(self, json_data: Dict[str, Any]) -> Optional[str]:
        """
        Automatically detect which import program to use based on data structure.
        
        Args:
            json_data: The JSON data to analyze
            
        Returns:
            Name of the appropriate program or None
        """
        # Simple heuristic-based detection
        if "players" in json_data and isinstance(json_data.get("players"), list):
            # Check if it's ownership data (players with ownership_percentage)
            players = json_data.get("players", [])
            if players and isinstance(players[0], dict):
                if "ownership_percentage" in players[0]:
                    return "ownership_data_import"
                elif "player_name" in players[0]:
                    return "player_data_import"
        elif "player_name" in json_data:
            return "player_data_import"
        elif "contest_name" in json_data:
            return "contest_data_import"
        elif "headline" in json_data and "content" in json_data:
            return "news_data_import"
        
        return None


# Global registry instance
import_program_registry = ImportProgramRegistry()


# Convenience functions
def process_scraped_data(
    scraped_data_id: int, 
    program_name: Optional[str] = None,
    auto_detect: bool = True
) -> bool:
    """
    Process scraped data using the specified or auto-detected import program.
    
    Args:
        scraped_data_id: ID of the ScrapedData record to process
        program_name: Name of the program to use (optional if auto_detect is True)
        auto_detect: Whether to auto-detect the program based on data structure
        
    Returns:
        True if processing was successful
    """
    db_session = next(get_db())
    
    try:
        # Get the scraped data record
        scraped_data = db_session.query(ScrapedData).filter(
            ScrapedData.id == scraped_data_id
        ).first()
        
        if not scraped_data:
            logger.error(f"ScrapedData record not found: {scraped_data_id}")
            return False
        
        # Determine which program to use
        if not program_name and auto_detect:
            program_name = import_program_registry.auto_detect_program(scraped_data.raw_data)
        
        if not program_name:
            logger.error("No import program specified or detected")
            return False
        
        # Process the data
        success = import_program_registry.process_with_program(
            program_name,
            scraped_data.raw_data,
            scraped_data.metadata,
            scraped_data_id,
            db_session
        )
        
        return success
        
    except Exception as e:
        logger.error(f"Error processing scraped data {scraped_data_id}: {e}")
        return False
    finally:
        db_session.close()


def register_custom_import_program(program: ImportProgram):
    """
    Register a custom import program.
    
    Args:
        program: The import program to register
    """
    import_program_registry.register_program(program)


# Example usage
if __name__ == "__main__":
    # Example of how to use the import program interface
    
    # Sample scraped data
    sample_player_data = {
        "player_name": "Josh Allen",
        "position": "QB",
        "team": "BUF",
        "salary": 8500,
        "projected_points": 24.5,
        "ownership_percentage": 15.2
    }
    
    sample_contest_data = {
        "contest_name": "NFL Sunday Million",
        "entry_fee": 20.0,
        "total_prizes": 1000000.0,
        "max_entries": 50000,
        "contest_type": "GPP"
    }
    
    # Process data with specific programs
    player_program = import_program_registry.get_program("player_data_import")
    if player_program:
        success = player_program.process_data(sample_player_data)
        print(f"Player data processing: {'Success' if success else 'Failed'}")
    
    contest_program = import_program_registry.get_program("contest_data_import")
    if contest_program:
        success = contest_program.process_data(sample_contest_data)
        print(f"Contest data processing: {'Success' if success else 'Failed'}")
    
    # Auto-detect and process
    detected_program = import_program_registry.auto_detect_program(sample_player_data)
    print(f"Auto-detected program for player data: {detected_program}")
