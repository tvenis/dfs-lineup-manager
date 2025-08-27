# Database Setup for DFS App Player Pool

This guide explains how to set up and test the database connection for the Player Pool screen with the enhanced Week model.

## Prerequisites

1. **Python 3.8+** installed
2. **SQLite** (included with Python)
3. **FastAPI** backend running

## Database Structure

The Player Pool screen connects to these main database tables:

- **`teams`** - NFL teams with abbreviations
- **`players`** - Individual players with positions (QB, RB, WR, TE, DST)
- **`weeks`** - Enhanced game weeks with comprehensive tracking
- **`player_pool_entries`** - Player availability for specific weeks with salary, projections, etc.

## Enhanced Week Model

The new Week model includes comprehensive tracking:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Sequential auto-incrementing primary key |
| `week_number` | Integer | Week number (1-18 for regular season) |
| `year` | Integer | Season year (e.g., 2024, 2025) |
| `start_date` | Date | Start of the week (Thursday) |
| `end_date` | Date | End of the week (Tuesday) |
| `game_count` | Integer | Number of games in this week |
| `status` | String | 'Completed', 'Active', or 'Upcoming' |
| `notes` | Text | Optional week-specific notes |
| `imported_at` | DateTime | When data was imported |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

## Key Business Rules

1. **FLEX Position**: Automatically pulls in RB, WR, and TE players
2. **Player Status**: Can be "Available", "Questionable", "Doubtful", "Out"
3. **Exclusions**: Players can be excluded from lineup consideration
4. **Week-based**: All player data is organized by game week
5. **Week Status**: Automatic status determination based on current date
6. **Sequential IDs**: Weeks use auto-incrementing integers for better performance

## Setup Instructions

### 1. Database Migration (if upgrading from old model)

If you have an existing database with the old Week model, run the migration:

```bash
cd backend
python migrate_week_model.py
```

This will:
- Create a backup of your current database
- Update the schema to the new Week model
- Migrate existing data
- Update related tables to use Integer week_id

### 2. Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API will be available at `http://localhost:8000`

### 3. Test Database Connection

Run the new test script to verify everything is working:

```bash
cd backend
python test_new_week_model.py
```

This script will:
- Create sample teams (NE, BUF, MIA, etc.)
- Create sample players (Mahomes, Allen, McCaffrey, etc.)
- Create sample weeks for the 2024 season with proper dates and status
- Create player pool entries with salaries and projections
- Test the new API endpoints

### 4. View Database Graphically

**Recommended: DB Browser for SQLite**
- Download from: https://sqlitebrowser.org/
- Free, open-source, cross-platform
- Open `dfs_app.db` from the backend directory
- Browse tables, run queries, view relationships

**Alternative: SQLite Studio**
- Download from: https://sqlitestudio.pl/
- Another excellent free option

## API Endpoints

### Enhanced Week Management
- `GET /api/weeks/` - List all weeks with filtering (year, status)
- `GET /api/weeks/current` - Get the current active week
- `POST /api/weeks/` - Create a new week
- `POST /api/weeks/bulk` - Create multiple weeks at once
- `PUT /api/weeks/{week_id}` - Update week details
- `PUT /api/weeks/{week_id}/status` - Update just the status
- `DELETE /api/weeks/{week_id}` - Delete a week (if no associated data)

### Player Pool
- `GET /api/players/pool/{week_id}` - Get all players for a week
- `PUT /api/players/pool/{entry_id}` - Update player exclusion/status
- `PUT /api/players/pool/bulk-update` - Bulk update multiple players

### Players
- `GET /api/players/` - List all players
- `POST /api/players/` - Create a new player

## Testing the Player Pool Screen

1. **Start the backend**: `python main.py`
2. **Start the frontend**: `npm run dev` (in web directory)
3. **Navigate to**: `/players` page
4. **Select a year** from the year dropdown
5. **Select a week** from the week dropdown (shows status badges)
6. **View week details** including date range, game count, and status
7. **View players** organized by position tabs
8. **Test exclusions** by checking/unchecking players
9. **Test FLEX tab** - should show RB/WR/TE combined

## Week Status Logic

The system automatically determines week status:

- **Upcoming**: Week hasn't started yet
- **Active**: Current week (today falls between start_date and end_date)
- **Completed**: Week has ended

## Troubleshooting

### Common Issues

1. **"Failed to fetch weeks"**
   - Check if backend is running on port 8000
   - Verify database file exists (`dfs_app.db`)
   - Run migration if upgrading from old model

2. **"No players found"**
   - Run `python test_new_week_model.py` to create sample data
   - Check if weeks exist in the database
   - Verify week_id relationships are correct

3. **Migration errors**
   - Ensure no other processes are using the database
   - Check backup file was created
   - Restart backend after migration

4. **CORS errors**
   - Backend CORS is configured for localhost:3000-3002
   - Make sure frontend is running on one of these ports

### Database Reset

To start fresh:

```bash
cd backend
rm dfs_app.db
python main.py     # This will recreate tables with new schema
python test_new_week_model.py  # Add sample data
```

## Sample Queries

### View Week Information
```sql
SELECT 
    week_number,
    year,
    start_date,
    end_date,
    game_count,
    status
FROM weeks 
WHERE year = 2024 
ORDER BY week_number;
```

### View Player Pool for Current Week
```sql
SELECT 
    p.name,
    p.position,
    t.abbreviation as team,
    ppe.salary,
    ppe.avg_points,
    ppe.excluded,
    w.week_number,
    w.status as week_status
FROM player_pool_entries ppe
JOIN players p ON ppe.player_id = p.id
JOIN teams t ON p.team_id = t.id
JOIN weeks w ON ppe.week_id = w.id
WHERE w.status = 'Active'
ORDER BY p.position, ppe.avg_points DESC;
```

### Count Players by Position and Week Status
```sql
SELECT 
    p.position,
    w.week_number,
    w.status as week_status,
    COUNT(*) as player_count,
    AVG(ppe.salary) as avg_salary
FROM player_pool_entries ppe
JOIN players p ON ppe.player_id = p.id
JOIN weeks w ON ppe.week_id = w.id
WHERE w.year = 2024
GROUP BY p.position, w.week_number, w.status
ORDER BY w.week_number, p.position;
```

## Next Steps

Once the enhanced Player Pool screen is working:

1. **Import real CSV data** using the CSV import endpoint
2. **Set up full season** with all 18 weeks
3. **Implement week status automation** for ongoing seasons
4. **Add player search** and advanced filtering
5. **Connect to lineup builder** for roster construction
6. **Add historical data** for completed weeks
