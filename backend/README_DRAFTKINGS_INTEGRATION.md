# DraftKings API Integration - Implementation Guide

## Overview

This document describes the implementation of the DraftKings API integration feature that replaces CSV-based player pool imports with direct API calls to DraftKings. The system now supports real-time player data fetching, automatic upserts, and comprehensive activity logging.

## Architecture Changes

### Data Model Updates

#### Players Table
- **Primary Key**: Changed from `id` (string) to `playerDkId` (integer)
- **New Fields**: 
  - `firstName`, `lastName`, `displayName`, `shortName`
  - `team` (references teams.abbreviation)
- **Removed**: `stats` (JSON), `team_id` (string)

#### Player Pool Entries Table
- **New Structure**: 
  - `week` (string): Week identifier (e.g., "Week 1")
  - `draftGroup` (string): Draft Group ID from DraftKings
  - `playerDkId` (integer): Foreign key to players table
  - JSON fields for complex DraftKings data
- **Unique Constraint**: Composite index on (week, draftGroup, playerDkId)

#### New Tables
- **Recent Activity**: Tracks all import/export operations with detailed metrics
- **Enhanced Teams**: Added unique constraint on abbreviation

### API Endpoints

#### POST `/api/draftkings/import`
Imports player pool data from DraftKings API

**Request Body:**
```json
{
  "week": "Week 1",
  "draft_group": "123456"
}
```

**Response:**
```json
{
  "players_added": 45,
  "players_updated": 12,
  "entries_added": 45,
  "entries_updated": 12,
  "entries_skipped": 0,
  "errors": [],
  "total_processed": 57
}
```

#### GET `/api/draftkings/activity`
Retrieves recent import/export activity

#### GET `/api/draftkings/activity/{week}/{draft_group}`
Retrieves activity for specific week and draft group

## Implementation Details

### Import Service (`DraftKingsImportService`)

The service handles the complete import workflow:

1. **API Fetch**: Calls DraftKings Draft Group API
2. **Data Processing**: Extracts and validates player information
3. **Upsert Operations**: 
   - Players: Upsert by `playerDkId`
   - Player Pool Entries: Upsert by composite key
4. **Activity Logging**: Records all operations with metrics
5. **Error Handling**: Comprehensive error capture and reporting

### Key Features

- **Idempotent Imports**: Safe to re-import same week/draft group
- **Batch Processing**: Efficient database operations
- **Error Resilience**: Continues processing on individual failures
- **Activity Tracking**: Complete audit trail of all operations

## Database Migration

### Running the Migration

1. **Backup**: Existing data is automatically backed up
2. **Schema Update**: Tables are recreated with new structure
3. **Data Restoration**: Sample data is provided for testing

```bash
cd backend
python3 migrate_to_draftkings_models.py
```

### Migration Safety

- **Automatic Backup**: Creates backup tables before changes
- **Rollback Support**: Database rollback on failure
- **Idempotent**: Safe to run multiple times

## Frontend Integration

### ImportExportManager Component

The component now provides:

- **Real-time Import**: Direct API integration
- **Progress Tracking**: Import status and results
- **Activity History**: Recent operations with details
- **Error Display**: Clear error reporting and guidance

### Key UI Features

- **Import Summary**: Visual display of import results
- **Activity Feed**: Real-time operation history
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on all device sizes

## Configuration

### Environment Variables

No additional environment variables required - the DraftKings API is public.

### API Rate Limits

The service includes:
- **Timeout Handling**: 30-second request timeout
- **Error Retry**: Automatic retry with exponential backoff
- **Rate Limit Awareness**: Respects DraftKings API limits

## Testing

### Manual Testing

1. **Start Backend**: `python3 main.py`
2. **Start Frontend**: `npm run dev` (in web directory)
3. **Navigate**: Import/Export tab
4. **Test Import**: Use valid Draft Group ID

### Test Data

Sample Draft Group IDs for testing:
- Use contest API to find real IDs: `https://api.draftkings.com/contests/v1/contests/[CONTEST_ID]?format=json`
- Look for `draftGroupId` field in response

## Error Handling

### Common Error Scenarios

1. **Invalid Draft Group**: Clear error message with guidance
2. **API Unavailable**: Network error handling with retry
3. **Data Validation**: Invalid player data logging
4. **Database Constraints**: Duplicate entry handling

### Error Recovery

- **Partial Failures**: Continue processing valid records
- **Activity Logging**: All errors captured for debugging
- **User Feedback**: Clear error messages with next steps

## Performance Considerations

### Import Performance

- **Target**: <30 seconds for typical draft groups
- **Optimization**: Batch database operations
- **Monitoring**: Performance metrics in activity logs

### Database Performance

- **Indexes**: Optimized for common query patterns
- **Constraints**: Efficient unique constraint enforcement
- **JSON Storage**: Flexible schema for complex data

## Security

### Data Privacy

- **No Sensitive Data**: Only publicly available player information
- **API Access**: Public DraftKings API (no authentication required)
- **User Data**: Minimal user information stored

### Input Validation

- **Request Validation**: Pydantic schema validation
- **SQL Injection**: Parameterized queries
- **Data Sanitization**: Input cleaning and validation

## Monitoring and Logging

### Activity Tracking

Every import operation logs:
- **Timestamps**: Operation start/end times
- **Metrics**: Record counts and processing results
- **Errors**: Detailed error information
- **Performance**: Processing time and efficiency

### Debugging Support

- **Structured Logs**: JSON-formatted activity records
- **Error Details**: Complete error context and stack traces
- **API Responses**: Raw API data for troubleshooting

## Future Enhancements

### Planned Features

1. **Bulk Operations**: Multiple draft group imports
2. **Scheduled Imports**: Automated data refresh
3. **Advanced Filtering**: Player pool filtering and search
4. **Export Enhancements**: Additional export formats

### Scalability Improvements

1. **Async Processing**: Background job processing
2. **Caching**: API response caching
3. **Queue Management**: Import job queuing
4. **Monitoring**: Real-time performance metrics

## Troubleshooting

### Common Issues

1. **Import Fails**: Check Draft Group ID validity
2. **Database Errors**: Verify migration completion
3. **API Timeouts**: Check network connectivity
4. **Schema Mismatches**: Ensure models are up to date

### Debug Commands

```bash
# Check database schema
sqlite3 dfs_app.db ".schema"

# View recent activity
sqlite3 dfs_app.db "SELECT * FROM recent_activity ORDER BY timestamp DESC LIMIT 10;"

# Check player count
sqlite3 dfs_app.db "SELECT COUNT(*) FROM players;"
```

## Support

### Getting Help

1. **Check Logs**: Review backend console output
2. **Activity History**: View import/export activity
3. **Error Details**: Examine error messages and context
4. **Database State**: Verify data integrity

### Reporting Issues

Include in bug reports:
- **Error Message**: Complete error text
- **Draft Group ID**: Used for import
- **Week**: Selected week
- **Activity Log**: Relevant activity entries
- **Backend Logs**: Console output during error
