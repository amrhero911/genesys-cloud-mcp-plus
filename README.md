# Genesys Cloud MCP Plus

🚀 **Advanced Model Context Protocol Server for Genesys Cloud**

A comprehensive MCP server providing 15 powerful tools for contact center analytics, real-time monitoring, and intelligent conversation analysis. Designed for enterprise-grade AI applications with full omnichannel support.

## 🌟 Features

### 📊 **Historical Analytics (8 Tools)**
- **Queue Volume Analysis** - Compare conversation volumes across queues
- **Conversation Sampling** - Retrieve representative conversation samples
- **Voice Call Quality** - Analyze MOS scores and call quality metrics
- **Conversation Sentiment** - Sentiment analysis across interactions
- **Conversation Topics** - Extract business topics and intents
- **Conversation Transcripts** - Full conversation transcripts with timestamps
- **Enhanced Media Search** - Multi-channel conversation discovery
- **Agent Performance Analytics** - Media-type breakdown of agent metrics

### ⚡ **Real-Time Monitoring (3 Tools)**
- **Live Queue Status** - Real-time queue metrics and agent availability
- **Agent Presence Monitoring** - Current agent status and routing state
- **Active Conversation Tracking** - Monitor ongoing customer interactions

### 🏷️ **Wrap-Up Code Analytics (1 Tool)**
- **Comprehensive Wrap-Up Analysis** - Understand interaction types and volumes
- **Multi-language Support** - Handles Arabic/English bilingual environments
- **Queue-specific Filtering** - Targeted analysis by queue or service area

### 🔍 **Utility Tools (3 Tools)**
- **Queue Search** - Find queues by name with wildcard support
- **Agent Directory** - Monitor agent information and status
- **Enhanced Conversation Search** - Advanced filtering across all media types

## 📋 **Supported Media Types**
- 📞 Voice calls
- 💬 Chat interactions  
- 📧 Email conversations
- 📱 SMS/Text messaging
- 🤖 Bot interactions
- 📹 Video calls
- 🌐 Social media interactions
- 📞 Callback requests

## 🛠️ Installation

### NPM Installation
```bash
npm install -g genesys-cloud-mcp-plus
```

### Manual Installation
```bash
git clone https://github.com/MakingChatbots/genesys-cloud-mcp-server.git
cd genesys-cloud-mcp-server
npm install
npm run build
```

## ⚙️ Configuration

### Environment Variables
```bash
export GENESYSCLOUD_REGION="your-region"  # e.g., "mypurecloud.de", "mypurecloud.com"
export GENESYSCLOUD_OAUTHCLIENT_ID="your-client-id"
export GENESYSCLOUD_OAUTHCLIENT_SECRET="your-client-secret"
```

### Supported Regions
- `mypurecloud.com` (Americas)
- `mypurecloud.de` (EMEA)
- `mypurecloud.ie` (Ireland)
- `mypurecloud.com.au` (APAC)
- `mypurecloud.jp` (Japan)

### OAuth Permissions Required
Your OAuth client needs these permissions:
- `analytics:conversationAggregate:view`
- `analytics:conversationDetail:view`
- `routing:queue:view`
- `users:basic:view`
- `presence:basic:view`
- `speechandtextanalytics:data:view`

## 🚀 Usage

### Claude Desktop Integration
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "genesys-cloud-mcp-plus": {
      "command": "genesys-cloud-mcp-plus",
      "env": {
        "GENESYSCLOUD_REGION": "mypurecloud.de",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "your-client-id",
        "GENESYSCLOUD_OAUTHCLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Command Line
```bash
# Start the MCP server
genesys-cloud-mcp-plus

# Development mode
npm run dev

# Build for production
npm run build
```

## 📚 Tool Reference

### Historical Analytics
| Tool | Purpose | Use Case |
|------|---------|----------|
| `search_queues` | Find queues by name | "Find all sales queues" |
| `query_queue_volumes` | Compare queue volumes | "Which queue is busiest today?" |
| `sample_conversations_by_queue` | Get conversation samples | "Show me recent support calls" |
| `voice_call_quality` | Analyze call quality | "Check call quality for conversation X" |
| `conversation_sentiment` | Sentiment analysis | "What's the sentiment of these calls?" |
| `conversation_topics` | Topic detection | "What topics were discussed?" |
| `conversation_transcript` | Full transcripts | "Get transcript for conversation X" |
| `enhanced_conversation_search` | Multi-media search | "Find all chat conversations today" |

### Real-Time Monitoring  
| Tool | Purpose | Use Case |
|------|---------|----------|
| `real_time_queue_status` | Live queue metrics | "How many agents are available?" |
| `real_time_agent_presence` | Agent status monitoring | "Who's online right now?" |
| `live_conversation_monitoring` | Active interactions | "What conversations are happening?" |

### Analytics & Insights
| Tool | Purpose | Use Case |
|------|---------|----------|
| `wrap_up_code_analytics` | Interaction type analysis | "How many inquiries came today?" |
| `agent_media_type_performance` | Agent performance by channel | "How is John performing on chat?" |
| `agent_status_monitoring` | Agent directory | "Show me all active agents" |
| `search_voice_conversations` | Voice-specific search | "Find voice calls from this number" |

## 🔍 Example Queries

### Business Intelligence
```
"What were the top 3 wrap-up codes for our support queue this week?"
"Which agents handled the most chat conversations yesterday?"
"Show me sentiment analysis for all conversations from customer X"
```

### Operations Monitoring
```
"How many agents are currently available?"
"What conversations are active right now?"
"Which queue has the longest wait times?"
```

### Quality Assurance
```
"Find conversations with poor call quality scores"
"What topics are customers asking about most?"
"Show me transcripts from escalated calls"
```

## 🛡️ Enterprise Features

- **🔒 Secure Authentication** - OAuth 2.0 with client credentials
- **🌍 Multi-Region Support** - Works with all Genesys Cloud regions
- **🗣️ Multi-Language** - Supports bilingual environments (Arabic/English)
- **📊 Comprehensive Analytics** - 15 different analytical perspectives
- **⚡ Real-Time Data** - Live monitoring capabilities
- **🔧 Production Ready** - Error handling, logging, and retry logic

## 📖 Documentation

- [AI Agent Guide](./AI_AGENT_GUIDE.md) - Complete guide for AI implementations
- [Changelog](./CHANGELOG.md) - Version history and new features
- [API Reference](./docs/API.md) - Detailed tool documentation

## 👥 Authors & Contributors

### Original Author
**Lucas Woodward** - [MakingChatbots.com](https://makingchatbots.com)
- Created the foundational MCP server with 8 core analytics tools
- Established the original architecture and Genesys Cloud integration

### Enhanced Version
**Amr Khalil**
- Added 7 new tools including real-time monitoring and wrap-up code analytics
- Enhanced existing tools with improved error handling and performance
- Transformed basic server into comprehensive enterprise-grade platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

ISC License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [GitHub Repository](https://github.com/MakingChatbots/genesys-cloud-mcp-server)
- [NPM Package](https://www.npmjs.com/package/genesys-cloud-mcp-plus)
- [MakingChatbots.com](https://makingchatbots.com)

## 📞 Support

For issues, questions, or feature requests:
- GitHub Issues: [Report here](https://github.com/MakingChatbots/genesys-cloud-mcp-server/issues)
- Documentation: Check the AI Agent Guide for implementation details

---

**Built with ❤️ for the AI and Contact Center Community**
