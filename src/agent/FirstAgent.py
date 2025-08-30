from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
import matplotlib.pyplot as plt
from f1_api.f1_fetch import get_laps_data
from pathlib import Path
from agent.Agent_output_parameters import Agent_output_parameters
from agent.PlotHelper import PlotHelper

class FirstAgent:

    def __init__(self, model_name):
        self.model = OllamaLLM(model=model_name)
        self.output_parser = PydanticOutputParser(pydantic_object=Agent_output_parameters)
        self.format_instructions = self.output_parser.get_format_instructions()
        current_dir = Path(__file__).parent  # diretório deste arquivo
        prompt_path = current_dir / "FirstAgentPrompt.txt"
        self.template = prompt_path.read_text()
        self.prompt = ChatPromptTemplate.from_template(self.template)
        self.chain = self.prompt | self.model | self.output_parser
        self.plot = PlotHelper()

    def generate_response(self, question):
        result = self.chain.invoke({
            "question": question, 
            "format_instructions": self.format_instructions
            })
        params = result.model_dump()
        print(params)

        if params.get("action") == "execute":
            self.fetch_api(params)
        else:
            pass

        return params


    def fetch_api(self, params):
        resp_json = get_laps_data(params)
        times = [data.get("lap_duration") for data in resp_json]
        self.plot.Plot_laptimes(times,10)
        return times



    def print_chart(self):
        fig,ax = plt.subplots(figsize=(10,10))
        plt.show()
        