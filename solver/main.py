from src.agent.FirstAgent import FirstAgent
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
agent = FirstAgent("llama3.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"], 
    allow_headers=["*"]
)

@app.get("/healthcheck")
async def healthcheck():
    return {"response": "alive"}


@app.post("/solve")
async def solve(payload: dict = Body(...)):
    prompt = payload.get("prompt", "")
    return {"response": "badaba"}