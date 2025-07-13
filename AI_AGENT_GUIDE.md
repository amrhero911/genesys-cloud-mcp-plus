# AI Agent Guide - Genesys Cloud MCP Plus

## 🤖 **Complete Guide for AI Agents**

This guide provides comprehensive instructions for AI agents on how to effectively use all 15 tools in the Genesys Cloud MCP Plus server. Use this as your reference for implementing contact center analytics and real-time monitoring capabilities.

---

## 📋 **Quick Reference: All 15 Tools**

### **Historical Analytics (8 Tools)**
1. `search_queues` - Find queues by name
2. `query_queue_volumes` - Compare queue conversation volumes
3. `sample_conversations_by_queue` - Get conversation samples
4. `voice_call_quality` - Analyze voice call quality
5. `conversation_sentiment` - Analyze conversation sentiment
6. `conversation_topics` - Extract conversation topics
7. `conversation_transcript` - Get full conversation transcripts
8. `enhanced_conversation_search` - Multi-media conversation search

### **Real-Time Monitoring (3 Tools)**
9. `real_time_queue_status` - Live queue metrics
10. `real_time_agent_presence` - Agent availability status
11. `live_conversation_monitoring` - Active conversation tracking

### **Analytics & Insights (4 Tools)**
12. `wrap_up_code_analytics` - Interaction type analysis
13. `agent_media_type_performance` - Agent performance by channel
14. `agent_status_monitoring` - Agent directory and status
15. `search_voice_conversations` - Voice-specific conversation search

---

## 🎯 **Tool Usage Patterns**

### **Pattern 1: Business Intelligence Queries**
When users ask about business metrics, trends, or performance:

```
User: "What were the top 3 wrap-up codes for our support queue this week?"
AI: Use wrap_up_code_analytics → Filter by support queue → Analyze results
```

### **Pattern 2: Operational Monitoring**
When users need real-time operational insights:

```
User: "How many agents are currently available?"
AI: Use real_time_agent_presence → Count available agents → Provide summary
```

### **Pattern 3: Quality Assurance**
When users need quality or performance analysis:

```
User: "Find conversations with poor call quality"
AI: Use voice_call_quality → Filter by low MOS scores → Provide results
```

### **Pattern 4: Customer Journey Analysis**
When users need to understand customer interactions:

```
User: "Show me all interactions from customer +1234567890"
AI: Use enhanced_conversation_search → Filter by phone number → Get details
```

---

## 🔧 **Tool Reference Guide**

### **1. search_queues**
**Purpose**: Find queues by name with wildcard support
**Parameters**: 
- `name` (required): Queue name or pattern (supports wildcards)
- `pageNumber` (optional): Page number for pagination
- `pageSize` (optional): Results per page

**Usage Examples**:
```
// Find all support queues
name: "Support*"

// Find queues containing "sales"
name: "*sales*"

// Find specific queue
name: "Hisense"
```

**Response**: Queue names, IDs, descriptions, and member counts

### **2. query_queue_volumes**
**Purpose**: Compare conversation volumes across queues
**Parameters**:
- `queueIds` (required): Array of queue IDs (max 300)
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string

**Usage Examples**:
```
// Compare volumes between queues
queueIds: ["queue-id-1", "queue-id-2"]
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
```

**Response**: Conversation counts per queue for the specified period

### **3. sample_conversations_by_queue**
**Purpose**: Get representative conversation samples from queues
**Parameters**:
- `queueId` (required): Single queue ID
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string

**Usage Examples**:
```
// Get recent conversations from support queue
queueId: "05d8a9e2-1443-4e67-9e05-4d02e266dc5c"
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
```

**Response**: Sample conversation IDs for further analysis

### **4. voice_call_quality**
**Purpose**: Analyze voice call quality metrics (MOS scores)
**Parameters**:
- `conversationIds` (required): Array of conversation IDs (max 100)

**Usage Examples**:
```
// Check call quality for specific conversations
conversationIds: ["conv-id-1", "conv-id-2"]
```

**Response**: MOS scores and quality ratings (Poor/Acceptable/Excellent)

### **5. conversation_sentiment**
**Purpose**: Analyze sentiment across conversations
**Parameters**:
- `conversationIds` (required): Array of conversation IDs (max 100)

**Usage Examples**:
```
// Analyze sentiment for recent conversations
conversationIds: ["conv-id-1", "conv-id-2"]
```

**Response**: Sentiment scores (-100 to +100) and labels (Positive/Neutral/Negative)

### **6. conversation_topics**
**Purpose**: Extract business topics and intents from conversations
**Parameters**:
- `conversationId` (required): Single conversation ID

**Usage Examples**:
```
// Get topics discussed in a conversation
conversationId: "conversation-uuid"
```

**Response**: Detected topics and business intents

### **7. conversation_transcript**
**Purpose**: Get full conversation transcripts with timestamps
**Parameters**:
- `conversationId` (required): Single conversation ID

