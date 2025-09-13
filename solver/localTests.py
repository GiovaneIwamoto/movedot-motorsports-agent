from agent.FirstAgent import FirstAgent

if __name__ == "__main__":
    agent = FirstAgent("llama3.2")
    prompt = "I would like to compare the lap times from drivers with number 63 and 54 for the session key 9161"
    task = agent.identify_task(prompt)
    print(f"Task selected: {task}")
    agent.task_handler(prompt,task)
