from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DFS Lineup Manager API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "DFS Lineup Manager API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/test")
def test_endpoint():
    return {"message": "Test endpoint working"}

@app.post("/api/comments/quick")
def add_quick_comment(data: dict):
    return {
        "ok": True, 
        "comment_id": 123, 
        "message": "Quick comment endpoint working"
    }

# Export for Vercel
handler = app

