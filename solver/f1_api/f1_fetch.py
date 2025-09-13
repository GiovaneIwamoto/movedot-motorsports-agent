import requests

def get_laps_data(params):
    filtered_params = {k: v for k, v in params.items()}
    response = requests.get(
            "https://api.openf1.org/v1/laps",
            params=filtered_params
        )
    return response.json()