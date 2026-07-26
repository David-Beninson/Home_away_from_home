import json
from collections import defaultdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["notifications"])

class ConnectionManager:
    def __init__(self):
        # Stores active connections: { user_id: [websocket_object, ...] }
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        user_key = str(user_id)
        self.active_connections[user_key].append(websocket)
        print(f"User {user_key} connected to notifications (Active tabs: {len(self.active_connections[user_key])}).")

    def disconnect(self, websocket: WebSocket, user_id: str):
        user_key = str(user_id)
        if user_key in self.active_connections:
            if websocket in self.active_connections[user_key]:
                self.active_connections[user_key].remove(websocket)
            if not self.active_connections[user_key]:
                del self.active_connections[user_key]
            print(f"User {user_key} socket disconnected.")

    async def send_personal_notification(self, message: dict, user_id: str):
        user_key = str(user_id)
        if user_key in self.active_connections:
            dead_sockets = []
            for ws in list(self.active_connections[user_key]):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"Failed to send notification to user {user_key}: {e}")
                    dead_sockets.append(ws)
            
            for ws in dead_sockets:
                self.disconnect(ws, user_key)

# Global instance to be imported by other features (bookings, chat, etc.)
manager = ConnectionManager()

@router.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data:
                try:
                    parsed = json.loads(data)
                    if parsed.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"Unexpected error in notification socket for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)