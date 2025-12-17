<img width="1470" height="828" alt="demo_home_page_01" src="https://github.com/user-attachments/assets/7d1f3093-4dde-47dd-98fa-82ba599743e3" />
<img width="1470" height="718" alt="demo_home_page_02" src="https://github.com/user-attachments/assets/d304a1ba-7f4a-4391-8899-c439025ffafd" />
<img width="1470" height="714" alt="demo_home_page_03" src="https://github.com/user-attachments/assets/2da6c933-838b-46c5-8612-296d21387499" />
<img width="1470" height="640" alt="demo_home_page_04" src="https://github.com/user-attachments/assets/4cfaf099-5203-4a93-a28e-8e4def3ca9cc" />
<img width="1470" height="594" alt="demo_home_page_05" src="https://github.com/user-attachments/assets/c1652f9e-e733-44f9-a8a4-d4ce5f4656d8" />

## Overview

MoveDot is a conversational analytics agent that combines the power of large language models with secure code execution environments to provide comprehensive data analysis capabilities. The system leverages MCP servers to dynamically discover data sources and their documentation, enabling the agent to autonomously understand data structures and construct appropriate API queries.

The agent operates through a documentation-driven discovery process, where it first reads Product Requirement Prompts (PRPs) from MCP servers to understand data domains, entity relationships, and endpoint structures before fetching and analyzing data. This approach ensures accurate data retrieval and enables intelligent query construction.

## Architecture

### Core Components

**AI Agent Layer**
- LangGraph ReAct agent with conversational memory
- Multi-tool orchestration with autonomous decision-making
- Comprehensive system prompts for data discovery workflows
- Support for multiple LLM providers (OpenAI, Anthropic)

**Model Context Protocol Integration**
- MCP server connections for extensible data source management
- Resource-based documentation system (PRPs)
- Dynamic tool generation from MCP capabilities
- Automatic discovery of available data endpoints

**Execution Environment**
- E2B sandbox isolation for secure Python code execution
- Pre-configured data science stack (pandas, numpy, matplotlib, seaborn, scipy)
- Automatic CSV file management and caching
- Plot generation and export capabilities

**Web Interface**
- Real-time streaming chat interface
- Analytics dashboard with metrics visualization
- User authentication and session management
- Responsive design with modern UI components

**Backend Services**
- FastAPI server with Server-Sent Events (SSE) streaming
- Persistent CSV memory with caching layer
- MCP client management and lifecycle handling
- LangSmith integration for observability

## Key Features

### Data Discovery and Acquisition

The agent implements a sophisticated data discovery workflow:

1. **MCP Resource Discovery**: Automatically identifies available MCP servers and their documentation resources
2. **Documentation Analysis**: Reads multiple PRPs to understand data domains, entity relationships, and API structures
3. **Intelligent Query Construction**: Builds complete API requests based on documentation understanding
4. **Automatic Data Fetching**: Retrieves data from APIs and converts JSON/CSV responses to analyzable formats
5. **Persistent Storage**: Caches fetched data for reuse across analysis sessions

### Analysis Capabilities

**Code Execution**
- Execute arbitrary Python code in isolated E2B sandboxes
- Automatic CSV file mounting at `/data/` directory
- Support for complex data transformations and statistical analysis
- Error handling and timeout management

**Data Processing**
- Automatic JSON-to-CSV conversion for tabular data
- Multi-dataset analysis with cross-referencing capabilities
- Memory-efficient processing of large datasets
- Schema detection and column type inference

**Visualization**
- Automatic plot generation using matplotlib and seaborn
- Export visualizations as PNG files
- Support for multiple chart types and customization
- Real-time display in web interface

### Conversational Interface

**Natural Language Interaction**
- Ask questions about available data sources
- Request specific analyses or visualizations
- Refine queries based on intermediate results
- Get explanations of data patterns and insights

**Context Management**
- Full conversation history maintained across sessions
- Temporal context awareness (current date integration)
- Multi-turn reasoning for complex analytical tasks
- Smart suggestion system with query templates

**Streaming Responses**
- Real-time token-by-token streaming
- Progress indicators for long-running analyses
- Markdown-formatted responses with code blocks and tables
- Inline display of plots and visualizations

## Tools and Capabilities

### Context Tools

**`list_mcp_resources`**
Lists all available MCP resources with URIs, names, descriptions, and MIME types. Used for discovering what data sources and documentation are available.

