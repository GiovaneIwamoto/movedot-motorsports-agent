from pydantic import BaseModel
from typing import Optional
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
import matplotlib.pyplot as plt

class Parameters(BaseModel):
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


class SimpleAgent:

    def __init__(self, model_name):
        self.model = OllamaLLM(model=model_name)

        self.output_parser = PydanticOutputParser(pydantic_object=Parameters)
        self.format_instructions = self.output_parser.get_format_instructions()

        self.template = """
        You are a motorsport data assistant.

        Extract only the parameters mentioned in the question.
        Do not invent values.  
        If a parameter is not mentioned, just omit it.

        Additionally, decide the action:
        - Use "execute" if the user is asking for information about sessions, drivers, laps, DRS, or parameters.
        - Use "chart" if the user is asking to see or plot a chart/graph.

        Return ONLY valid JSON. 
        Do not include markdown, code fences, or explanations.

        {format_instructions}

        Question: {question}
        """

        self.prompt = ChatPromptTemplate.from_template(self.template)
        self.chain = self.prompt | self.model | self.output_parser

    def generate_response(self, question):
        result = self.chain.invoke({"question": question, "format_instructions": self.format_instructions})
        params = result.model_dump()
        print("Extracted params:", params)

        if params.get("action") == "chart":
            self.print_chart()
        else:
            self.execute_function(params)

        return params



    def execute_function(self, params: dict):
        if params.get("session_key"):
            print(f"Running for session {params['session_key']}, driver {params.get('driver_number')}, lap {params.get('lap_number')}")

    def print_chart(self):
        fig,ax = plt.subplots(figsize=(10,10))
        plt.show()
        


if __name__ == "__main__":
    agent = SimpleAgent("llama3.2")
    agent.generate_response(
        "I would like to know information about session key 30, about driver number 30 on lap number 25 with no DRS."
    )
    agent.generate_response(
        "Print a chart please."
    )
