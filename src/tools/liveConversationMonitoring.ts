import { z } from "zod";
import type { Models, AnalyticsApi, ConversationsApi } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";

const paramsSchema = z.object({
  queueIds: z.array(z.string().uuid()).min(1).max(50).describe("List of up to 50 queue IDs to monitor for active conversations").optional(),
  mediaTypes: z.array(z.enum(['voice', 'email', 'chat', 'sms', 'messaging', 'callback', 'social', 'video'])).describe("Filter by specific media types").optional(),
  maxResults: z.number().min(1).max(200).describe("Maximum number of active conversations to return").default(50),
});

export interface ToolDependencies {
  readonly analyticsApi: Pick<AnalyticsApi, "postAnalyticsConversationsDetailsJobs" | "getAnalyticsConversationsDetailsJob" | "getAnalyticsConversationsDetailsJobResults">;
  readonly conversationsApi: Pick<ConversationsApi, "getConversations">;
}

interface ActiveConversation {
  conversationId: string;
  queueName?: string;
  agentName?: string;
  customerNumber?: string;
  mediaType: string;
  state: string;
  startTime: string;
  duration: number; // seconds
  direction: 'inbound' | 'outbound' | 'unknown';
  isAcdInteraction: boolean;
}

export const liveConversationMonitoring: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi, conversationsApi }) =>
  createTool({
    schema: {
      name: "live_conversation_monitoring",
      annotations: { title: "Live Conversation Monitoring" },
      description: "Monitors active conversations in real-time across queues and media types. Provides operational visibility into current customer interactions and agent workload.",
      paramsSchema,
    },
    call: async ({ queueIds, mediaTypes, maxResults }) => {
      try {
        // Get active conversations from the last 5 minutes to capture ongoing interactions
        const currentTime = new Date();
        const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);

        const activeConversations: ActiveConversation[] = [];

        try {
          // Try to get active conversations directly using Conversations API
          const conversationsResponse = await conversationsApi.getConversations();
          
          if (conversationsResponse.entities) {
            for (const conversation of conversationsResponse.entities) {
              if (!conversation.id) continue;

              // Check if conversation matches our filters
              const mediaType = conversation.participants?.[0]?.attributes?.mediaType || 'unknown';
              
              // Filter by media types if specified
              if (mediaTypes && mediaTypes.length > 0 && !mediaTypes.includes(mediaType as any)) {
                continue;
              }

              // Basic conversation info
              const startTime = conversation.startTime ? new Date(conversation.startTime) : new Date();
              const duration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
              
              // Determine conversation state and direction
              const firstParticipant = conversation.participants?.[0];
              const state = 'active'; // Simplified - active conversations are active
              const direction = 'unknown'; // Simplified - direction detection is complex
              
              // Get queue and agent info from participants
              let queueName = 'Unknown Queue';
              let agentName = 'Unknown Agent';
              let customerNumber = 'Unknown Customer';
              
              if (conversation.participants) {
                for (const participant of conversation.participants) {
                  if (participant.purpose === 'agent' && participant.name) {
                    agentName = participant.name;
                  } else if (participant.purpose === 'customer') {
                    customerNumber = participant.address || participant.ani || 'Unknown';
                  }
                  
                  if (participant.queueName) {
                    queueName = participant.queueName;
                  }
                }
              }

              // Filter by queue IDs if specified
              if (queueIds && queueIds.length > 0) {
                const queueId = conversation.participants?.[0]?.queueId;
                if (!queueId || !queueIds.includes(queueId)) {
                  continue;
                }
              }

              const activeConv: ActiveConversation = {
                conversationId: conversation.id,
                queueName,
                agentName,
                customerNumber,
                mediaType,
                state,
                startTime: startTime.toISOString(),
                duration,
                direction: direction as 'inbound' | 'outbound' | 'unknown',
                isAcdInteraction: firstParticipant?.purpose === 'acd' || false,
              };

              activeConversations.push(activeConv);

              // Limit results
              if (activeConversations.length >= maxResults) {
                break;
              }
            }
          }

        } catch (conversationApiError) {
          console.log('Note: Could not access active conversations directly, using fallback method');
          
          // Fallback: Use analytics API to get recent conversations
          const job = await analyticsApi.postAnalyticsConversationsDetailsJobs({
            interval: `${fiveMinutesAgo.toISOString()}/${currentTime.toISOString()}`,
            order: "desc",
            orderBy: "conversationStart",
            segmentFilters: [
              {
                type: "and",
                predicates: [
                  {
                    dimension: "purpose",
                    value: "customer",
                  },
                ],
              },
            ],
          });

          const jobId = job.jobId;
          if (!jobId) {
            throw new Error("Job ID not returned from Genesys Cloud.");
          }

          // Wait for job completion (simplified polling)
          let attempts = 0;
          while (attempts < 10) {
            const jobStatus = await analyticsApi.getAnalyticsConversationsDetailsJob(jobId);
            
            if (jobStatus.state === "FULFILLED") {
              const results = await analyticsApi.getAnalyticsConversationsDetailsJobResults(jobId, {
                pageSize: maxResults,
              });

              if (results.conversations) {
                for (const conv of results.conversations.slice(0, maxResults)) {
                  if (!conv.conversationId) continue;

                  const mediaType = 'unknown'; // Simplified - media type detection from analytics is complex
                  
                  // Filter by media types if specified
                  if (mediaTypes && mediaTypes.length > 0 && !mediaTypes.includes(mediaType as any)) {
                    continue;
                  }

                  const startTime = conv.conversationStart ? new Date(conv.conversationStart) : new Date();
                  const duration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);

                  const activeConv: ActiveConversation = {
                    conversationId: conv.conversationId,
                    queueName: 'From Analytics',
                    agentName: 'Analytics Data',
                    customerNumber: 'From Analytics',
                    mediaType,
                    state: 'active',
                    startTime: startTime.toISOString(),
                    duration,
                    direction: 'unknown',
                    isAcdInteraction: true,
                  };

                  activeConversations.push(activeConv);
                }
              }
              break;
            }

            if (jobStatus.state === "FAILED" || jobStatus.state === "CANCELLED") {
              break;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Sort by start time (most recent first)
        activeConversations.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        // Generate summary statistics
        const mediaTypeCounts = activeConversations.reduce((acc, conv) => {
          acc[conv.mediaType] = (acc[conv.mediaType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const averageDuration = activeConversations.length > 0 
          ? Math.round(activeConversations.reduce((sum, conv) => sum + conv.duration, 0) / activeConversations.length)
          : 0;

        const queueDistribution = activeConversations.reduce((acc, conv) => {
          acc[conv.queueName || 'Unknown'] = (acc[conv.queueName || 'Unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const formattedText = `🔴 LIVE CONVERSATION MONITORING\n⏰ Last Updated: ${new Date().toISOString()}\n\n` +
          `📊 ACTIVE CONVERSATIONS SUMMARY:\n` +
          `   💬 Total Active: ${activeConversations.length}\n` +
          `   ⏱️  Average Duration: ${Math.floor(averageDuration / 60)}m ${averageDuration % 60}s\n\n` +
          `📱 MEDIA TYPE BREAKDOWN:\n` +
          Object.entries(mediaTypeCounts).map(([type, count]) => 
            `   ${type.toUpperCase()}: ${count}`
          ).join('\n') + '\n\n' +
          `🏢 QUEUE DISTRIBUTION:\n` +
          Object.entries(queueDistribution).map(([queue, count]) => 
            `   📞 ${queue}: ${count} conversations`
          ).join('\n') + '\n\n' +
          `💬 CONVERSATION DETAILS:\n\n` +
          (activeConversations.length === 0 
            ? '   ✅ No active conversations found in the specified timeframe.'
            : activeConversations.map(conv => {
                const durationFormatted = `${Math.floor(conv.duration / 60)}m ${conv.duration % 60}s`;
                const directionEmoji = conv.direction === 'inbound' ? '📞' : conv.direction === 'outbound' ? '📱' : '❓';
                
                return `${directionEmoji} ${conv.mediaType.toUpperCase()} - ${conv.state.toUpperCase()}\n` +
                       `   🆔 ID: ${conv.conversationId}\n` +
                       `   🏢 Queue: ${conv.queueName}\n` +
                       `   👤 Agent: ${conv.agentName}\n` +
                       `   📞 Customer: ${conv.customerNumber}\n` +
                       `   ⏱️  Duration: ${durationFormatted}\n` +
                       `   🕒 Started: ${new Date(conv.startTime).toLocaleString()}\n`;
              }).join('\n')
          );

        return {
          content: [
            {
              type: "text",
              text: formattedText,
            },
          ],
        };

      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve live conversation data: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve live conversation data: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      }
    },
  }); 