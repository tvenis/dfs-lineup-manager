# Firecrawl Scraping Service

This service provides web scraping capabilities using the Firecrawl API with JSON mode for structured data extraction. It's designed to scrape DFS-related data from web pages and automatically process it using configurable import programs.

## Features

- **JSON Mode Scraping**: Extract structured data from web pages using schemas or prompts
- **Database Storage**: Automatically store scraped data in PostgreSQL database
- **Import Program Integration**: Process scraped data with configurable import programs
- **Batch Processing**: Handle multiple URLs in batch jobs
- **REST API**: Full FastAPI integration with comprehensive endpoints
- **Auto-Detection**: Automatically detect appropriate import programs based on data structure

## Setup

### 1. Install Dependencies

```bash
pip install firecrawl-py
```

### 2. Environment Variables

Set the Firecrawl API key:

```bash
export FIRECRAWL_API_KEY="fc-YOUR-API-KEY"
```

### 3. Database Migration

Run the migration script to create the required tables:

```bash
python add_firecrawl_tables.py
```

This will create the following tables:
- `scraped_data`: Stores scraped data and metadata
- `scraping_jobs`: Tracks batch scraping jobs
- `scraping_job_urls`: Individual URLs within batch jobs

### 4. Start the Server

The Firecrawl router is automatically included in the main FastAPI app. Start the server:

```bash
python main.py
```

## API Endpoints

### Core Scraping

#### `POST /api/firecrawl/scrape`
Scrape a single URL with structured data extraction.

**Request Body:**
```json
{
  "url": "https://example.com/player/stats",
  "schema_name": "player_data",
  "import_program_name": "player_data_import",
  "auto_process": true,
  "timeout": 120000,
  "only_main_content": false
}
```

**Response:**
```json
{
  "success": true,
  "scraped_data_id": 123,
  "message": "Successfully scraped and stored data from https://example.com/player/stats"
}
```

#### `POST /api/firecrawl/scrape/batch`
Create a batch scraping job for multiple URLs.

**Request Body:**
```json
{
  "job_name": "Week 5 Player Stats",
  "urls": [
    "https://example.com/player1",
    "https://example.com/player2",
    "https://example.com/player3"
  ],
  "schema_name": "player_data",
  "import_program_name": "player_data_import"
}
```

### Data Retrieval

#### `GET /api/firecrawl/scraped-data/{id}`
Get scraped data by ID.

#### `GET /api/firecrawl/scraped-data/{id}/raw`
Get raw scraped JSON data.

#### `GET /api/firecrawl/jobs`
Get list of scraping jobs with optional status filter.

#### `GET /api/firecrawl/jobs/{job_id}`
Get specific scraping job details.

#### `GET /api/firecrawl/jobs/{job_id}/urls`
Get all URLs for a scraping job.

### Processing

#### `POST /api/firecrawl/scraped-data/{id}/process`
Process scraped data with an import program.

#### `POST /api/firecrawl/jobs/{job_id}/process`
Process a scraping job (scrape all pending URLs).

### Configuration

#### `GET /api/firecrawl/import-programs`
Get list of available import programs.

#### `GET /api/firecrawl/schemas`
Get list of available schemas.

#### `GET /api/firecrawl/health`
Health check endpoint.

## Available Schemas

### Player Data Schema
Extract player information from web pages:
- `player_name`: Player's name
- `position`: Player position (QB, RB, WR, TE, etc.)
- `team`: Team abbreviation
- `salary`: DraftKings salary
- `projected_points`: Projected fantasy points
- `ownership_percentage`: Expected ownership
- `matchup`: Opponent team

### Contest Data Schema
Extract contest information:
- `contest_name`: Name of the contest
- `entry_fee`: Entry fee in USD
- `total_prizes`: Total prize pool
- `max_entries`: Maximum number of entries
- `contest_type`: Type of contest (GPP, Cash, etc.)
- `sport`: Sport (NFL, NBA, etc.)

### News Data Schema
Extract news article information:
- `headline`: Article headline
- `content`: Article content
- `author`: Article author
- `published_date`: Publication date
- `tags`: Article tags
- `summary`: Article summary

## Import Programs

### Built-in Programs

#### Player Data Import Program
- Processes player information and integrates with existing Player models
- Validates required fields (player_name)
- Updates or creates player records
- Handles related data (team, position, salary, projections)

#### Contest Data Import Program
- Processes contest information and integrates with Contest models
- Validates required fields (contest_name)
- Updates or creates contest records
- Handles contest relationships (type, sport, etc.)

#### News Data Import Program
- Processes news articles for DFS analysis
- Validates required fields (headline, content)
- Stores articles for later analysis
- Can extract player mentions for injury reports

### Custom Import Programs

You can create custom import programs by extending the `ImportProgram` base class:

