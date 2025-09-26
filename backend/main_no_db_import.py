from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load environment variables from .env file
from load_env import load_env_file
load_env_file()

app = FastAPI(
    title="DFS Lineup Manager API",
    description="API for Daily Fantasy Sports Lineup Management",
    version="1.0.0",
    redirect_slashes=False
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:3005",
        "https://dfs-lineup-manager.vercel.app",
        "https://dfs-lineup-manager-tvenis-troys-projects-26f617b4.vercel.app",
        "https://dfs-lineup-manager-git-main-tvenis-troys-projects-26f617b4.vercel.app",
        "https://dfs-lineup-manager-git-develop-tvenis-troys-projects-26f617b4.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "DFS Lineup Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/players")
async def get_players():
    return {"message": "Players endpoint working", "data": []}

@app.get("/api/comments")
async def get_comments():
    return {"message": "Comments endpoint working", "data": []}

@app.post("/api/comments/quick")
async def quick_comment(data: dict):
    return {"ok": True, "message": "Quick comment endpoint working", "comment_id": 1}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
