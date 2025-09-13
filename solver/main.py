from agent.FirstAgent import FirstAgent

if __name__ == "__main__":
    agent = FirstAgent("llama3.2")
    agent.generate_response(
        "I would like to know information about session key 9161, about driver number 63."
    )
    agent.generate_response(
        "I would like to know information about session key 9161, about driver number 23."
    )
    while(1):
        pass

