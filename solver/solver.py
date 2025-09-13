from agent.FirstAgent import FirstAgent
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
agent = FirstAgent("llama3.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"], 
    allow_headers=["*"]
)

@app.post("/solve")
async def solve(payload: dict = Body(...)):
    prompt = payload.get("prompt", "")
    result = f"Resposta do python: {agent.get_req_params(prompt)}"
    return {"response": result}