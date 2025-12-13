"""OpenF1 MCP Server - Documentation resources for OpenF1 API."""

from mcp.server.fastmcp import FastMCP

from .resources import get_resource, ENDPOINT_DOCS

mcp = FastMCP("OpenF1")


# Register resources for each endpoint
def register_endpoint_resource(endpoint_name: str):
    """Register a resource handler for a specific endpoint."""
    uri = f"prp://openf1/{endpoint_name}"
    
    async def handler() -> str:
        content = await get_resource(uri)
        return content or "Resource not found"
    
    mcp.resource(uri)(handler)


# Register all endpoint resources
for endpoint in ENDPOINT_DOCS.keys():
    register_endpoint_resource(endpoint)


if __name__ == "__main__":
    mcp.run()
