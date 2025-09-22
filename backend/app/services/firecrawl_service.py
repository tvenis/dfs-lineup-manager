"""
Firecrawl Scraping Service for DFS App

This service provides functionality to:
1. Scrape web pages using Firecrawl API in JSON mode
2. Extract structured data based on schemas or prompts
3. Store scraped data in the database
4. Interface with import programs for data processing

Requires FIRECRAWL_API_KEY environment variable to be set.
"""

import os
import asyncio
import json
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import logging

try:
    from firecrawl import Firecrawl
except ImportError:
    raise ImportError("firecrawl-py package is required. Install with: pip install firecrawl-py")

from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Base, ScrapedData, ScrapingJob, ScrapingJobUrl
from .import_program_interface import import_program_registry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ScrapedDataModel(BaseModel):
    """Base model for scraped data - can be extended for specific use cases"""
    url: str
    scraped_at: datetime
    raw_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class FirecrawlService:
    """
    Service for scraping web pages using Firecrawl API with JSON mode.
    Provides structured data extraction and database storage capabilities.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Firecrawl Service.
        
        Args:
            api_key: Firecrawl API key. If not provided, will use FIRECRAWL_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("FIRECRAWL_API_KEY")
        if not self.api_key:
            raise ValueError("Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable or pass api_key parameter.")
        
        self.app = Firecrawl(api_key=self.api_key)
        
    def scrape_with_schema(
        self, 
        url: str, 
        schema: Union[BaseModel, Dict[str, Any]], 
        timeout: int = 120000,
        only_main_content: bool = False
    ) -> Dict[str, Any]:
        """
        Scrape a webpage and extract structured data using a JSON schema.
        
        Args:
            url: The URL to scrape
            schema: Pydantic model or JSON schema dict defining the data structure
            timeout: Request timeout in milliseconds
            only_main_content: Whether to scrape only main content
            
        Returns:
            Dictionary containing the scraped data and metadata
        """
        try:
            logger.info(f"Scraping URL with schema: {url}")
            
            # Convert Pydantic model to dict if needed
            if isinstance(schema, BaseModel):
                schema_dict = schema.model_json_schema()
            else:
                schema_dict = schema
            
            result = self.app.scrape(
                url,
                formats=[{
                    "type": "json",
                    "schema": schema_dict
                }],
                only_main_content=only_main_content,
                timeout=timeout
            )
            
            if result.get("success"):
                logger.info(f"Successfully scraped data from {url}")
                return result.get("data", {})
            else:
                logger.error(f"Failed to scrape {url}: {result}")
                raise Exception(f"Scraping failed: {result}")
                
        except Exception as e:
            logger.error(f"Error scraping {url} with schema: {e}")
            raise
    
    def scrape_with_prompt(
        self, 
        url: str, 
        prompt: str, 
        timeout: int = 120000,
        only_main_content: bool = False
    ) -> Dict[str, Any]:
        """
        Scrape a webpage and extract structured data using a prompt.
        
        Args:
            url: The URL to scrape
            prompt: Prompt describing what data to extract
            timeout: Request timeout in milliseconds
            only_main_content: Whether to scrape only main content
            
        Returns:
            Dictionary containing the scraped data and metadata
        """
        try:
            logger.info(f"Scraping URL with prompt: {url}")
            
            result = self.app.scrape(
                url,
                formats=[{
                    "type": "json",
                    "prompt": prompt
                }],
                only_main_content=only_main_content,
                timeout=timeout
            )
            
            if result.get("success"):
                logger.info(f"Successfully scraped data from {url}")
                return result.get("data", {})
            else:
                logger.error(f"Failed to scrape {url}: {result}")
                raise Exception(f"Scraping failed: {result}")
                
        except Exception as e:
            logger.error(f"Error scraping {url} with prompt: {e}")
            raise
    
    def scrape_multiple_urls(
        self, 
        urls: List[str], 
        schema: Optional[Union[BaseModel, Dict[str, Any]]] = None,
        prompt: Optional[str] = None,
        timeout: int = 120000,
        only_main_content: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Scrape multiple URLs with the same schema or prompt.
        
        Args:
            urls: List of URLs to scrape
            schema: Pydantic model or JSON schema dict (optional)
            prompt: Prompt for data extraction (optional)
            timeout: Request timeout in milliseconds
            only_main_content: Whether to scrape only main content
            
        Returns:
            List of dictionaries containing scraped data and metadata
        """
        if not schema and not prompt:
            raise ValueError("Either schema or prompt must be provided")
        
        results = []
        for url in urls:
            try:
                if schema:
                    data = self.scrape_with_schema(url, schema, timeout, only_main_content)
                else:
                    data = self.scrape_with_prompt(url, prompt, timeout, only_main_content)
                
                results.append({
                    "url": url,
                    "data": data,
                    "success": True,
                    "scraped_at": datetime.utcnow()
                })
                
            except Exception as e:
                logger.error(f"Failed to scrape {url}: {e}")
                results.append({
                    "url": url,
                    "data": None,
                    "success": False,
                    "error": str(e),
                    "scraped_at": datetime.utcnow()
                })
        
        return results
    
    def store_scraped_data(
        self, 
        scraped_data: Dict[str, Any], 
        url: str,
        import_program_name: Optional[str] = None,
        auto_process: bool = True
    ) -> Optional[int]:
        """
        Store scraped data in the database and optionally process with import program.
        
        Args:
            scraped_data: The scraped data dictionary
            url: The original URL that was scraped
            import_program_name: Name of import program to use for processing
            auto_process: Whether to automatically process the data with an import program
            
        Returns:
            ID of the created ScrapedData record, or None if failed
        """
        db_session = next(get_db())
        
        try:
            # Extract JSON data and metadata from scraped result
            json_data = scraped_data.get("json", {})
            metadata = scraped_data.get("metadata", {})
            
            # Create ScrapedData record in database
            scraped_record = ScrapedData(
                url=url,
                raw_data=json_data,
                metadata=metadata,
                processing_status="pending"
            )
            
            db_session.add(scraped_record)
            db_session.commit()
            db_session.refresh(scraped_record)
            
            scraped_data_id = scraped_record.id
            logger.info(f"Stored scraped data for {url} with ID: {scraped_data_id}")
            
            # Process with import program if requested
            if auto_process:
                if import_program_name:
                    success = import_program_registry.process_with_program(
                        import_program_name,
                        json_data,
                        metadata,
                        scraped_data_id,
                        db_session
                    )
                else:
                    # Auto-detect the appropriate program
                    detected_program = import_program_registry.auto_detect_program(json_data)
                    if detected_program:
                        success = import_program_registry.process_with_program(
                            detected_program,
                            json_data,
                            metadata,
                            scraped_data_id,
                            db_session
                        )
                        logger.info(f"Auto-detected and used program: {detected_program}")
                    else:
                        logger.warning(f"No import program could be auto-detected for {url}")
                        success = True  # Still consider it successful, just not processed
                
                logger.info(f"Import program processing for {url}: {'Success' if success else 'Failed'}")
            
            return scraped_data_id
            
        except Exception as e:
            logger.error(f"Error storing scraped data for {url}: {e}")
            db_session.rollback()
            return None
        finally:
            db_session.close()
    
    def scrape_and_store(
        self, 
        url: str, 
        schema: Optional[Union[BaseModel, Dict[str, Any]]] = None,
        prompt: Optional[str] = None,
        import_program_name: Optional[str] = None,
        auto_process: bool = True,
        timeout: int = 120000,
        only_main_content: bool = False
    ) -> Optional[int]:
        """
        Scrape a URL and store the results in the database.
        
        Args:
            url: The URL to scrape
            schema: Pydantic model or JSON schema dict (optional)
            prompt: Prompt for data extraction (optional)
            import_program_name: Name of import program to use for processing
            auto_process: Whether to automatically process the data with an import program
            timeout: Request timeout in milliseconds
            only_main_content: Whether to scrape only main content
            
        Returns:
            ID of the created ScrapedData record, or None if failed
        """
        if not schema and not prompt:
            raise ValueError("Either schema or prompt must be provided")
        
        try:
            # Scrape the data
            if schema:
                scraped_data = self.scrape_with_schema(url, schema, timeout, only_main_content)
            else:
                scraped_data = self.scrape_with_prompt(url, prompt, timeout, only_main_content)
            
            # Store the data
            return self.store_scraped_data(scraped_data, url, import_program_name, auto_process)
            
        except Exception as e:
            logger.error(f"Error in scrape_and_store for {url}: {e}")
            return None
    
    def create_scraping_job(
        self,
        job_name: str,
        urls: List[str],
        schema: Optional[Union[BaseModel, Dict[str, Any]]] = None,
        prompt: Optional[str] = None,
        import_program_name: Optional[str] = None
    ) -> Optional[int]:
        """
        Create a scraping job for batch processing multiple URLs.
        
        Args:
            job_name: Name for the scraping job
            urls: List of URLs to scrape
            schema: Pydantic model or JSON schema dict (optional)
            prompt: Prompt for data extraction (optional)
            import_program_name: Name of import program to use for processing
            
        Returns:
            ID of the created ScrapingJob, or None if failed
        """
        if not schema and not prompt:
            raise ValueError("Either schema or prompt must be provided")
        
        db_session = next(get_db())
        
        try:
            # Create the scraping job
            job = ScrapingJob(
                job_name=job_name,
                job_type="batch",
                status="pending",
                total_urls=len(urls),
                schema_used=import_program_name or (schema.__class__.__name__ if schema else "prompt")
            )
            
            db_session.add(job)
            db_session.commit()
            db_session.refresh(job)
            
            job_id = job.id
            
            # Create job URL records
            for url in urls:
                job_url = ScrapingJobUrl(
                    job_id=job_id,
                    url=url,
                    status="pending"
                )
                db_session.add(job_url)
            
            db_session.commit()
            
            logger.info(f"Created scraping job {job_id} with {len(urls)} URLs")
            return job_id
            
        except Exception as e:
            logger.error(f"Error creating scraping job: {e}")
            db_session.rollback()
            return None
        finally:
            db_session.close()
    
    def process_scraping_job(self, job_id: int) -> bool:
        """
        Process a scraping job by scraping all pending URLs.
        
        Args:
            job_id: ID of the scraping job to process
            
        Returns:
            True if job processing was successful
        """
        db_session = next(get_db())
        
        try:
            # Get the job
            job = db_session.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
            if not job:
                logger.error(f"Scraping job not found: {job_id}")
                return False
            
            # Update job status
            job.status = "running"
            job.started_at = datetime.utcnow()
            db_session.commit()
            
            # Get pending URLs
            pending_urls = db_session.query(ScrapingJobUrl).filter(
                ScrapingJobUrl.job_id == job_id,
                ScrapingJobUrl.status == "pending"
            ).all()
            
            completed_count = 0
            failed_count = 0
            
            # Process each URL
            for job_url in pending_urls:
                try:
                    # Determine schema/prompt based on job
                    schema = None
                    prompt = None
                    
                    if "prompt" in job.schema_used.lower():
                        prompt = "Extract relevant data from this page"
                    else:
                        # You would need to store the actual schema in the job
                        # For now, we'll use a generic approach
                        prompt = f"Extract data according to {job.schema_used} schema"
                    
                    # Scrape and store
                    scraped_data_id = self.scrape_and_store(
                        job_url.url,
                        schema=schema,
                        prompt=prompt,
                        import_program_name=job.schema_used if job.schema_used != "prompt" else None,
                        auto_process=True
                    )
                    
                    if scraped_data_id:
                        job_url.status = "completed"
                        job_url.scraped_data_id = scraped_data_id
                        completed_count += 1
                    else:
                        job_url.status = "failed"
                        job_url.error_message = "Scraping failed"
                        failed_count += 1
                    
                    job_url.processed_at = datetime.utcnow()
                    
                except Exception as e:
                    job_url.status = "failed"
                    job_url.error_message = str(e)
                    job_url.processed_at = datetime.utcnow()
                    failed_count += 1
                    logger.error(f"Error processing URL {job_url.url}: {e}")
            
            # Update job status
            job.completed_urls = completed_count
            job.failed_urls = failed_count
            job.status = "completed" if failed_count == 0 else "completed"  # Still completed even with some failures
            job.completed_at = datetime.utcnow()
            
            db_session.commit()
            
            logger.info(f"Completed scraping job {job_id}: {completed_count} successful, {failed_count} failed")
            return True
            
        except Exception as e:
            logger.error(f"Error processing scraping job {job_id}: {e}")
            db_session.rollback()
            return False
        finally:
            db_session.close()


