from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Initial message
message = "hello world"

# Request body model
class Message(BaseModel):
    new_message: str


# GET API
@app.get("/")
def get_message():
    return {"message": message}


# POST API
@app.post("/change-message")
def change_message(data: Message):
    global message
    message = data.new_message

    return {
        "success": True,
        "new_message": message
    }