"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
import os
import json
from datetime import datetime
from typing import Any, Dict, Optional, List
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.tools import tool

# --- ADICIONE ESTES IMPORTS DO PYDANTIC ---
from pydantic import BaseModel, Field# ------------------------------------------

from ..config import get_openai_client, get_settings
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

# Constants
DEFAULT_RECURSION_LIMIT = 50
DEFAULT_THREAD_ID = "analytics_agent_session"
DEFAULT_AGENT_NAME = "analytics_agent"

logger = logging.getLogger(__name__)

# --- DEFINIÇÃO DO SCHEMA RÍGIDO (O Agente é obrigado a seguir isso) ---
class KPIInput(BaseModel):
    title: str = Field(description="Título da métrica. Ex: 'Velocidade Máxima', 'Volta Mais Rápida'")
    value: str = Field(description="O valor numérico ou curto. Ex: '320', '1:45.00'")
    unit: str = Field(description="Unidade de medida (opcional). Ex: 'km/h', 'seg'", default="")
    color: str = Field(description="Cor do destaque: 'blue', 'red', 'green', 'yellow'", default="blue")

@tool(args_schema=KPIInput)
def display_kpi(title: str, value: str, unit: str = "", color: str = "blue"):
    """
    Use esta ferramenta SEMPRE que encontrar números importantes (velocidade, tempo, pontuação) 
    que mereçam destaque visual na dashboard. Preencha título e valor obrigatoriamente.
    """
    # O retorno aqui é apenas informativo para o histórico do chat
    return f"[KPI Renderizado: {title} = {value} {unit}]"
# -----------------------------------------------------------------------