# Example schemas for common DFS data extraction
class PlayerDataSchema(BaseModel):
    """Schema for extracting player information from web pages"""
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    salary: Optional[float] = None
    projected_points: Optional[float] = None
    ownership_percentage: Optional[float] = None
    matchup: Optional[str] = None


class ContestDataSchema(BaseModel):
    """Schema for extracting contest information"""
    contest_name: str
    entry_fee: Optional[float] = None
    total_prizes: Optional[float] = None
    max_entries: Optional[int] = None
    contest_type: Optional[str] = None
    sport: Optional[str] = None


class NewsDataSchema(BaseModel):
    """Schema for extracting news articles"""
    headline: str
    content: str
    author: Optional[str] = None
    published_date: Optional[str] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None


class OwnershipDataSchema(BaseModel):
    """Schema for extracting DFS ownership data from RotoWire"""
    players: List[Dict[str, Any]]  # List of player ownership data
    slate_info: Optional[Dict[str, Any]] = None  # Slate information (date, games, etc.)
    last_updated: Optional[str] = None  # When the data was last updated
    source: str = "RotoWire"  # Data source
    
    class Config:
        json_schema_extra = {
            "example": {
                "players": [
                    {
                        "name": "Josh Allen",
                        "position": "QB",
                        "team": "BUF",
                        "salary": 8500,
                        "ownership_percentage": 15.2,
                        "projected_points": 24.5,
                        "game_info": "BUF @ MIA",
                        "opponent": "MIA"
                    }
                ],
                "slate_info": {
                    "date": "2024-09-21",
                    "slate_type": "Main",
                    "games": ["BUF @ MIA", "KC @ NYG"],
                    "total_games": 2
                },
                "last_updated": "2024-09-21T10:30:00Z",
                "source": "RotoWire"
            }
        }