**`read_mcp_resource(uri: str)`**
Reads documentation from MCP resources (PRPs). These documents explain data domains, entity definitions, API endpoint structures, parameters, and relationships between data entities.

**`fetch_api_data(url: str)`**
Fetches data from any HTTP API endpoint. Automatically detects response types (JSON, CSV, text), converts JSON arrays to CSV format, and stores data in persistent memory for analysis.

### Analysis Tools

**`analyze_data_with_pandas(python_code: str, csv_names: Optional[str])`**
Executes Python code in a secure E2B sandbox with CSV files available in the filesystem. Supports full pandas, numpy, matplotlib, seaborn, and scipy capabilities. Returns execution results including stdout, return values, and saved plots.

**`list_available_data()`**
Lists all CSV datasets currently stored in memory, providing visibility into what data is available for analysis.

**`quick_data_check()`**
Returns a quick count of available datasets, useful for validating data availability before starting analysis.

**`debug_csv_storage()`**
Diagnostic tool for troubleshooting data storage issues, cache performance, and memory state.

**`clear_csv_cache()`**
Clears the in-memory cache to force reload from disk, useful when data has been updated externally.

**`cleanup_e2b_sandbox_tool()`**
Manually closes the E2B sandbox to free resources. Sandboxes are automatically recreated when needed.

## Agent Intelligence

### Data Discovery Workflow

The agent follows a systematic process for discovering and analyzing data:

1. **Domain Identification**: Determines which MCP servers are relevant to the user's query
2. **Documentation Reading**: Reads multiple PRPs to build comprehensive domain knowledge
3. **Entity Relationship Mapping**: Understands how data entities connect and depend on each other
4. **Query Strategy Development**: Plans the sequence of API calls needed to gather complete data
5. **Iterative Refinement**: Starts with broad queries, analyzes results, then narrows down with filters
6. **Cross-Source Analysis**: Combines data from multiple endpoints when needed for complete insights

### Autonomous Behavior

The agent is designed to operate with minimal user intervention:

- Never fabricates data or makes unsupported assumptions
- Reads documentation extensively before constructing API queries
- Starts with minimal filters and refines based on actual data
- Uses Python sandbox for filtering large datasets instead of guessing API parameters
- Collects comprehensive data to avoid analysis limitations
- Provides evidence-based insights with data citations

### Safety and Validation

- All code execution happens in isolated E2B sandboxes
- Sandboxes have configurable timeouts (default: 5 minutes)
- Automatic cleanup of expired or failed sandboxes
- Validation of parameter formats from documentation
- Error recovery with informative messages

## Web Interface

### Main Dashboard

The web interface provides a modern, intuitive environment for data analysis:

**Chat Interface**
- Full-width conversational area with streaming responses
- Markdown rendering with syntax highlighting
- Automatic scrolling and message history
- User authentication with profile management

**Suggestion System**
- Pre-defined query templates for common analyses
- Horizontal scrolling chip interface
- One-click query execution
- Context-aware suggestions

**Analytics Panel**
- Real-time metrics dashboard
- Dataset count and analysis statistics
- Success rate and response time tracking
- Visualization gallery for generated plots

**Navigation**
- Floating dock with quick access to all sections
- Data sources management page
- MCP servers configuration interface
- Seamless navigation with state preservation

## Data Sources

### Example MCP Server (OpenF1)

The included OpenF1 MCP server demonstrates the system's capabilities with 12 documented endpoints covering various data entities. This serves as a reference implementation that can be adapted for any domain:

- **Meetings**: Grand Prix events and race weekends
- **Sessions**: Practice, qualifying, and race sessions
- **Drivers**: Driver information, teams, and metadata
- **Car Data**: Telemetry including speed, RPM, throttle, brake, DRS
- **Laps**: Lap times, sectors, and lap-by-lap performance
- **Positions**: Real-time position tracking throughout sessions
- **Pit Stops**: Pit stop timing and duration
- **Intervals**: Gap times between drivers
- **Stints**: Tire stint information and strategy
- **Weather**: Track temperature, air temperature, humidity, rainfall
- **Race Control**: Flags, safety car, and race control messages
- **Team Radio**: Radio communications between drivers and teams

Each endpoint is documented with a PRP that explains:
- Complete attribute schemas
- Query parameter formats
- Example API calls
- Common use cases
- Integration patterns

### Extensibility

The MCP architecture allows easy addition of new data sources:

1. Create a new MCP server with resource endpoints
2. Define PRPs for each data endpoint
3. Register the server in the configuration
4. The agent automatically discovers and integrates the new source

## Installation

