from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Load environment variables from .env file
try:
    from load_env import load_env_file
    load_env_file()
except ImportError:
    print("⚠️ load_env module not available, skipping .env file loading")

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

# Import routers conditionally to avoid database import errors
try:
    from app.routers import players, lineups, csv_import, teams, weeks, draftkings_import, projections, odds_api, games, contests, actuals, draftgroups, players_batch, tips, firecrawl, import_opponent_roster, comments, recent_activity, player_aliases, team_stats, game_results, weekly_summary, ownership_estimates, players_optimized
    ROUTERS_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Router imports failed: {e}")
    ROUTERS_AVAILABLE = False
    # Create empty router objects to avoid errors
    players = lineups = csv_import = teams = weeks = None
    draftkings_import = projections = odds_api = games = contests = None
    actuals = draftgroups = players_batch = tips = firecrawl = None
    players_optimized = None
    import_opponent_roster = comments = recent_activity = player_aliases = None
    team_stats = game_results = weekly_summary = ownership_estimates = None

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

# Include routers conditionally
if ROUTERS_AVAILABLE:
    if players: app.include_router(players.router, prefix="/api/players", tags=["players"])
    if players_optimized: app.include_router(players_optimized.router, prefix="/api/players", tags=["players-optimized"])
    if lineups: app.include_router(lineups.router, prefix="/api/lineups", tags=["lineups"])
    if csv_import: app.include_router(csv_import.router, prefix="/api/csv", tags=["csv"])
    if teams: app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
    if weeks: app.include_router(weeks.router, prefix="/api/weeks", tags=["weeks"])
    if draftkings_import: app.include_router(draftkings_import.router, prefix="", tags=["draftkings-import"])
    if projections: app.include_router(projections.router, prefix="", tags=["projections"])
    if odds_api: app.include_router(odds_api.router, prefix="", tags=["odds-api"])
    if games: app.include_router(games.router, prefix="/api/games", tags=["games"])
    if contests: app.include_router(contests.router, prefix="/api/contests", tags=["contests"])
    if actuals: app.include_router(actuals.router, prefix="", tags=["actuals"])
    if draftgroups: app.include_router(draftgroups.router, tags=["draftgroups"])
    if players_batch: app.include_router(players_batch.router, prefix="", tags=["players-batch"])
    if tips: app.include_router(tips.router, prefix="", tags=["tips"])
    if firecrawl: app.include_router(firecrawl.router, prefix="/api", tags=["firecrawl"])
    if import_opponent_roster: app.include_router(import_opponent_roster.router, tags=["import-opponent-roster"])
    if comments: app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
    if recent_activity: app.include_router(recent_activity.router, tags=["recent-activity"])
    if player_aliases: app.include_router(player_aliases.router, tags=["player-aliases"])
    if team_stats: app.include_router(team_stats.router, prefix="", tags=["team-stats"])
    if game_results: app.include_router(game_results.router, prefix="", tags=["game-results"])
    if weekly_summary: app.include_router(weekly_summary.router, prefix="", tags=["weekly-summary"])
    if ownership_estimates: app.include_router(ownership_estimates.router, prefix="", tags=["ownership-estimates"])
else:
    print("⚠️ Skipping router registration due to import failures") 

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
