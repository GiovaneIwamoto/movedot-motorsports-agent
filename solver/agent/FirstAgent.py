from pathlib import Path

import json
import matplotlib.pyplot as plt
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser, CommaSeparatedListOutputParser

from f1_api.f1_fetch import get_laps_data
from agent.Agent_output_parameters import Agent_output_parameters
from langchain.chains import LLMChain


class FirstAgent:
    def __init__(self, model_name: str):
        self.model = OllamaLLM(model=model_name, temperature=0)
        current_dir = Path(__file__).parent
        prompt_path = current_dir / "FirstAgentPrompt.txt"
        self.template = prompt_path.read_text()
        self.prompt = ChatPromptTemplate.from_template(self.template)
        self.parser = PydanticOutputParser(pydantic_object=Agent_output_parameters)

    def identify_task(self,question):
        chain = self.prompt | self.model
        response = chain.invoke({
            "question": question
        })
        return response


    def task_handler(self,question,task):
        if task == "plot":
            json_data = self.plot_task(question)
            

    def plot_task(self,question):
        json_data = self.get_req_params(question)
        print(f"structured data: {json_data}")
        relevant_answer_fields = self.filter_data(question)
        print(f"answer_fields: {relevant_answer_fields}")
        api_data = self.fetch_api(json_data)
        print(f"API data: {api_data}")



    def get_req_params(self, question: str) -> dict:
        function_prompt = f"""
        You are an assistant that extracts parameters from natural language questions about F1 laps.
        Return only a JSON with the keys and values explicitly mentioned in the question.

        Keys must match exactly the Pydantic model:
        {list(Agent_output_parameters.__annotations__.keys())}

        Rules:
        1. Only include keys if mentioned in the question.
        2. Never invent or guess values.
        3. Respond with valid JSON only, no explanations.
        4. All values must be lists, even if a single value.
        5. Be extra carefull to not mismatch parameters

        Question: {question}
        """

        prompt_template = ChatPromptTemplate.from_template(function_prompt)
        chain = prompt_template | self.model | self.parser

        result: Agent_output_parameters = chain.invoke({"question": question})

        return result.dict()


    def fetch_api(self, params: dict) -> dict:
        """
        Call the API using structured parameters and return raw data.
        """
        return get_laps_data(params)


    def filter_data(self, question: str) -> list[str]:
        schema_example_str = """
            {{
                "date_start": "2023-09-16T13:59:07.606000+00:00",
                "driver_number": 63,
                "duration_sector_1": 26.966,
                "duration_sector_2": 38.657,
                "duration_sector_3": 26.12,
                "i1_speed": 307,
                "i2_speed": 277,
                "is_pit_out_lap": false,
                "lap_duration": 91.743,
                "lap_number": 8,
                "meeting_key": 1219,
                "segments_sector_1": [2049, 2049, 2049, 2051, 2049, 2051, 2049, 2049],
                "segments_sector_2": [2049, 2049, 2049, 2049, 2049, 2049, 2049, 2049],
                "segments_sector_3": [2048, 2048, 2048, 2048, 2048, 2064, 2064, 2064],
                "session_key": 9161,
                "st_speed": 298
            }}
            """


        filter_prompt = f"""
        You are an agent that must filter API fetch data to simply answer a user question.
        You must understand which fields are necessary from the API response to answer the question,
        considering you already have the data.

        User question:
        {question}

        Example of one record returned by the API:
        {schema_example_str}

        Task:
        - Identify which keys from this example are the most relevant
        to visualize in a graph that answers the user question.
        - Return only the keys as a list, separated by commas. Do not add explanations.
        """

        parser = CommaSeparatedListOutputParser()

        prompt_template = ChatPromptTemplate.from_template(filter_prompt)

        chain = prompt_template | self.model | parser

        # Passa o dict com a variável do template
        result: list[str] = chain.invoke({"question": question,
                                          "schema_example_str":schema_example_str})

        return result

    def plot_data(self, question: str, data: dict) -> str:
        """
        Ask the model to generate complete Python code (matplotlib) 
        that plots the given data according to the user question.
        """
        plot_prompt = f"""
        You just received the following user question:
        {question}

        Here is the data from the API in JSON format:
        {data}

        Task:
        - Decide the best type of chart to represent this data.
        - Answer ONLY with Python code using matplotlib.
        - The code must be complete and ready to run (include imports).
        """

        response = self.model.invoke(plot_prompt)
        return response
    