### Prerequisites

- Python 3.9 or higher
- OpenAI API key (or Anthropic API key)
- E2B API key for sandbox execution
- Git for cloning the repository

### Setup Steps

Clone the repository:


Install dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables:

```bash
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY or ANTHROPIC_API_KEY
# - E2B_API_KEY
# - Optional: LANGSMITH_API_KEY for tracing
```

Run the installation script:

```bash
python install.py
```

### Starting the System

**Start MCP Servers**:

```bash
./scripts/bin/run_mcp_openf1.sh
```

**Start Web Interface**:

```bash
./scripts/bin/run_web.sh
# Access at http://localhost:8000
```

**Command Line Interface**:

```bash
# Interactive mode
python main.py

# Single query mode
python main.py -q "What data sources are available?"

# Verbose logging
python main.py -v
```

## Configuration

### Environment Variables

**Required**:
- `OPENAI_API_KEY`: OpenAI API key for GPT models
- `E2B_API_KEY`: E2B API key for sandbox execution

**Optional**:
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude models
- `LANGSMITH_API_KEY`: LangSmith key for tracing and debugging
- `LANGSMITH_PROJECT`: LangSmith project name
- `E2B_SANDBOX_TIMEOUT`: Sandbox timeout in seconds (default: 300)
- `DATA_DIR`: Directory for persistent data storage (default: ./data)
- `LOG_LEVEL`: Logging level (default: INFO)

### MCP Server Configuration

Edit `scripts/mcp_server_config.json` to configure MCP servers:

```json
{
  "command": "python",
  "args": ["-m", "mcp_servers.openf1.server"],
  "env": {},
  "cwd": "."
}
```

## Use Cases

### For Data Analysts

- Rapid exploration of unfamiliar datasets
- Automatic data fetching and preparation
- Interactive data quality assessment
- Quick statistical summaries and distributions

### For Domain Specialists

- Entity performance analysis across sessions
- Strategy comparison and optimization
- Environmental impact on outcomes
- Time-series data exploration

### For Researchers

- Historical trend analysis
- Multi-variate statistical modeling
- Hypothesis testing with automated data collection
- Reproducible analysis with code generation

### For Business Intelligence

- KPI tracking and monitoring
- Competitive benchmarking
- Seasonal performance trends
- Executive reporting with visualizations

## Technical Details

### Agent Prompt Engineering

The system prompt is carefully engineered with several key sections:

- **Role Definition**: Establishes the agent as a comprehensive data analysis expert
- **Context Explanation**: Details the MCP architecture and documentation-driven approach
- **Goal Definition**: Emphasizes data collection excellence and evidence-based insights
- **Workflow Guidelines**: Provides step-by-step processes for data discovery
- **Safety Constraints**: Defines behavioral boundaries and data integrity requirements
- **Response Formatting**: Specifies Markdown formatting standards for clean output

### MCP Integration

The Model Context Protocol provides a standardized way to connect data sources:

- **Resources**: Documentation endpoints (PRPs) that describe data domains
- **Tools**: Automatically converted to LangChain tools for agent use
- **Prompts**: Reusable prompt templates (not currently utilized)
- **Sampling**: Direct model sampling through MCP (not currently utilized)

### E2B Sandbox Architecture

Code execution follows E2B best practices:

- Files are uploaded to sandbox filesystem (`/data/` directory)
- Sandboxes have configurable timeouts to prevent resource exhaustion
- Automatic recreation of expired or failed sandboxes
- Plots are captured and saved to local `plots/` directory
- All standard data science libraries are pre-installed

### Memory Management

The system implements a persistent CSV memory layer:

- JSON file storage at `data/csv_memory.json`
- In-memory cache with TTL for performance
- Automatic cache invalidation on external changes
- Dataset metadata tracking (source, timestamp)
- Deduplication based on content hash

## Monitoring and Observability

### LangSmith Integration

When configured, LangSmith provides:

- Complete trace of agent reasoning steps
- Tool invocation tracking with inputs/outputs
- Token usage and cost analysis
- Error tracking and debugging information
- Performance metrics and bottleneck identification

### Logging

The system uses Python's standard logging framework:

- Configurable log levels (DEBUG, INFO, WARNING, ERROR)
- Structured logging with timestamps
- Module-level loggers for component isolation
- Request/response logging for API calls
- Sandbox execution logging

## Development

### Project Structure

