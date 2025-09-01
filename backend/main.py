from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.database import engine
from app.models import Base
from app.routers import players, lineups, csv_import, teams, weeks, draftkings_import

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DFS Lineup Manager API",
    description="API for Daily Fantasy Sports Lineup Management",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3005"],
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

@app.get("/")
async def root():
    return {"message": "DFS Lineup Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
