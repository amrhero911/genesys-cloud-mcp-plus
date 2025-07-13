import { z } from "zod";
import type { Models, PresenceApi, UsersApi } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";

const paramsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100).describe("List of up to 100 user IDs to monitor presence for").optional(),
  includeOfflineAgents: z.boolean().describe("Whether to include agents who are offline").default(false),
});

export interface ToolDependencies {
  readonly presenceApi: Pick<PresenceApi, "getUserPresence">;
  readonly usersApi: Pick<UsersApi, "getUsers">;
}

interface AgentPresenceInfo {
  userId: string;
  name: string;
  email: string;
  presenceStatus: string;
  systemPresence: string;
  presenceMessage?: string;
  routingStatus: string;
  timeInStatus: number; // minutes
  lastStatusChange: string;
}

export const realTimeAgentPresence: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ presenceApi, usersApi }) =>
  createTool({
    schema: {
      name: "real_time_agent_presence",
      annotations: { title: "Real-Time Agent Presence" },
      description: "Monitors real-time agent presence status including availability, current activity, and routing status. Essential for workforce management and operational oversight.",
      paramsSchema,
    },
    call: async ({ userIds, includeOfflineAgents }) => {
      try {
        let agentsList: Models.User[] = [];

        if (userIds && userIds.length > 0) {
          // Get specific users by IDs
          const usersResponse = await usersApi.getUsers({
            id: userIds,
            pageSize: 100
          });
          agentsList = usersResponse.entities || [];
        } else {
          // Get all users (agents) in the system
          const usersResponse = await usersApi.getUsers({
            pageSize: 100,
            state: 'active'
          });
          agentsList = usersResponse.entities || [];
        }

        const presenceResults: AgentPresenceInfo[] = [];

        for (const agent of agentsList) {
          if (!agent.id) continue;

          try {
            const presence = await presenceApi.getUserPresence(agent.id, 'PURECLOUD');
            
            const systemPresence = presence.presenceDefinition?.systemPresence || 'Unknown';
            const presenceStatus = presence.presenceDefinition?.id || 'Unknown';
            
            // Skip offline agents if not requested
            if (!includeOfflineAgents && systemPresence === 'Offline') {
              continue;
            }

            // Calculate time in current status
            const modifiedDate = presence.modifiedDate ? new Date(presence.modifiedDate) : new Date();
            const timeInStatusMs = Date.now() - modifiedDate.getTime();
            const timeInStatusMinutes = Math.round(timeInStatusMs / (1000 * 60));

            const agentPresenceInfo: AgentPresenceInfo = {
              userId: agent.id,
              name: agent.name || 'Unknown Agent',
              email: agent.email || 'No Email',
              presenceStatus,
              systemPresence,
              presenceMessage: presence.message || undefined,
              routingStatus: presence.primary ? 'On Queue' : 'Off Queue',
              timeInStatus: timeInStatusMinutes,
              lastStatusChange: modifiedDate.toISOString(),
            };

            presenceResults.push(agentPresenceInfo);

          } catch (presenceError) {
            console.error(`Error getting presence for agent ${agent.id}:`, presenceError);
            
            // Add error entry for this agent
            presenceResults.push({
              userId: agent.id,
              name: agent.name || 'Unknown Agent',
              email: agent.email || 'No Email',
              presenceStatus: 'Error - Cannot Access',
              systemPresence: 'Unknown',
              routingStatus: 'Unknown',
              timeInStatus: 0,
              lastStatusChange: new Date().toISOString(),
            });
          }
        }

        // Sort by system presence (Available first, then Busy, then others)
        presenceResults.sort((a, b) => {
          const order = { 'Available': 1, 'Busy': 2, 'Away': 3, 'Offline': 4 };
          const aOrder = order[a.systemPresence as keyof typeof order] || 5;
          const bOrder = order[b.systemPresence as keyof typeof order] || 5;
          return aOrder - bOrder;
        });

        // Generate summary statistics
        const summary = {
          totalAgents: presenceResults.length,
          available: presenceResults.filter(a => a.systemPresence === 'Available').length,
          busy: presenceResults.filter(a => a.systemPresence === 'Busy').length,
          away: presenceResults.filter(a => a.systemPresence === 'Away').length,
          offline: presenceResults.filter(a => a.systemPresence === 'Offline').length,
          onQueue: presenceResults.filter(a => a.routingStatus === 'On Queue').length,
          offQueue: presenceResults.filter(a => a.routingStatus === 'Off Queue').length,
        };

        const formattedText = `👥 REAL-TIME AGENT PRESENCE MONITORING\n⏰ Last Updated: ${new Date().toISOString()}\n\n` +
          `📊 PRESENCE SUMMARY:\n` +
          `   👤 Total Agents: ${summary.totalAgents}\n` +
          `   🟢 Available: ${summary.available}\n` +
          `   🔴 Busy: ${summary.busy}\n` +
          `   🟡 Away: ${summary.away}\n` +
          `   ⚫ Offline: ${summary.offline}\n\n` +
          `📈 ROUTING STATUS:\n` +
          `   📞 On Queue: ${summary.onQueue}\n` +
          `   📵 Off Queue: ${summary.offQueue}\n\n` +
          `👥 AGENT DETAILS:\n\n` +
          presenceResults.map(agent => {
            const statusEmoji = {
              'Available': '🟢',
              'Busy': '🔴', 
              'Away': '🟡',
              'Offline': '⚫'
            }[agent.systemPresence] || '⚪';
            
            const routingEmoji = agent.routingStatus === 'On Queue' ? '📞' : '📵';
            
            return `${statusEmoji} ${agent.name} (${agent.email})\n` +
                   `   📋 Status: ${agent.presenceStatus}\n` +
                   `   ${routingEmoji} Routing: ${agent.routingStatus}\n` +
                   `   ⏱️  Time in Status: ${agent.timeInStatus} minutes\n` +
                   `   🕒 Last Change: ${new Date(agent.lastStatusChange).toLocaleString()}\n` +
                   (agent.presenceMessage ? `   💬 Message: ${agent.presenceMessage}\n` : '') +
                   `   🆔 ID: ${agent.userId}\n`;
          }).join('\n');

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
          ? "Failed to retrieve agent presence data: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve agent presence data: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

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