```python
from app.services.import_program_interface import ImportProgram

class CustomImportProgram(ImportProgram):
    def __init__(self):
        super().__init__("custom_import")
    
    def validate_data(self, json_data: Dict[str, Any]) -> bool:
        # Add custom validation logic
        return "required_field" in json_data
    
    def process_data(self, json_data, metadata=None, scraped_data_id=None, db_session=None) -> bool:
        # Add custom processing logic
        # Process the data and integrate with your models
        return True

# Register the custom program
from app.services.import_program_interface import import_program_registry
import_program_registry.register_program(CustomImportProgram())
```

## Usage Examples

### Python Service Usage

```python
from app.services.firecrawl_service import FirecrawlService, PlayerDataSchema

# Initialize service
service = FirecrawlService()

# Scrape with schema
scraped_data = service.scrape_with_schema(
    "https://example.com/player/stats",
    PlayerDataSchema
)

# Scrape and store with auto-processing
scraped_data_id = service.scrape_and_store(
    "https://example.com/player/stats",
    schema=PlayerDataSchema,
    import_program_name="player_data_import",
    auto_process=True
)

# Batch processing
job_id = service.create_scraping_job(
    job_name="Week 5 Players",
    urls=["https://example.com/player1", "https://example.com/player2"],
    schema=PlayerDataSchema,
    import_program_name="player_data_import"
)

# Process the batch job
service.process_scraping_job(job_id)
```

### Using Convenience Functions

```python
from app.services.firecrawl_service import scrape_player_data, scrape_contest_data

# Scrape player data
player_data = scrape_player_data("https://example.com/player/stats")

# Scrape contest data
contest_data = scrape_contest_data("https://example.com/contest/info")
```

### API Usage with cURL

```bash
# Scrape a single URL
curl -X POST "http://localhost:8000/api/firecrawl/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/player/stats",
    "schema_name": "player_data",
    "auto_process": true
  }'

# Create batch job
curl -X POST "http://localhost:8000/api/firecrawl/scrape/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "job_name": "Week 5 Players",
    "urls": ["https://example.com/player1", "https://example.com/player2"],
    "schema_name": "player_data"
  }'

# Check job status
curl "http://localhost:8000/api/firecrawl/jobs/1"

# Get scraped data
curl "http://localhost:8000/api/firecrawl/scraped-data/123/raw"
```

## Database Schema

### ScrapedData Table
- `id`: Primary key
- `url`: Source URL
- `scraped_at`: Timestamp when scraped
- `raw_data`: JSON data extracted from page
- `metadata`: Firecrawl metadata (title, description, etc.)
- `processing_status`: Status of import processing
- `processing_error`: Error message if processing failed
- `import_program_used`: Name of import program used

### ScrapingJob Table
- `id`: Primary key
- `job_name`: Human-readable job name
- `job_type`: Type of job (batch, scheduled, etc.)
- `status`: Job status (pending, running, completed, failed)
- `total_urls`: Total number of URLs in job
- `completed_urls`: Number of successfully processed URLs
- `failed_urls`: Number of failed URLs
- `schema_used`: Schema or prompt used for scraping

### ScrapingJobUrl Table
- `id`: Primary key
- `job_id`: Foreign key to ScrapingJob
- `url`: Individual URL to scrape
- `status`: URL processing status
- `scraped_data_id`: Foreign key to ScrapedData
- `error_message`: Error message if scraping failed

## Error Handling

The service includes comprehensive error handling:

- **API Errors**: Proper HTTP status codes and error messages
- **Database Errors**: Rollback on failures, detailed logging
- **Scraping Errors**: Individual URL failures don't stop batch jobs
- **Import Program Errors**: Graceful handling of processing failures

## Monitoring and Logging

- All operations are logged with appropriate levels
- Database operations are tracked with timestamps
- Import program processing status is monitored
- Failed operations are logged with error details

## Security Considerations

- API key is stored as environment variable
- Database connections use connection pooling
- Input validation on all API endpoints
- SQL injection protection through SQLAlchemy ORM

## Performance Optimization

- Batch processing for multiple URLs
- Background task processing for long-running jobs
- Database indexes on frequently queried columns
- Connection pooling for database operations

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```
   Error: Firecrawl API key is required
   Solution: Set FIRECRAWL_API_KEY environment variable
   ```

2. **Database Connection Issues**
   ```
   Error: Could not connect to database
   Solution: Check DATABASE_URL environment variable
   ```

3. **Import Program Not Found**
   ```
   Error: Import program not found
   Solution: Check available programs at /api/firecrawl/import-programs
   ```

4. **Schema Validation Failed**
   ```
   Error: Invalid data: missing required fields
   Solution: Check data structure matches expected schema
   ```

### Debugging

1. Check service health: `GET /api/firecrawl/health`
2. Review logs for detailed error messages
3. Check database for processing status
4. Verify API key configuration

## Future Enhancements

- Scheduled scraping jobs
- Custom schema definitions via API
- Advanced data validation rules
- Integration with existing DFS models
- Real-time scraping status updates
- Webhook notifications for job completion
