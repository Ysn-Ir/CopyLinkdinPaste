import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, Set

logger = logging.getLogger("radar.events")


class EventBroadcaster:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        logger.info(f"SSE client connected. Total active subscribers: {len(self._subscribers)}")
        try:
            # Yield initial connection confirmation
            yield f"data: {json.dumps({'type': 'CONNECTED', 'message': 'RADAR real-time event stream active'})}\n\n"
            while True:
                try:
                    # Timeout every 15s to send keepalive ping
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.discard(queue)
            logger.info(f"SSE client disconnected. Remaining subscribers: {len(self._subscribers)}")

    def broadcast(self, event_type: str, payload: Dict[str, Any]):
        """Dispatches event to all active real-time subscribers."""
        event = {
            "type": event_type,
            "data": payload
        }
        dead_queues = []
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead_queues.append(q)
            except Exception:
                dead_queues.append(q)
        for dq in dead_queues:
            self._subscribers.discard(dq)


# Global broadcaster instance
broadcaster = EventBroadcaster()
