import { z } from "zod";
import type { Models, RoutingApi, AnalyticsApi, PresenceApi } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";

const paramsSchema = z.object({
  queueIds: z.array(z.string().uuid()).min(1).max(100).describe("List of up to 100 queue IDs to monitor in real-time"),
});

export interface ToolDependencies {
  readonly routingApi: Pick<RoutingApi, "getRoutingQueue" | "getRoutingQueueMembers">;
  readonly analyticsApi: Pick<AnalyticsApi, "postAnalyticsQueuesObservationsQuery">;
  readonly presenceApi: Pick<PresenceApi, "getUserPresence">;
}

interface RealTimeQueueMetrics {
  queueId: string;
  queueName: string;
  agentsOnQueue: number;
  agentsAvailable: number;
  agentsOffQueue: number;
  agentsBusy: number;
  memberCount: number;
  lastUpdated: string;
}

export const realTimeQueueStatus: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ routingApi, analyticsApi, presenceApi }) =>
  createTool({
    schema: {
      name: "real_time_queue_status",
      annotations: { title: "Real-Time Queue Status" },
      description: "Retrieves real-time queue status including agent availability and current operational metrics. Provides live operational view for contact center managers.",
      paramsSchema,
    },
    call: async ({ queueIds }) => {
      try {
        const results: RealTimeQueueMetrics[] = [];

        for (const queueId of queueIds) {
          try {
            // Get queue basic info
            const queueDetails = await routingApi.getRoutingQueue(queueId);
            
            // Get agents assigned to this queue and their presence
            const queueMembers = await routingApi.getRoutingQueueMembers(queueId, { pageSize: 100 });
            
            let agentsOnQueue = 0;
            let agentsAvailable = 0;
            let agentsOffQueue = 0;
            let agentsBusy = 0;
            const memberCount = queueMembers.entities?.length || 0;

            if (queueMembers.entities) {
              for (const member of queueMembers.entities) {
                if (member.id) {
                  try {
                    const presence = await presenceApi.getUserPresence(member.id, 'PURECLOUD');
                    if (presence.presenceDefinition) {
                      const status = presence.presenceDefinition.systemPresence;
                      if (status === 'Available') {
                        agentsAvailable++;
                        agentsOnQueue++;
                      } else if (status === 'Busy') {
                        agentsBusy++;
                        agentsOnQueue++;
                      } else {
                        agentsOffQueue++;
                      }
                    } else {
                      agentsOffQueue++;
                    }
                  } catch (presenceError) {
                    // Skip if can't get presence for this agent
                    agentsOffQueue++;
                  }
                }
              }
            }

            const queueMetrics: RealTimeQueueMetrics = {
              queueId,
              queueName: queueDetails.name || 'Unknown Queue',
              agentsOnQueue,
              agentsAvailable,
              agentsOffQueue,
              agentsBusy,
              memberCount,
              lastUpdated: new Date().toISOString()
            };

            results.push(queueMetrics);

          } catch (queueError) {
            console.error(`Error processing queue ${queueId}:`, queueError);
            
            // Return basic error result for this queue
            results.push({
              queueId,
              queueName: 'Error - Queue Not Found',
              agentsOnQueue: 0,
              agentsAvailable: 0,
              agentsOffQueue: 0,
              agentsBusy: 0,
              memberCount: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        }

        // Format results as text content
        const summary = {
          totalQueuesMonitored: results.length,
          totalAgentsOnQueue: results.reduce((sum, q) => sum + q.agentsOnQueue, 0),
          totalAgentsAvailable: results.reduce((sum, q) => sum + q.agentsAvailable, 0),
          totalMemberCount: results.reduce((sum, q) => sum + q.memberCount, 0),
        };

        const formattedText = `🔴 REAL-TIME QUEUE STATUS\n⏰ Last Updated: ${new Date().toISOString()}\n\n` +
          `📊 SUMMARY:\n` +
          `   🏢 Queues Monitored: ${summary.totalQueuesMonitored}\n` +
          `   👥 Total Queue Members: ${summary.totalMemberCount}\n` +
          `   🟢 Agents Available: ${summary.totalAgentsAvailable}\n` +
          `   🟡 Agents On Queue: ${summary.totalAgentsOnQueue}\n\n` +
          `📋 QUEUE DETAILS:\n\n` +
          results.map(queue => 
            `🏪 ${queue.queueName} (${queue.queueId})\n` +
            `   👤 Total Members: ${queue.memberCount}\n` +
            `   🟢 Available: ${queue.agentsAvailable}\n` +
            `   🔴 Busy: ${queue.agentsBusy}\n` +
            `   ⚫ Off Queue: ${queue.agentsOffQueue}\n` +
            `   📈 On Queue: ${queue.agentsOnQueue}\n` +
            `   ⏱️  Updated: ${queue.lastUpdated}\n`
          ).join('\n');

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
          ? "Failed to retrieve real-time queue status: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve real-time queue status: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

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