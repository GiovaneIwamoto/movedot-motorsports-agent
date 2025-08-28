from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate, prompt
import requests


class SimpleAgent:

    def __init__(self,model_name):
        self.model = OllamaLLM(model="llama3.2")
    
        self.parameters = """
        brake
        date
        driver_number
        drs
        meeting_key
        n_gear
        rpm
        session_key
        speed
        throttle
        lap_number
        """

        self.template = """
        You are a motorsport data assistant.

        Your task is to read the user's question written in natural English and extract any of the following parameters if they are mentioned:

        - session_key,
        - driver_number,
        - lap_number,
        - brake, 
        - date, 
        - drs, 
        - meeting_key, 
        - n_gear, 
        - rpm, 
        - speed, 
        - throttle

        Return all found parameters as a JSON object, using the exact parameter names above.
        Here are some key rules:
        - NEVER include null values
        - If a parameter is not mentioned in the question, omit it.
        - DO NOT include any explanations, commentary, or extra text—only the JSON object.


        Question: {question}
        """



        self.prompt = ChatPromptTemplate.from_template(self.template)
        self.chain = self.prompt | self.model

        
    def generate_response(self,question):
        result = self.chain.invoke({"parameters":self.parameters, "question": question})
        print(result)
        return result

if __name__ == "__main__":
    agent = SimpleAgent("llama3.2")
    agent.generate_response("I would like to know information about session key 30, about driver number 30 on lap number 25 with no DRS.")
    # while True:
    #     question = input("Ask your question (q to quit):")
    #     if question == "q":
    #         break

    #     agent.generate_response(question)