# Convenience functions for common scraping tasks
def scrape_player_data(url: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to scrape player data from a URL.
    
    Args:
        url: URL containing player information
        api_key: Firecrawl API key (optional)
        
    Returns:
        Scraped player data
    """
    service = FirecrawlService(api_key)
    return service.scrape_with_schema(url, PlayerDataSchema)


def scrape_contest_data(url: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to scrape contest data from a URL.
    
    Args:
        url: URL containing contest information
        api_key: Firecrawl API key (optional)
        
    Returns:
        Scraped contest data
    """
    service = FirecrawlService(api_key)
    return service.scrape_with_schema(url, ContestDataSchema)


def scrape_news_data(url: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to scrape news data from a URL.
    
    Args:
        url: URL containing news information
        api_key: Firecrawl API key (optional)
        
    Returns:
        Scraped news data
    """
    service = FirecrawlService(api_key)
    return service.scrape_with_schema(url, NewsDataSchema)


def scrape_ownership_data(url: Optional[str] = None, slate_id: Optional[str] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to scrape DFS ownership data from RotoWire.
    
    Args:
        url: Full URL containing ownership information (optional)
        slate_id: RotoWire slate ID (e.g., "8536" for main Sunday slate)
        api_key: Firecrawl API key (optional)
        
    Returns:
        Scraped ownership data
        
    Examples:
        # Using slate ID (recommended)
        data = scrape_ownership_data(slate_id="8536")  # Main Sunday slate
        
        # Using full URL
        data = scrape_ownership_data(url="https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID=8536")
    """
    service = FirecrawlService(api_key)
    
    # Build URL if slate_id is provided
    if slate_id:
        url = f"https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID={slate_id}"
    elif not url:
        raise ValueError("Either url or slate_id must be provided")
    
    # Use custom prompt for correct field mapping
    corrected_prompt = """
    Extract DFS ownership data from this RotoWire page. For each player, extract:
    - name: Player name
    - position: QB/RB/WR/TE/K/DST
    - team: Team abbreviation
    - salary: DraftKings salary (remove $ symbol, use number only)
    - ownership_percentage: From RST% column (roster percentage 0-100%)
    - projected_points: From FPTS column (fantasy points prediction)
    - opponent: Opposing team
    - game_info: Team @ Opponent
    
    IMPORTANT FIELD MAPPING:
    - ownership_percentage = RST% column (roster percentage)
    - projected_points = FPTS column (fantasy points)
    - Do NOT use TM/P (team total) for projected_points
    
    Return as JSON with "players" array containing all player data.
    """
    
    return service.scrape_with_prompt(url, corrected_prompt)


# Example usage
async def main():
    """
    Example usage of the Firecrawl Service.
    """
    try:
        # Initialize service
        service = FirecrawlService()
        
        # Example 1: Scrape with schema
        player_data = scrape_player_data("https://example.com/player/stats")
        print("Player data:", player_data)
        
        # Example 2: Scrape with prompt
        custom_data = service.scrape_with_prompt(
            "https://example.com/news",
            "Extract the headline, summary, and any player names mentioned in this article."
        )
        print("Custom data:", custom_data)
        
        # Example 3: Scrape and store
        def import_callback(json_data, metadata):
            """Example import program callback"""
            print(f"Processing data: {json_data}")
            print(f"Metadata: {metadata}")
        
        success = service.scrape_and_store(
            "https://example.com/contest",
            schema=ContestDataSchema,
            import_program_callback=import_callback
        )
        print(f"Scrape and store successful: {success}")
        
        # Example 4: Scrape multiple URLs
        urls = [
            "https://example.com/player1",
            "https://example.com/player2",
            "https://example.com/player3"
        ]
        results = service.scrape_multiple_urls(urls, schema=PlayerDataSchema)
        print("Multiple results:", results)
        
    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    asyncio.run(main())
