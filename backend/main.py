from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.database import engine
from app.models import Base
from app.routers import players, lineups, csv_import, teams, weeks, draftkings_import, projections, odds_api, games, contests, actuals, draftgroups, players_batch, tips

# Create database tables
Base.metadata.create_all(bind=engine)

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
        "https://*.vercel.app",  # All Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
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
app.include_router(contests.router, prefix="", tags=["contests"])
app.include_router(actuals.router, prefix="", tags=["actuals"])
app.include_router(draftgroups.router, prefix="", tags=["draftgroups"])
app.include_router(players_batch.router, prefix="", tags=["players-batch"])
app.include_router(tips.router, prefix="", tags=["tips"]) 

@app.get("/")
async def root():
    return {"message": "DFS Lineup Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
