from pydantic import BaseModel
from typing import Optional

class Agent_output_parameters(BaseModel):
    action: Optional[str] = None   # "execute" ou "chart"
    session_key: Optional[str] = None
    driver_number: Optional[str] = None
    lap_number: Optional[str] = None
    brake: Optional[str] = None
    date: Optional[str] = None
    drs: Optional[str] = None
    meeting_key: Optional[str] = None
    n_gear: Optional[str] = None
    rpm: Optional[str] = None
    speed: Optional[str] = None
    throttle: Optional[str] = None