#!/bin/bash

# Start script for Genesys Cloud MCP Server
# This handles the path with spaces properly

cd "/Users/amrkhalil/Downloads/cloud MCP server/genesys-cloud-mcp-server"

# Set environment variables
export GENESYSCLOUD_REGION="eu-central-1"
export GENESYSCLOUD_OAUTHCLIENT_ID="29aa13c7-1693-47dc-8672-fb502990971c"
export GENESYSCLOUD_OAUTHCLIENT_SECRET="bCoYOs1qeOcXjDfwQM6XVA-kfYIl0wYiLyLVrbj7IAc"

# Start the server
exec node dist/cli.js 