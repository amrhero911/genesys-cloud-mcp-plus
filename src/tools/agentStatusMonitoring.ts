import { z } from "zod";
import type { UsersApi, AnalyticsApi, Models } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { errorResult } from "./utils/errorResult.js";
import { formatDistanceToNow } from "date-fns";

export interface ToolDependencies {
  readonly usersApi: Pick<UsersApi, "getUsers">;
  readonly analyticsApi: Pick<AnalyticsApi, "postAnalyticsUsersDetailsQuery">;
}

const paramsSchema = z.object({
  userIds: z
    .array(
      z
        .string()
        .uuid()
        .describe("A UUID for a user/agent (e.g., 00000000-0000-0000-0000-000000000000)")
    )
    .min(1)
    .max(100)
    .optional()
    .describe("Optional list of up to 100 specific user IDs to monitor. If not provided, returns all agents."),
  includeInactive: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include inactive/disabled agents in the results"),
  pageSize: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .default(100)
    .describe("Maximum number of agents to return (1-500)")
});

type AgentInfo = {
  id: string;
  name: string;
  email?: string;
  state: string;
  title?: string;
  department?: string;
  version: number;
  manager?: string;
  isActive: boolean;
};

export const agentStatusMonitoring: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ usersApi, analyticsApi }) =>
  createTool({
    schema: {
      name: "agent_status_monitoring",
      annotations: { title: "Agent Status Monitoring" },
      description:
        "Monitors agent information including names, email addresses, departments, titles, managers, and account status (active/inactive). Provides essential agent directory and workforce information for contact center management.",
      paramsSchema,
    },
    call: async ({ userIds, includeInactive = false, pageSize = 100 }) => {
      try {
        // Get users/agents
        let usersResponse: Models.UserEntityListing;
        try {
          const queryParams: any = {
            pageSize: pageSize,
            sortOrder: "asc",
            state: includeInactive ? undefined : "active"
          };
          
          if (userIds && userIds.length > 0) {
            queryParams.id = userIds;
          }

          usersResponse = await usersApi.getUsers(queryParams);
        } catch (error) {
          const message = isUnauthorisedError(error)
            ? "Failed to get users: Unauthorised access. Please check API credentials or permissions."
            : `Failed to get users: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
          return errorResult(message);
        }

        if (!usersResponse.entities || usersResponse.entities.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: userIds?.length 
                  ? "No agents found with the specified user IDs."
                  : "No agents found in the organization."
              }
            ]
          };
        }

        // Process agents data
        const agentInfos: AgentInfo[] = [];
        
        for (const user of usersResponse.entities) {
          if (!user.id) continue;

          const agentInfo: AgentInfo = {
            id: user.id,
            name: user.name || "Unknown",
            email: user.email,
            state: user.state || "unknown",
            title: user.title,
            department: user.department,
            version: user.version || 0,
            manager: user.manager?.name,
            isActive: user.state === "active"
          };

          agentInfos.push(agentInfo);
        }

        // Sort agents by name
        agentInfos.sort((a, b) => a.name.localeCompare(b.name));

        // Generate output
        const output: string[] = [
          `👥 Agent Directory - ${agentInfos.length} agents found`,
          `🕒 Report generated: ${new Date().toISOString()}`,
          ""
        ];

        // Statistics summary
        const activeAgents = agentInfos.filter(a => a.isActive).length;
        const inactiveAgents = agentInfos.filter(a => !a.isActive).length;
        const departments = new Set(agentInfos.map(a => a.department).filter(Boolean)).size;

        output.push("📊 Agent Summary:");
        output.push(`   • Active Agents: ${activeAgents}`);
        if (includeInactive) {
          output.push(`   • Inactive Agents: ${inactiveAgents}`);
        }
        output.push(`   • Total Agents: ${agentInfos.length}`);
        output.push(`   • Departments: ${departments}`);
        output.push("");

        // Group agents by department
        const departmentGroups = new Map<string, AgentInfo[]>();
        agentInfos.forEach(agent => {
          const dept = agent.department || "No Department";
          if (!departmentGroups.has(dept)) {
            departmentGroups.set(dept, []);
          }
          departmentGroups.get(dept)!.push(agent);
        });

        // Display agents by department
        for (const [department, agents] of departmentGroups) {
          const activeCount = agents.filter(a => a.isActive).length;
          const statusIcon = activeCount === agents.length ? "🟢" : 
                            activeCount === 0 ? "🔴" : "🟡";
          
          output.push(`${statusIcon} ${department} (${agents.length} agents, ${activeCount} active):`);
          
          agents.forEach(agent => {
            let agentLine = `   ${agent.isActive ? "✅" : "❌"} ${agent.name}`;
            
            if (agent.email) {
              agentLine += ` (${agent.email})`;
            }
            
            if (agent.title) {
              agentLine += ` | ${agent.title}`;
            }
            
                         if (agent.manager) {
               agentLine += ` | Manager: ${agent.manager}`;
             }

            output.push(agentLine);
          });
          
          output.push("");
        }



        output.push("📖 Legend:");
        output.push("   ✅ Active Agent     ❌ Inactive Agent");
        output.push("   🟢 All Active      🟡 Mixed Status     🔴 All Inactive");

        return {
          content: [
            {
              type: "text",
              text: output.join("\n")
            }
          ]
        };

      } catch (error) {
        const message = isUnauthorisedError(error)
          ? "Failed to monitor agent status: Unauthorised access. Please check API credentials or permissions."
          : `Failed to monitor agent status: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
        return errorResult(message);
      }
    },
  }); 