from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

message = "hello world"

class Message(BaseModel):
    new_message: str

@app.get("/")
def get_message():
    return {"message": message}

@app.post("/change-message")
def change_message(data: Message):
    global message
    message = data.new_message

    return {
        "success": True,
        "new_message": message
    }