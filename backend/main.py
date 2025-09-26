from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Load environment variables from .env file
from load_env import load_env_file
load_env_file()

# Import database conditionally to avoid errors in production
try:
    from app.database import engine
    from app.models import Base
    DATABASE_AVAILABLE = True
except Exception as e:
    print(f"Database not available: {e}")
    DATABASE_AVAILABLE = False
    engine = None
    Base = None

from app.routers import players, lineups, csv_import, teams, weeks, draftkings_import, projections, odds_api, games, contests, actuals, draftgroups, players_batch, tips, firecrawl, import_opponent_roster, comments

# Create database tables - moved to startup event

app = FastAPI(
    title="DFS Lineup Manager API",
    description="API for Daily Fantasy Sports Lineup Management",
    version="1.0.0",
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:3005",
        "https://dfs-lineup-manager.vercel.app",  # Correct production domain
        "https://dfs-lineup-manager-tvenis-troys-projects-26f617b4.vercel.app",  # Alternative domain
        "https://dfs-lineup-manager-git-main-tvenis-troys-projects-26f617b4.vercel.app",  # Git branch deployments
        "https://dfs-lineup-manager-git-develop-tvenis-troys-projects-26f617b4.vercel.app",  # Git branch deployments
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(lineups.router, prefix="/api/lineups", tags=["lineups"])
app.include_router(csv_import.router, prefix="/api/csv", tags=["csv"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(weeks.router, prefix="/api/weeks", tags=["weeks"])
app.include_router(draftkings_import.router, prefix="", tags=["draftkings-import"])
app.include_router(projections.router, prefix="", tags=["projections"])
app.include_router(odds_api.router, prefix="", tags=["odds-api"])
app.include_router(games.router, prefix="/api/games", tags=["games"]) 
app.include_router(contests.router, prefix="/api/contests", tags=["contests"])
app.include_router(actuals.router, prefix="", tags=["actuals"])
app.include_router(draftgroups.router, tags=["draftgroups"])
app.include_router(players_batch.router, prefix="", tags=["players-batch"])
app.include_router(tips.router, prefix="", tags=["tips"])
app.include_router(firecrawl.router, prefix="/api", tags=["firecrawl"])
app.include_router(import_opponent_roster.router, tags=["import-opponent-roster"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"]) 

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    if DATABASE_AVAILABLE and engine and Base:
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
    else:
        print("⚠️ Database not available, skipping table creation")

@app.get("/")
async def root():
    return {"message": "DFS Lineup Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/test")
async def test_endpoint():
    return {"message": "Test endpoint working", "database": DATABASE_AVAILABLE}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