def _prepare_agent_config(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Ensure the agent config contains required defaults."""
    prepared: Dict[str, Any] = dict(config or {})
    prepared.setdefault("recursion_limit", DEFAULT_RECURSION_LIMIT)

    configurable = dict(prepared.get("configurable") or {})
    configurable.setdefault("thread_id", DEFAULT_THREAD_ID)
    prepared["configurable"] = configurable

    return prepared


class AnalyticsAgentManager:
    """Singleton class to manage the analytics agent instance."""
    
    _instance: Optional['AnalyticsAgentManager'] = None
    _agent: Optional[Any] = None
    _logging_configured: bool = False
    
    def __new__(cls) -> 'AnalyticsAgentManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _configure_logging(self) -> None:
        """Configure logging if not already done."""
        if not self._logging_configured:
            settings = get_settings()
            logging.basicConfig(
                level=getattr(logging, settings.log_level.upper()),
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            logger.info(f"Logging configured with level: {settings.log_level}")
            self._logging_configured = True
    
    def get_agent(self, force_reload: bool = False) -> Any:
        """Get or create the analytics agent."""
        if self._agent is None or force_reload:
            from ..tools import get_all_tools
            
            # Setup LangSmith tracing
            self._setup_langsmith_tracing()
            
            # Get current date for temporal context
            current_date = datetime.now().strftime("%Y-%m-%d")
            
            # Format the prompt with temporal context
            formatted_prompt = ANALYTICS_AGENT_PROMPT.format(current_date=current_date)
            
            llm = get_openai_client()
            
            # ADICIONAMOS A FERRAMENTA NOVA AQUI
            existing_tools = get_all_tools()
            tools = existing_tools + [display_kpi]
            
            self._agent = create_react_agent(
                model=llm,
                tools=tools,
                prompt=formatted_prompt,
                checkpointer=InMemorySaver(),
                name=DEFAULT_AGENT_NAME
            )
            
            action = "reloaded" if force_reload else "created"
            logger.info(f"Analytics agent {action} with LangSmith tracing and current date: {current_date}")
        
        return self._agent
    
    def _setup_langsmith_tracing(self):
        """Setup LangSmith tracing with environment variables."""
        settings = get_settings()
        
        if settings.langsmith_api_key:
            # Set environment variables for LangSmith
            os.environ["LANGSMITH_TRACING"] = "true"
            os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
            os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
            logger.info(f"LangSmith tracing enabled for project: {settings.langsmith_project}")
        else:
            logger.warning("LangSmith API key not configured. Tracing disabled.")
    
    def reload_agent(self) -> Any:
        """Reload the analytics agent."""
        return self.get_agent(force_reload=True)


# Global manager instance
_agent_manager = AnalyticsAgentManager()


def _setup_logging():
    """Setup logging configuration."""
    _agent_manager._configure_logging()


def get_analytics_agent(force_reload: bool = False) -> Any:
    """Get or create the analytics agent."""
    return _agent_manager.get_agent(force_reload)


def reload_analytics_agent() -> Any:
    """Reload the analytics agent."""
    return _agent_manager.reload_agent()


def invoke_analytics_agent(message: str, config: Optional[Dict[str, Any]] = None) -> str:
    """Invoke the analytics agent with a message."""
    if not message or not message.strip():
        raise ValueError("Message cannot be empty")
    
    config = _prepare_agent_config(config)

    try:
        agent = get_analytics_agent()
        
        response = agent.invoke(
            {"messages": [{"role": "user", "content": message}]},
            config
        )
        
        if not response or "messages" not in response or not response["messages"]:
            raise RuntimeError("Invalid response from agent")
        
        return response["messages"][-1].content
        
    except Exception as e:
        logger.error(f"Failed to invoke analytics agent: {str(e)}")
        raise RuntimeError(f"Agent invocation failed: {str(e)}") from e


async def stream_analytics_agent_with_history(messages_history: list, config: Optional[Dict[str, Any]] = None):
    if not messages_history:
        raise ValueError("Messages history cannot be empty")
    
    # 1. INCENTIVO: Lembramos o agente de usar a ferramenta visual
    system_reminder = {
        "role": "system", 
        "content": "Se você tiver números concretos (velocidade, tempo, posições), USE a ferramenta 'display_kpi' para mostrá-los visualmente. Não esconda os números apenas no texto."
    }
    messages_to_process = messages_history + [system_reminder]

    config = _prepare_agent_config(config)

    try:
        agent = get_analytics_agent()
        
        # Buffer para acumular o JSON fragmentado
        kpi_buffer = ""
        is_collecting_kpi = False

        async for chunk, metadata in agent.astream(
            {"messages": messages_to_process},
            config,
            stream_mode="messages"
        ):
            # A. Se for Texto normal (Content)
            if getattr(chunk, 'content', None):
                # Se tínhamos um KPI pendente e chegou texto novo, tenta descarregar o KPI antes
                if is_collecting_kpi and kpi_buffer:
                    try:
                        kpi_args = json.loads(kpi_buffer)
                        yield ("kpi", kpi_args)
                        kpi_buffer = ""
                        is_collecting_kpi = False
                    except json.JSONDecodeError:
                        # JSON ainda incompleto ou corrompido, mantemos no buffer por segurança
                        pass
                
                yield ("token", {"content": chunk.content})

            # B. Processamento de Chunks de Ferramenta (A CORREÇÃO PRINCIPAL ESTÁ AQUI)
            tool_call_chunks = getattr(chunk, 'tool_call_chunks', [])
            
            if tool_call_chunks:
                for tc_chunk in tool_call_chunks:
                    # 1. Verifica se começou uma chamada da nossa ferramenta
                    # Nota: O nome geralmente vem só no primeiro chunk
                    if tc_chunk.get("name") == "display_kpi":
                        is_collecting_kpi = True
                        kpi_buffer = "" # Reseta buffer para nova chamada
                    
                    # 2. Se estamos coletando, acumula os argumentos (independente de ter nome no chunk ou não)
                    if is_collecting_kpi and tc_chunk.get("args"):
                        kpi_buffer += tc_chunk["args"]
            
            # C. Tentativa de processamento em tempo real (Opcional, mas ajuda se o JSON vier rápido)
            # Se o buffer parecer fechar um JSON '}', tentamos processar imediatamente
            if is_collecting_kpi and kpi_buffer and kpi_buffer.strip().endswith("}"):
                try:
                    kpi_args = json.loads(kpi_buffer)
                    print(f"\n🔥 [KPI DETECTADO]: {kpi_args}\n")
                    yield ("kpi", kpi_args)
                    # Limpeza após sucesso
                    kpi_buffer = "" 
                    is_collecting_kpi = False
                except json.JSONDecodeError:
                    # Falso positivo (ex: string interna contendo '}'), continua acumulando
                    pass

        # D. BLOCO PÓS-LOOP (CRUCIAL)
        # Se o loop acabar e ainda tivermos algo no buffer (ex: agente chamou a tool e parou de falar)
        if is_collecting_kpi and kpi_buffer:
            try:
                kpi_args = json.loads(kpi_buffer)
                print(f"\n🔥 [KPI FINAL]: {kpi_args}\n")
                yield ("kpi", kpi_args)
            except Exception as e:
                logger.error(f"Erro ao processar KPI residual: {str(e)}")

        # Finalização
        yield ("complete", {
            "status": "done", 
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Stream error: {str(e)}")
        yield ("error", {"error": str(e)})

def process_message(message: str, config: Optional[Dict[str, Any]] = None) -> str:
    """Process a message using the analytics agent."""
    _setup_logging()
    
    try:
        response = invoke_analytics_agent(message, config)
        logger.info("Response generated successfully")
        return response
        
    except Exception as e:
        logger.error(f"Unexpected error processing message: {str(e)}")
        return f"Unexpected error processing your request: {str(e)}"