import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from agent.FirstAgent import FirstAgent


def test_get_req_params():
    agent = FirstAgent("llama3.2")
    assert agent.get_req_params(
        "I would like to compare the lap times from drivers with number 63 and 54 for the session key 9161"
        ) == {'driver_number': [63, 54], 'session_key': [9161]}

