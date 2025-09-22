"""
FastAPI router for Firecrawl scraping service endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

from ..services.firecrawl_service import (
    FirecrawlService, 
    PlayerDataSchema, 
    ContestDataSchema, 
    NewsDataSchema,
    OwnershipDataSchema
)
from ..services.import_program_interface import import_program_registry, process_scraped_data
from ..database import get_db
from ..models import ScrapedData, ScrapingJob, ScrapingJobUrl
from sqlalchemy.orm import Session

router = APIRouter(prefix="/firecrawl", tags=["firecrawl"])


# Request/Response models
class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    schema_name: Optional[str] = Field(None, description="Name of schema to use (player_data, contest_data, news_data)")
    custom_prompt: Optional[str] = Field(None, description="Custom prompt for data extraction")
    import_program_name: Optional[str] = Field(None, description="Name of import program to use")
    auto_process: bool = Field(True, description="Whether to automatically process with import program")
    timeout: int = Field(120000, description="Request timeout in milliseconds")
    only_main_content: bool = Field(False, description="Whether to scrape only main content")


class BatchScrapeRequest(BaseModel):
    job_name: str = Field(..., description="Name for the scraping job")
    urls: List[str] = Field(..., description="List of URLs to scrape")
    schema_name: Optional[str] = Field(None, description="Name of schema to use")
    custom_prompt: Optional[str] = Field(None, description="Custom prompt for data extraction")
    import_program_name: Optional[str] = Field(None, description="Name of import program to use")


class ScrapeResponse(BaseModel):
    success: bool
    scraped_data_id: Optional[int] = None
    message: str
    data: Optional[Dict[str, Any]] = None


class BatchScrapeResponse(BaseModel):
    success: bool
    job_id: Optional[int] = None
    message: str


class ScrapedDataResponse(BaseModel):
    id: int
    url: str
    scraped_at: datetime
    processing_status: str
    processing_error: Optional[str] = None
    import_program_used: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScrapingJobResponse(BaseModel):
    id: int
    job_name: str
    job_type: str
    status: str
    total_urls: int
    completed_urls: int
    failed_urls: int
    schema_used: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Helper function to get schema by name
def get_schema_by_name(schema_name: str) -> Optional[BaseModel]:
    """Get a schema class by name."""
    schemas = {
        "player_data": PlayerDataSchema,
        "contest_data": ContestDataSchema,
        "news_data": NewsDataSchema,
        "ownership_data": OwnershipDataSchema
    }
    return schemas.get(schema_name)


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Scrape a single URL and optionally process the data.
    """
    try:
        service = FirecrawlService()
        
        # Determine schema or prompt
        schema = None
        prompt = None
        
        if request.schema_name:
            schema_class = get_schema_by_name(request.schema_name)
            if not schema_class:
                raise HTTPException(status_code=400, f"Unknown schema: {request.schema_name}")
            schema = schema_class()
        elif request.custom_prompt:
            prompt = request.custom_prompt
        else:
            raise HTTPException(status_code=400, "Either schema_name or custom_prompt must be provided")
        
        # Scrape and store
        scraped_data_id = service.scrape_and_store(
            url=request.url,
            schema=schema,
            prompt=prompt,
            import_program_name=request.import_program_name,
            auto_process=request.auto_process,
            timeout=request.timeout,
            only_main_content=request.only_main_content
        )
        
        if scraped_data_id:
            return ScrapeResponse(
                success=True,
                scraped_data_id=scraped_data_id,
                message=f"Successfully scraped and stored data from {request.url}"
            )
        else:
            return ScrapeResponse(
                success=False,
                message=f"Failed to scrape data from {request.url}"
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scraping URL: {str(e)}")


@router.post("/scrape/batch", response_model=BatchScrapeResponse)
async def scrape_urls_batch(
    request: BatchScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a batch scraping job for multiple URLs.
    """
    try:
        service = FirecrawlService()
        
        # Determine schema or prompt
        schema = None
        prompt = None
        
        if request.schema_name:
            schema_class = get_schema_by_name(request.schema_name)
            if not schema_class:
                raise HTTPException(status_code=400, f"Unknown schema: {request.schema_name}")
            schema = schema_class()
        elif request.custom_prompt:
            prompt = request.custom_prompt
        else:
            raise HTTPException(status_code=400, "Either schema_name or custom_prompt must be provided")
        
        # Create scraping job
        job_id = service.create_scraping_job(
            job_name=request.job_name,
            urls=request.urls,
            schema=schema,
            prompt=prompt,
            import_program_name=request.import_program_name
        )
        
        if job_id:
            # Process the job in the background
            background_tasks.add_task(service.process_scraping_job, job_id)
            
            return BatchScrapeResponse(
                success=True,
                job_id=job_id,
                message=f"Created scraping job {job_id} with {len(request.urls)} URLs"
            )
        else:
            return BatchScrapeResponse(
                success=False,
                message="Failed to create scraping job"
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating batch job: {str(e)}")


@router.get("/scraped-data/{scraped_data_id}", response_model=ScrapedDataResponse)
async def get_scraped_data(scraped_data_id: int, db: Session = Depends(get_db)):
    """
    Get scraped data by ID.
    """
    scraped_data = db.query(ScrapedData).filter(ScrapedData.id == scraped_data_id).first()
    if not scraped_data:
        raise HTTPException(status_code=404, detail="Scraped data not found")
    
    return scraped_data


@router.get("/scraped-data/{scraped_data_id}/raw")
async def get_scraped_data_raw(scraped_data_id: int, db: Session = Depends(get_db)):
    """
    Get the raw scraped data (JSON) by ID.
    """
    scraped_data = db.query(ScrapedData).filter(ScrapedData.id == scraped_data_id).first()
    if not scraped_data:
        raise HTTPException(status_code=404, detail="Scraped data not found")
    
    return {
        "id": scraped_data.id,
        "url": scraped_data.url,
        "scraped_at": scraped_data.scraped_at,
        "raw_data": scraped_data.raw_data,
        "metadata": scraped_data.metadata,
        "processing_status": scraped_data.processing_status
    }


@router.post("/scraped-data/{scraped_data_id}/process")
async def process_scraped_data_endpoint(
    scraped_data_id: int,
    program_name: Optional[str] = None,
    auto_detect: bool = True
):
    """
    Process scraped data with an import program.
    """
    try:
        success = process_scraped_data(scraped_data_id, program_name, auto_detect)
        if success:
            return {"success": True, "message": f"Successfully processed scraped data {scraped_data_id}"}
        else:
            return {"success": False, "message": f"Failed to process scraped data {scraped_data_id}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing data: {str(e)}")


@router.get("/jobs", response_model=List[ScrapingJobResponse])
async def get_scraping_jobs(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get scraping jobs with optional status filter.
    """
    query = db.query(ScrapingJob)
    
    if status:
        query = query.filter(ScrapingJob.status == status)
    
    jobs = query.order_by(ScrapingJob.created_at.desc()).limit(limit).all()
    return jobs


@router.get("/jobs/{job_id}", response_model=ScrapingJobResponse)
async def get_scraping_job(job_id: int, db: Session = Depends(get_db)):
    """
    Get a specific scraping job by ID.
    """
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scraping job not found")
    
    return job


@router.get("/jobs/{job_id}/urls")
async def get_scraping_job_urls(job_id: int, db: Session = Depends(get_db)):
    """
    Get all URLs for a specific scraping job.
    """
    job_urls = db.query(ScrapingJobUrl).filter(ScrapingJobUrl.job_id == job_id).all()
    
    return [
        {
            "id": url.id,
            "url": url.url,
            "status": url.status,
            "scraped_data_id": url.scraped_data_id,
            "error_message": url.error_message,
            "processed_at": url.processed_at,
            "created_at": url.created_at
        }
        for url in job_urls
    ]


@router.post("/jobs/{job_id}/process")
async def process_scraping_job_endpoint(
    job_id: int,
    background_tasks: BackgroundTasks
):
    """
    Process a scraping job (scrape all pending URLs).
    """
    try:
        service = FirecrawlService()
        background_tasks.add_task(service.process_scraping_job, job_id)
        
        return {"success": True, "message": f"Started processing scraping job {job_id}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing job: {str(e)}")


@router.get("/import-programs")
async def get_import_programs():
    """
    Get list of available import programs.
    """
    programs = list(import_program_registry.programs.keys())
    return {"import_programs": programs}


@router.get("/schemas")
async def get_available_schemas():
    """
    Get list of available schemas for scraping.
    """
    schemas = [
        {
            "name": "player_data",
            "description": "Extract player information (name, position, team, salary, etc.)",
            "schema_class": "PlayerDataSchema"
        },
        {
            "name": "contest_data", 
            "description": "Extract contest information (name, entry fee, prizes, etc.)",
            "schema_class": "ContestDataSchema"
        },
        {
            "name": "news_data",
            "description": "Extract news article information (headline, content, author, etc.)",
            "schema_class": "NewsDataSchema"
        },
        {
            "name": "ownership_data",
            "description": "Extract DFS ownership data from RotoWire and similar sources (players, ownership percentages, slate info)",
            "schema_class": "OwnershipDataSchema"
        }
    ]
    return {"schemas": schemas}


@router.get("/health")
async def health_check():
    """
    Health check endpoint for the Firecrawl service.
    """
    try:
        # Test Firecrawl service initialization
        service = FirecrawlService()
        return {
            "status": "healthy",
            "service": "firecrawl",
            "timestamp": datetime.utcnow(),
            "api_key_configured": bool(service.api_key)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "firecrawl", 
            "timestamp": datetime.utcnow(),
            "error": str(e)
        }
