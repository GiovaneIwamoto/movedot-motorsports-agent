<img width="1470" height="828" alt="demo_home_page_01" src="https://github.com/user-attachments/assets/7d1f3093-4dde-47dd-98fa-82ba599743e3" />
<img width="1470" height="718" alt="demo_home_page_02" src="https://github.com/user-attachments/assets/d304a1ba-7f4a-4391-8899-c439025ffafd" />
<img width="1470" height="714" alt="demo_home_page_03" src="https://github.com/user-attachments/assets/2da6c933-838b-46c5-8612-296d21387499" />
<img width="1470" height="640" alt="demo_home_page_04" src="https://github.com/user-attachments/assets/4cfaf099-5203-4a93-a28e-8e4def3ca9cc" />
<img width="1470" height="594" alt="demo_home_page_05" src="https://github.com/user-attachments/assets/c1652f9e-e733-44f9-a8a4-d4ce5f4656d8" />

## **OVERVIEW**

AI Agent for Data Analysts—a documentation-driven platform that autonomously discovers data sources through MCP servers, constructs API queries from schema analysis, and executes sophisticated data analysis in isolated Python sandboxes. Deliver production-grade insights through conversational interaction.

A ReAct orchestrator discovers your data landscape and builds domain knowledge from documentation, then delegates to specialized agents—an Analysis Agent for data fetching and transformation, a CodeAct Agent for autonomous code generation and execution in isolated sandboxes. Full observability across every reasoning step and action.

## Platform Capabilities

**Documentation-First Discovery**: Reads MCP resources (documentation) from MCP servers to understand data domains, entity relationships, and API endpoint structures before fetching data.

**MCP Integration**: Connect any data source through Model Context Protocol servers. Each MCP server provides documentation resources that teach the agent about your data domain.

**Smart Data Fetching**: Constructs complete API URLs based on documentation understanding. Automatically converts JSON responses to CSV and caches data for efficient reuse.

**Secure Sandbox Execution**: Executes Python analysis in isolated E2B sandboxes with pandas, numpy, matplotlib, and seaborn pre-installed. CSV files automatically mounted for instant access.

**Natural Language Interface**: Ask questions in plain English. The agent orchestrates multiple tools, reads documentation, fetches data, writes Python code, and presents insights—all conversationally.

**Technical Stack**: LangGraph ReAct agent with conversational memory, FastAPI with SSE streaming, persistent CSV memory, MCP client management, LangSmith integration for observability.

## Data Sources

The included OpenF1 MCP server demonstrates capabilities with 12 documented endpoints: Meetings, Sessions, Drivers, Car Data, Laps, Positions, Pit Stops, Intervals, Stints, Weather, Race Control, Team Radio.

Each endpoint includes MCP resources with schemas, query parameters, examples, and use cases. To add new sources: create an MCP server with resource endpoints, define MCP resources, register in configuration.

## Installation

**Prerequisites**: Python 3.9+, Git

**Setup**:
```bash
pip install -r requirements.txt
python install.py
```

**Start Services**:
```bash
./scripts/bin/run_mcp_openf1.sh  # MCP servers
./scripts/bin/run_web.sh         # Web interface (http://localhost:8000)
```

**Configuration**: API keys (OpenAI/Anthropic/E2B) can be configured via web interface. Optional env vars: `OPENAI_API_KEY`, `E2B_API_KEY`, `ANTHROPIC_API_KEY`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `E2B_SANDBOX_TIMEOUT` (default: 300), `DATA_DIR` (default: ./data), `LOG_LEVEL` (default: INFO).

**MCP Server Config**: Edit `scripts/mcp_server_config.json`:
```json
{
  "command": "python",
  "args": ["-m", "servers.mcp_openf1.server"],
  "env": {},
  "cwd": "."
}
```


## Technical Details

**Agent Prompt**: System prompt includes role definition, MCP architecture context, workflow guidelines, safety constraints, and Markdown formatting standards.

**MCP Integration**: MCP resources describe data domains, tools are auto-converted to LangChain tools.

**E2B Sandboxes**: Files uploaded to `/data/`, configurable timeouts, automatic cleanup, plots saved to `plots/`, pre-installed data science libraries.

**Adding Tools**: Create tool in `src/tools/` with `@tool` decorator, register in `src/tools/__init__.py`.

**Adding MCP Servers**: Create server directory with `server.py`, `resources.py`, and `docs/` folder with MCP resources. Implement MCP protocol with `list_resources()` and `read_resource()` handlers.

## Limitations

- E2B sandbox timeouts may interrupt long analyses
- MCP servers must start before web interface
- No built-in multi-user authentication
- Local plot storage (not centralized)
- File-based CSV memory (not for very large datasets)

**Security**: API keys in env vars, E2B isolation with execution costs, no rate limiting, user code executed in sandboxes, CORS enabled for local dev.

**Performance**: CSV caching, sandbox reuse, streaming responses, memory cache, async MCP operations.

## Troubleshooting

- **Agent not responding**: Check MCP servers running, verify API keys, check logs, ensure E2B quota
- **Data not fetching**: Verify MCP resources accessible, check MCP resource endpoint URLs, validate network
- **Sandbox errors**: Check E2B config in Settings, verify timeout, check Python syntax, verify quota
- **MCP connection issues**: Ensure server process running, check JSON config, verify Python path/imports

---

## **CONTACT & SUPPORT**

Whether you're a developer, data analyst, or researcher exploring or deploying the *AI Agent for Data Analysts*, I'm here to help and collaborate! Feel free to reach out for:

- General inquiries about the project
- Feature requests or suggestions
- Troubleshooting installation or usage issues

Email: [giovaneiwamoto@gmail.com](mailto:giovaneiwamoto@gmail.com)

You can also open an issue on GitHub for bug reports or enhancements.

---

## **LIKE THE PROJECT**

If you find this project useful or believe in its potential to enhance data analysis workflows, consider giving it a ★ **star** on GitHub — it really helps with visibility and community support!

---
