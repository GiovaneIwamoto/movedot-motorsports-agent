from pydantic import BaseModel
from typing import Optional,List
    
from typing import Optional, List
from pydantic import BaseModel

class Agent_output_parameters(BaseModel):
    date_start: Optional[List[str]] = []
    meeting_key: Optional[List[int]] = []
    session_key: Optional[List[int]] = []

    driver_number: Optional[List[int]] = []
    lap_number: Optional[List[int]] = []

    lap_duration: Optional[List[float]] = []
    duration_sector_1: Optional[List[float]] = []
    duration_sector_2: Optional[List[float]] = []
    duration_sector_3: Optional[List[float]] = []

    i1_speed: Optional[List[int]] = []
    i2_speed: Optional[List[int]] = []
    st_speed: Optional[List[int]] = []

    is_pit_out_lap: Optional[List[bool]] = []

    segments_sector_1: Optional[List[List[int]]] = []
    segments_sector_2: Optional[List[List[int]]] = []
    segments_sector_3: Optional[List[List[int]]] = []
