from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Simple test API working"}

@app.get("/test")
def test():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