**Usage Examples**:
```
// Get full transcript of a conversation
conversationId: "conversation-uuid"
```

**Response**: Time-aligned transcript with speaker labels and sentiment

### **8. enhanced_conversation_search**
**Purpose**: Search conversations across all media types
**Parameters**:
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string
- `phoneNumber` (optional): Phone number filter
- `mediaTypes` (optional): Array of media types
- `pageNumber` (optional): Page number
- `pageSize` (optional): Results per page

**Usage Examples**:
```
// Search all chat conversations today
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-01T23:59:59Z"
mediaTypes: ["chat"]

// Search conversations from specific phone number
phoneNumber: "+1234567890"
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
```

**Response**: Conversation metadata with media type breakdown

### **9. real_time_queue_status**
**Purpose**: Monitor live queue metrics and agent availability
**Parameters**:
- `queueIds` (required): Array of queue IDs (max 100)

**Usage Examples**:
```
// Monitor multiple queues in real-time
queueIds: ["queue-id-1", "queue-id-2"]
```

**Response**: Live queue metrics, agent availability, and operational status

### **10. real_time_agent_presence**
**Purpose**: Track agent availability and routing status
**Parameters**:
- `userIds` (optional): Array of agent IDs (max 100)
- `includeOfflineAgents` (optional): Include offline agents

**Usage Examples**:
```
// Monitor all agents
includeOfflineAgents: false

// Monitor specific agents
userIds: ["agent-id-1", "agent-id-2"]
```

**Response**: Agent presence status, routing state, and availability

### **11. live_conversation_monitoring**
**Purpose**: Monitor active customer interactions
**Parameters**:
- `queueIds` (optional): Array of queue IDs (max 50)
- `mediaTypes` (optional): Array of media types
- `maxResults` (optional): Maximum conversations to return

**Usage Examples**:
```
// Monitor active conversations in specific queues
queueIds: ["queue-id-1"]
maxResults: 20

// Monitor only voice conversations
mediaTypes: ["voice"]
```

**Response**: Active conversation details with agent and customer information

### **12. wrap_up_code_analytics**
**Purpose**: Analyze interaction types and volumes by wrap-up codes
**Parameters**:
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string
- `queueIds` (optional): Array of queue IDs (max 100)
- `mediaTypes` (optional): Array of media types
- `wrapUpCodes` (optional): Array of specific wrap-up codes

**Usage Examples**:
```
// Analyze wrap-up codes for specific queue
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
queueIds: ["hisense-queue-id"]

// Analyze only voice interactions
mediaTypes: ["voice"]
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
```

**Response**: Wrap-up code breakdown with counts, percentages, and examples

### **13. agent_media_type_performance**
**Purpose**: Analyze agent performance across different media types
**Parameters**:
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string
- `userIds` (optional): Array of agent IDs
- `includeMediaBreakdown` (optional): Include detailed media breakdown
- `pageSize` (optional): Number of agents to return

**Usage Examples**:
```
// Analyze all agents' performance
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"
includeMediaBreakdown: true

// Analyze specific agents
userIds: ["agent-id-1", "agent-id-2"]
```

**Response**: Agent performance metrics broken down by media type

### **14. agent_status_monitoring**
**Purpose**: Monitor agent directory and workforce information
**Parameters**:
- `userIds` (optional): Array of agent IDs (max 100)
- `includeInactive` (optional): Include inactive agents
- `pageSize` (optional): Results per page

**Usage Examples**:
```
// Monitor all active agents
includeInactive: false

// Monitor specific agents
userIds: ["agent-id-1", "agent-id-2"]
```

**Response**: Agent directory with names, departments, titles, and status

### **15. search_voice_conversations**
**Purpose**: Search specifically for voice conversations
**Parameters**:
- `startDate` (required): ISO-8601 date string
- `endDate` (required): ISO-8601 date string
- `phoneNumber` (optional): Phone number filter
- `pageNumber` (optional): Page number
- `pageSize` (optional): Results per page

**Usage Examples**:
```
// Search voice conversations from specific number
phoneNumber: "+1234567890"
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-07T23:59:59Z"

// Search all voice conversations today
startDate: "2024-01-01T00:00:00Z"
endDate: "2024-01-01T23:59:59Z"
```

**Response**: Voice conversation IDs and metadata

---

## 🎯 **Common Use Cases & Tool Combinations**

### **Use Case 1: Daily Operations Dashboard**
```
1. real_time_queue_status → Get current queue metrics
2. real_time_agent_presence → Count available agents
3. live_conversation_monitoring → Monitor active interactions
4. wrap_up_code_analytics → Today's interaction types
```

### **Use Case 2: Customer Service Investigation**
```
1. search_queues → Find relevant queues
2. enhanced_conversation_search → Find customer interactions
3. conversation_sentiment → Analyze customer satisfaction
4. conversation_transcript → Get detailed conversation content
```