```
movedot-analytics-agent/
├── main.py                 # CLI entry point
├── requirements.txt        # Python dependencies
├── install.py             # Installation script
├── src/
│   ├── agents/            # Agent implementation
│   │   └── analytics_agent.py
│   ├── api/               # FastAPI backend
│   │   ├── main.py
│   │   └── mcp_routes.py
│   ├── config/            # Configuration management
│   │   ├── settings.py
│   │   └── clients.py
│   ├── core/              # Core functionality
│   │   ├── db.py
│   │   ├── memory.py
│   │   └── mcp_servers.py
│   ├── mcp/               # MCP client implementation
│   │   ├── client.py
│   │   ├── loader.py
│   │   ├── manager.py
│   │   └── langchain_adapter.py
│   ├── prompt/            # System prompts
│   │   └── analytics_agent_prompt.py
│   ├── services/          # External services
│   │   └── e2b_service.py
│   ├── tools/             # LangChain tools
│   │   ├── analysis_tools.py
│   │   └── context_tools.py
│   └── utils/             # Utility functions
│       └── csv_utils.py
├── mcp_servers/           # MCP server implementations
│   └── openf1/
│       ├── server.py
│       ├── resources.py
│       └── docs/          # PRP documentation
│           ├── prp_drivers.md
│           ├── prp_sessions.md
│           └── ...
└── web/                   # Frontend interface
    ├── index.html
    ├── home.html
    ├── data-sources.html
    ├── mcp-servers.html
    └── static/
        ├── app.js
        ├── styles.css
        ├── markdown-renderer.js
        └── ...
```

### Adding New Tools

Create a new tool in `src/tools/`:

```python
from langchain_core.tools import tool

@tool
def my_custom_tool(param: str) -> str:
    """Tool description for the agent."""
    # Implementation
    return result
```

Register in `src/tools/__init__.py`:

```python
from .my_tools import my_custom_tool

def get_all_tools():
    return [
        # ... existing tools
        my_custom_tool,
    ]
```

### Adding New MCP Servers

Create a new MCP server directory:

```
mcp_servers/
└── my_data_source/
    ├── server.py          # MCP server implementation
    ├── resources.py       # Resource definitions
    └── docs/              # PRP documentation
        ├── prp_endpoint1.md
        └── prp_endpoint2.md
```

Implement the MCP server following the protocol:

```python
# server.py
from mcp.server import Server
from mcp.types import Resource, TextContent

server = Server("my_data_source")

@server.list_resources()
async def list_resources():
    # Return available resources
    pass

@server.read_resource()
async def read_resource(uri: str):
    # Return resource content
    pass
```

## Limitations and Considerations

### Current Limitations

- E2B sandbox timeouts may interrupt long-running analyses
- MCP servers must be started before the web interface
- No built-in authentication for multi-user deployments
- Plot files are stored locally, not in a centralized storage
- CSV memory is file-based, not suitable for very large datasets

### Security Considerations

- API keys stored in environment variables
- E2B provides isolation but has execution costs
- No rate limiting on API endpoints
- User input is executed as code in sandboxes
- CORS enabled for local development

### Performance Considerations

- CSV caching reduces redundant API calls
- E2B sandbox reuse minimizes creation overhead
- Streaming responses improve perceived latency
- Memory cache for hot data access
- Asynchronous MCP operations

## Troubleshooting

### Agent Not Responding

- Check that MCP servers are running
- Verify API keys are set correctly
- Check logs for error messages
- Ensure E2B sandbox quota is available

### Data Not Fetching

- Verify MCP resources are accessible with `list_mcp_resources`
- Check API endpoint URLs in PRPs
- Validate network connectivity
- Review error messages in agent responses

### Sandbox Errors

- Check E2B API key validity
- Verify sandbox timeout settings
- Look for Python syntax errors in generated code
- Check available E2B quota

### MCP Connection Issues

- Ensure MCP server process is running
- Check server configuration in JSON files
- Verify Python path and module imports
- Review MCP server logs

## Future Enhancements

### Planned Features

- Multi-user authentication and authorization
- Centralized plot storage with cloud integration
- Real-time collaboration on analyses
- Export analysis notebooks and reports
- Scheduled data refreshes and alerts
- Custom MCP server marketplace
- Advanced visualization library integration
- SQL database support for larger datasets

### Research Directions

- Multi-agent collaboration for complex analyses
- Automatic insight generation and anomaly detection
- Natural language to SQL query translation
- Reinforcement learning for query optimization
- Federated learning across data sources

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with description

Follow the existing code style and add documentation for new features.

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository or contact the development team.
