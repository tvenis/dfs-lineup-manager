# DFS Lineup Manager Backend

A FastAPI-based backend for the DFS Lineup Manager application, providing a robust API for managing daily fantasy sports lineups, players, and data.

## 🏗️ Architecture

- **Framework**: FastAPI with Python 3.11+
- **Database**: SQLite (development) / PostgreSQL (production via Supabase)
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic schemas
- **Authentication**: Ready for JWT integration

## 📊 Data Model

The backend implements a clean, normalized data model:

- **Player**: Persistent player information (name, position, team)
- **Team**: NFL team information
- **Week**: Week-specific data containers
- **PlayerPoolEntry**: Week-specific player data (salary, projections, status)
- **Lineup**: User-created lineups with validation
- **Comment**: Player notes and analysis

### Key Features

- **Separation of Concerns**: Persistent player data vs. week-specific pool entries
- **Flexible Lineup Structure**: Support for different contest types and game styles
- **Real-time Validation**: Lineup validation with salary cap and position rules
- **CSV Import**: Bulk player data import with error handling

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Initialization

```bash
# Initialize database with sample data
python init_db.py
```

### 3. Start the Server

```bash
# Development server
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## 📚 API Endpoints

### Players
- `GET /api/players` - List players with filtering
- `POST /api/players` - Create new player
- `GET /api/players/{player_id}` - Get player details
- `PUT /api/players/{player_id}` - Update player
- `DELETE /api/players/{player_id}` - Delete player

### Player Pool
- `GET /api/players/pool/{week_id}` - Get week's player pool
- `POST /api/players/pool` - Add player to pool
- `POST /api/players/pool/bulk` - Bulk import players

### Lineups
- `GET /api/lineups` - List lineups
- `POST /api/lineups` - Create lineup
- `GET /api/lineups/{lineup_id}` - Get lineup details
- `PUT /api/lineups/{lineup_id}` - Update lineup
- `DELETE /api/lineups/{lineup_id}` - Delete lineup
- `POST /api/lineups/validate` - Validate lineup configuration

### CSV Import
- `POST /api/csv/upload` - Upload CSV file
- `GET /api/csv/template` - Get CSV template
- `GET /api/csv/weeks` - List available weeks
- `POST /api/csv/week` - Create new week

## 🗄️ Database Schema

### Core Tables

```sql
-- Teams
teams (id, name, abbreviation, created_at, updated_at)

-- Players (persistent)
players (id, name, position, team_id, stats, created_at, updated_at)

-- Weeks
weeks (id, notes, imported_at, created_at, updated_at)

-- Player Pool Entries (week-specific)
player_pool_entries (id, week_id, player_id, salary, avg_points, game_info, status, excluded)

-- Lineups
lineups (id, week_id, name, tags, game_style, slots, salary_used, created_at, updated_at)

-- Comments
comments (id, player_id, content, created_at, updated_at)
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   └── routers/             # API route handlers
│       ├── __init__.py
│       ├── players.py        # Player & pool management
│       ├── lineups.py        # Lineup operations
│       └── csv_import.py     # CSV import functionality
├── main.py                  # FastAPI application
├── init_db.py              # Database initialization
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file for configuration:

```env
# Database
DATABASE_URL=sqlite:///./dfs_app.db

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Database URLs

- **SQLite (Development)**: `sqlite:///./dfs_app.db`
- **PostgreSQL (Production)**: `postgresql://user:pass@localhost/dfs_app`

## 🧪 Testing

### Manual Testing

1. **Start the server**: `python main.py`
2. **Visit API docs**: `http://localhost:8000/docs`
3. **Test endpoints** using the interactive Swagger UI

### Sample API Calls

```bash
# Get all players
curl http://localhost:8000/api/players

# Get player pool for week
curl http://localhost:8000/api/players/pool/2024-WK01

# Create a lineup
curl -X POST http://localhost:8000/api/lineups \
  -H "Content-Type: application/json" \
  -d '{
    "id": "lineup1",
    "week_id": "2024-WK01",
    "name": "My First Lineup",
    "slots": {
      "QB": "QB001",
      "RB1": "RB001",
      "RB2": "RB002",
      "WR1": "WR001",
      "WR2": "WR002",
      "WR3": "WR003",
      "TE": "TE001",
      "FLEX": "RB003",
      "DST": "DST001"
    }
  }'
```

## 🚀 Production Deployment

### Supabase Integration

1. **Create Supabase project**
2. **Update database URL** in `.env`
3. **Run migrations** on production database
4. **Deploy** to your preferred hosting service

### Docker Support

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔒 Security Features

- **Input Validation**: Pydantic schema validation
- **SQL Injection Protection**: SQLAlchemy ORM
- **CORS Configuration**: Configurable cross-origin requests
- **Rate Limiting**: Ready for integration
- **Authentication**: JWT-ready architecture

## 📈 Performance

- **Async Support**: FastAPI async/await
- **Database Optimization**: Efficient queries with SQLAlchemy
- **Caching Ready**: Redis integration ready
- **Connection Pooling**: Database connection management

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **API Documentation**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

## 🔮 Future Enhancements

- [ ] JWT Authentication
- [ ] Redis Caching
- [ ] WebSocket Support
- [ ] Advanced Analytics
- [ ] Export Functionality
- [ ] Contest Management
- [ ] Performance Tracking
