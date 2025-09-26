from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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
    return {"message": "DFS Lineup Manager API - Simple Version", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "Simple API is working"}

@app.get("/debug/env")
async def debug_env():
    import os
    return {
        "DATABASE_URL": "SET" if os.getenv("DATABASE_URL") else "NOT SET",
        "STORAGE_URL": "SET" if os.getenv("STORAGE_URL") else "NOT SET", 
        "DATABASE_DATABASE_URL": "SET" if os.getenv("DATABASE_DATABASE_URL") else "NOT SET",
        "LOCAL_DATABASE_URL": "SET" if os.getenv("LOCAL_DATABASE_URL") else "NOT SET",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