### **Use Case 3: Performance Analysis**
```
1. agent_media_type_performance → Agent efficiency by channel
2. query_queue_volumes → Queue workload comparison
3. voice_call_quality → Call quality assessment
4. wrap_up_code_analytics → Interaction type trends
```

### **Use Case 4: Quality Assurance Review**
```
1. sample_conversations_by_queue → Get conversation samples
2. conversation_topics → Extract discussion topics
3. conversation_sentiment → Assess customer satisfaction
4. voice_call_quality → Check technical quality
```

---

## 🔍 **Advanced Query Patterns**

### **Pattern 1: Multi-Step Analysis**
```
User: "Analyze our support queue performance this week"
AI Steps:
1. search_queues → Find support queues
2. query_queue_volumes → Get conversation volumes
3. agent_media_type_performance → Analyze agent performance
4. wrap_up_code_analytics → Understand interaction types
5. Synthesize comprehensive report
```

### **Pattern 2: Real-Time Monitoring**
```
User: "What's happening in our contact center right now?"
AI Steps:
1. real_time_queue_status → Current queue state
2. real_time_agent_presence → Agent availability
3. live_conversation_monitoring → Active interactions
4. Provide real-time operational summary
```

### **Pattern 3: Customer Journey Tracking**
```
User: "Track all interactions with customer +1234567890"
AI Steps:
1. enhanced_conversation_search → Find all customer interactions
2. conversation_sentiment → Analyze sentiment trends
3. conversation_topics → Extract key discussion points
4. voice_call_quality → Assess call quality (if applicable)
5. Present comprehensive customer journey
```

---

## 🛠️ **Error Handling & Best Practices**

### **Common Error Scenarios**
1. **Invalid Date Formats**: Always use ISO-8601 format
2. **Missing Permissions**: Check OAuth client permissions
3. **Rate Limiting**: Implement appropriate delays between calls
4. **Large Result Sets**: Use pagination for large queries

### **Best Practices**
1. **Always validate date ranges** before making calls
2. **Use appropriate page sizes** for better performance
3. **Combine tools logically** for comprehensive analysis
4. **Handle empty results gracefully** with meaningful messages
5. **Cache results** when appropriate to improve performance

### **Response Interpretation**
1. **Check for error flags** in tool responses
2. **Validate data completeness** before analysis
3. **Provide context** for numerical results
4. **Explain business implications** of findings

---

## 📊 **Media Type Reference**

### **Supported Media Types**
- `voice` - Voice calls
- `chat` - Chat interactions
- `email` - Email conversations
- `sms` - SMS text messages
- `messaging` - Messaging platforms
- `callback` - Callback requests
- `social` - Social media interactions
- `video` - Video calls
- `cobrowse` - Co-browsing sessions
- `screenshare` - Screen sharing sessions

### **Media Type Combinations**
```
// Voice and chat only
mediaTypes: ["voice", "chat"]

// All digital channels
mediaTypes: ["chat", "email", "sms", "messaging", "social"]

// Voice channels only
mediaTypes: ["voice", "callback"]
```

---

## 🔐 **Security & Compliance**

### **Data Privacy**
- Never store conversation content
- Anonymize customer data in responses
- Respect data retention policies
- Follow GDPR/CCPA requirements

### **Access Control**
- Validate user permissions before queries
- Log access for audit trails
- Implement rate limiting
- Monitor for unusual access patterns

---

## 🚀 **Performance Optimization**

### **Query Optimization**
1. **Use specific date ranges** instead of large time windows
2. **Filter by relevant queues** to reduce data volume
3. **Implement pagination** for large result sets
4. **Cache frequently accessed data** when appropriate

### **Response Processing**
1. **Parse responses efficiently** for large datasets
2. **Summarize results** for better user experience
3. **Provide progressive disclosure** for detailed information
4. **Use appropriate data structures** for analysis

---

## 📈 **Reporting & Analytics**

### **Standard Reports**
1. **Daily Operations Summary**
   - Queue volumes, agent availability, active interactions
   - Tools: real_time_queue_status, real_time_agent_presence, query_queue_volumes

2. **Weekly Performance Review**
   - Agent performance, call quality, customer satisfaction
   - Tools: agent_media_type_performance, voice_call_quality, conversation_sentiment

3. **Monthly Business Intelligence**
   - Interaction trends, topic analysis, wrap-up code analysis
   - Tools: wrap_up_code_analytics, conversation_topics, enhanced_conversation_search

### **Custom Analytics**
- Combine multiple tools for comprehensive analysis
- Create time-series analysis for trends
- Implement comparative analysis across periods
- Build predictive insights from historical data

---

**Remember**: This MCP server provides comprehensive contact center analytics. Use tools in combination for deeper insights, always validate results, and provide business context in your responses to users. 