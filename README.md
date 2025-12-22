<img width="1470" height="828" alt="demo_home_page_01" src="https://github.com/user-attachments/assets/7d1f3093-4dde-47dd-98fa-82ba599743e3" />
<img width="1470" height="718" alt="demo_home_page_02" src="https://github.com/user-attachments/assets/d304a1ba-7f4a-4391-8899-c439025ffafd" />
<img width="1470" height="714" alt="demo_home_page_03" src="https://github.com/user-attachments/assets/2da6c933-838b-46c5-8612-296d21387499" />
<img width="1470" height="640" alt="demo_home_page_04" src="https://github.com/user-attachments/assets/4cfaf099-5203-4a93-a28e-8e4def3ca9cc" />
<img width="1470" height="594" alt="demo_home_page_05" src="https://github.com/user-attachments/assets/c1652f9e-e733-44f9-a8a4-d4ce5f4656d8" />

## **OVERVIEW**

![LangChain](https://img.shields.io/badge/langchain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)

**AI Agent for Data Analysts**—a documentation-driven platform that learns how to fetch data from URLs and external data sources by reading documentation provided through *Model Context Protocol* servers. The agent autonomously discovers available data sources, reads MCP resources to understand data domains and API endpoint structures, then invokes appropriate fetch tools to retrieve and analyze data.

> [!NOTE]
> **How It Works**: MCP servers serve as documentation sources that teach the agent about data domains—explaining entity relationships, API endpoint formats, URL structures, and required parameters. The agent reads these MCP resources to learn how to construct valid API calls, then uses its `fetch_api_data` tool to retrieve data from the actual endpoints. 

This documentation-first approach ensures the agent understands both how to access data (URL construction, parameter formats) and how data is structured (entity schemas, relationships) before attempting to fetch it.

A **ReAct orchestrator** discovers your data landscape and builds domain knowledge from documentation, then delegates to specialized agents—an **Analysis Agent** for data fetching and transformation, a **CodeAct Agent** for autonomous code generation and execution in isolated sandboxes. Full observability across every reasoning step and action.

---

## **PLATFORM CAPABILITIES** 

> Documentation-First Discovery:

MCP servers provide documentation resources (not data directly) that teach the agent about your data domain. The agent reads these resources to learn endpoint structures, URL formats, entity relationships, and parameter requirements before constructing API calls.

> MCP as Documentation Source: 

Each MCP server exposes documentation resources that serve as the agent's knowledge base. These resources explain how to access data (base URLs, endpoint paths, query parameters) and how data is structured (entity schemas, relationships, data types). The agent must read this documentation before fetching data to ensure correct URL construction and parameter usage.

> Autonomous Data Fetching: 

After learning from MCP resources, the agent constructs complete API URLs and invokes its `fetch_api_data` tool to retrieve data from external endpoints. Automatically converts JSON responses to CSV format and caches data for efficient reuse across analysis sessions.

> Secure Sandbox Execution:

Executes Python analysis in isolated E2B sandboxes with pandas, numpy, matplotlib, and seaborn pre-installed. CSV files automatically mounted for instant access.

> Natural Language Interface:

Ask questions in plain English. The agent orchestrates multiple tools, reads documentation, fetches data, writes Python code, and presents insights—all conversationally.

> Technical Stack: 

LangGraph ReAct agent with conversational memory, FastAPI with SSE streaming, persistent CSV memory, MCP client management, LangSmith integration for observability.

---

## **DATA SOURCES**

For testing and demonstration purposes, we've created an `OpenF1` MCP server that connects to the MCP client and exposes documentation resources covering *Formula 1* data endpoints. Each resource teaches the agent about endpoint structures, query parameters, entity schemas, and data relationships.

| Resource | Description |
|----------|-------------|
| **Meetings** | Info about GrandPrix or testing weekends including circuit details, location, and dates |
| **Sessions** | Distinct periods of track activity (practice, qualifying, sprint, race) within a meeting |
| **Drivers** | Driver information for each session, including names, team details, and driver numbers |
| **Car Data** | Telemetry data including speed, throttle, brake, gear, RPM, and DRS status |
| **Laps** | Detailed lap information including sector times, speeds, lap numbers, and segment data |
| **Position** | Driver positions throughout a session, tracking position changes over time |
| **Pit** | Pit stop information including duration, timing, and pit lane activity |
| **Intervals** | Gap times between drivers, showing relative performance and positioning |
| **Stints** | Tire stint information and strategy data for race analysis |
| **Weather** | Track weather conditions updated approximately every minute during sessions |
| **Race Control** | Flags, safety car periods, and race control messages during sessions |
| **Team Radio** | Radio communications between drivers and teams during sessions |
| **Session Result** | Final results and classifications for completed sessions |
| **Starting Grid** | Starting positions and grid lineup information for race sessions |
| **Overtakes** | Overtaking events and position changes during sessions |
| **Location** | Circuit location and geographical data for meetings |

Each resource includes complete documentation with endpoint URLs, query parameters, response schemas, examples, and use cases that enable the agent to construct valid API calls and understand data structures.

> [!WARNING]
> The OpenF1 server is provided as a demonstration. Users of this platform should develop their own MCP servers that expose documentation resources for their specific data sources. These MCP servers serve as knowledge bases that teach the agent about your data domain, enabling autonomous discovery and intelligent data fetching. 

---

## **INSTALLATION**

Install dependencies and set up the platform:

```ruby
pip install -r requirements.txt
python install.py
```

Start servers and web interface:

```ruby
./scripts/bin/run_mcp_openf1.sh  # MCP servers
./scripts/bin/run_web.sh         # Web interface
```

> [!CAUTION]
> Configure API keys according to `.env.example` you'll need to obtain API keys from:
> - *E2B Sandbox*: For secure Python sandbox execution
> - *Google OAuth*: For user authentication
> - *LangSmith*: For observability and evaluations

**MCP Server Config**: Edit `scripts/mcp_server_config.json`:
```json
{
  "command": "python",
  "args": ["-m", "servers.mcp_openf1.server"],
  "env": {},
  "cwd": "."
}
```

---

## **EXTENDING THE PLATFORM** 

![Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)

The platform provides production-ready infrastructure—tool orchestration, prompt engineering, conversational memory, secure code execution, and behavior constraints are all handled. Focus on building your custom tools and connecting your data sources, not on infrastructure.

> **ADDING CUSTOM TOOLS**

Create custom tools in `src/tools/` using the `@tool` decorator from LangChain:

```python
from langchain_core.tools import tool

@tool
def my_custom_tool(param: str) -> str:
    """Tool description for the agent."""
    # Your implementation
    return result
```

> [!TIP]
> Register your tool in `src/tools/` by adding it to the appropriate tool list. The agent automatically discovers and uses all registered tools.

> **CONNECTING DATA SOURCES**

Create an MCP server to expose your data sources as documentation resources:

1. **Create MCP Server**: Set up a server directory with `server.py`, `resources.py`, and a `docs/` folder containing MCP resources (documentation files).

2. **Define Resources**: Each resource documents a data endpoint—explaining entity schemas, URL structures, query parameters, and entity relationships.

3. **Register Server**: Add your MCP server configuration to `scripts/mcp_server_config.json`.

4. **Agent Discovery**: The agent automatically discovers your MCP server, reads its resources to learn about your data domain, and uses that knowledge to construct API calls and fetch data.

> [!IMPORTANT]
> The agent learns from your MCP resources how to access your data sources, then invokes its `fetch_api_data` tool to retrieve actual data. Focus on documenting your data sources well—the agent handles the rest.

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