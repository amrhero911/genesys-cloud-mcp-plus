import { z } from "zod";
import type { Models, AnalyticsApi } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { errorResult } from "./utils/errorResult.js";
import { waitFor } from "./utils/waitFor.js";

const MAX_ATTEMPTS = 20;

const paramsSchema = z.object({
  startDate: z.string().describe("The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')"),
  endDate: z.string().describe("The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')"),
  queueIds: z.array(z.string().uuid()).max(100).describe("Optional: List of up to 100 queue IDs to filter by").optional(),
  wrapUpCodes: z.array(z.string()).max(50).describe("Optional: List of specific wrap-up codes to filter by").optional(),
  mediaTypes: z.array(z.enum(['voice', 'email', 'chat', 'sms', 'messaging', 'callback', 'social', 'video'])).describe("Optional: Filter by specific media types").optional(),
});

export interface ToolDependencies {
  readonly analyticsApi: Pick<AnalyticsApi, 
    "postAnalyticsConversationsDetailsJobs" | 
    "getAnalyticsConversationsDetailsJob" | 
    "getAnalyticsConversationsDetailsJobResults"
  >;
}

interface WrapUpCodeAnalysis {
  wrapUpCode: string;
  conversationCount: number;
  percentage: number;
  queueBreakdown: Record<string, number>;
  mediaTypeBreakdown: Record<string, number>;
  examples: string[];
}

export const wrapUpCodeAnalytics: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "wrap_up_code_analytics",
      annotations: { title: "Wrap-Up Code Analytics" },
      description: "Analyzes wrap-up codes from conversations to understand interaction types and volumes. Useful for answering questions like 'how many inquiries came today' or 'what types of calls did we receive'. Returns detailed breakdown by wrap-up code, queue, and media type.",
      paramsSchema,
    },
    call: async ({ startDate, endDate, queueIds, wrapUpCodes, mediaTypes }) => {
      const from = new Date(startDate);
      const to = new Date(endDate);

      if (isNaN(from.getTime()))
        return errorResult("startDate is not a valid ISO-8601 date.");
      if (isNaN(to.getTime()))
        return errorResult("endDate is not a valid ISO-8601 date.");
      if (from >= to) return errorResult("Start date must be before end date.");
      
      const now = new Date();
      if (to > now) {
        to.setTime(now.getTime());
      }

      try {
        // Build segment filters
        const segmentFilters: Models.SegmentDetailQueryFilter[] = [
          {
            type: "and",
            predicates: [
              {
                dimension: "purpose",
                value: "customer",
              },
            ],
          },
        ];

        // Add queue filter if provided
        if (queueIds && queueIds.length > 0) {
          segmentFilters.push({
            type: "or",
            predicates: queueIds.map((id) => ({
              dimension: "queueId",
              value: id,
            })),
          });
        }

        // Add media type filter if provided
        if (mediaTypes && mediaTypes.length > 0) {
          segmentFilters.push({
            type: "or",
            predicates: mediaTypes.map((type) => ({
              dimension: "mediaType",
              value: type,
            })),
          });
        }

        // Add wrap-up code filter if provided
        if (wrapUpCodes && wrapUpCodes.length > 0) {
          segmentFilters.push({
            type: "or",
            predicates: wrapUpCodes.map((code) => ({
              dimension: "wrapUpCode",
              value: code,
            })),
          });
        }

        const job = await analyticsApi.postAnalyticsConversationsDetailsJobs({
          interval: `${from.toISOString()}/${to.toISOString()}`,
          order: "desc",
          orderBy: "conversationStart",
          segmentFilters,
        });

        const jobId = job.jobId;
        if (!jobId)
          return errorResult("Job ID not returned from Genesys Cloud.");

        let state: string | undefined = undefined;
        let attempts = 0;
        while (attempts < MAX_ATTEMPTS) {
          const jobStatus =
            await analyticsApi.getAnalyticsConversationsDetailsJob(jobId);
          state = jobStatus.state ?? "UNKNOWN";

          if (state === "FULFILLED") break;

          switch (jobStatus.state) {
            case "FAILED":
              return errorResult("Analytics job failed.");
            case "CANCELLED":
              return errorResult("Analytics job was cancelled.");
            case "EXPIRED":
              return errorResult("Analytics job results have expired.");
            case "UNKNOWN":
              return errorResult(
                "Analytics job returned an unknown or undefined state.",
              );
          }

          await waitFor(3000);
          attempts++;
        }

        if (state !== "FULFILLED") {
          return errorResult(
            "Timed out waiting for analytics job to complete.",
          );
        }

        const results =
          await analyticsApi.getAnalyticsConversationsDetailsJobResults(jobId);
        const conversations = results.conversations ?? [];

        // Analyze wrap-up codes
        const wrapUpCodeCounts = new Map<string, WrapUpCodeAnalysis>();
        let totalConversations = 0;
        let conversationsWithWrapUp = 0;

        for (const conversation of conversations) {
          if (!conversation.participants) continue;

          for (const participant of conversation.participants) {
            if (!participant.sessions) continue;

            for (const session of participant.sessions) {
              if (!session.segments) continue;

              for (const segment of session.segments) {
                if (segment.wrapUpCode) {
                  const wrapUpCode = segment.wrapUpCode;
                  const queueId = segment.queueId || 'Unknown';
                  const mediaType = session.mediaType || 'unknown';
                  const conversationId = conversation.conversationId || 'unknown';

                  if (!wrapUpCodeCounts.has(wrapUpCode)) {
                    wrapUpCodeCounts.set(wrapUpCode, {
                      wrapUpCode,
                      conversationCount: 0,
                      percentage: 0,
                      queueBreakdown: {},
                      mediaTypeBreakdown: {},
                      examples: [],
                    });
                  }

                  const analysis = wrapUpCodeCounts.get(wrapUpCode)!;
                  analysis.conversationCount++;
                  analysis.queueBreakdown[queueId] = (analysis.queueBreakdown[queueId] || 0) + 1;
                  analysis.mediaTypeBreakdown[mediaType] = (analysis.mediaTypeBreakdown[mediaType] || 0) + 1;
                  
                  // Add example conversation IDs (limit to 5)
                  if (analysis.examples.length < 5) {
                    analysis.examples.push(conversationId);
                  }
                  
                  conversationsWithWrapUp++;
                }
              }
            }
          }
          totalConversations++;
        }

        // Calculate percentages
        for (const analysis of wrapUpCodeCounts.values()) {
          analysis.percentage = totalConversations > 0 ? 
            Math.round((analysis.conversationCount / totalConversations) * 100) : 0;
        }

        // Sort by count (descending)
        const sortedAnalysis = Array.from(wrapUpCodeCounts.values())
          .sort((a, b) => b.conversationCount - a.conversationCount);

        // Generate results
        const dateRange = `${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`;
        const summaryStats = [
          `🗓️ Period: ${dateRange}`,
          `📊 Total Conversations: ${totalConversations}`,
          `🏷️ Conversations with Wrap-Up: ${conversationsWithWrapUp}`,
          `📈 Wrap-Up Coverage: ${totalConversations > 0 ? Math.round((conversationsWithWrapUp / totalConversations) * 100) : 0}%`,
          `🔢 Unique Wrap-Up Codes: ${sortedAnalysis.length}`,
        ].join('\n');

        if (sortedAnalysis.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `${summaryStats}\n\n❌ No wrap-up codes found for the specified criteria.`,
              },
            ],
          };
        }

        // Create detailed analysis
        const detailedAnalysis = sortedAnalysis.map((analysis) => {
          const queueList = Object.entries(analysis.queueBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5) // Top 5 queues
            .map(([queue, count]) => `    📞 ${queue}: ${count}`)
            .join('\n');

          const mediaList = Object.entries(analysis.mediaTypeBreakdown)
            .sort(([,a], [,b]) => b - a)
            .map(([media, count]) => `    📱 ${media}: ${count}`)
            .join('\n');

          return [
            `🏷️ Wrap-Up Code: "${analysis.wrapUpCode}"`,
            `   📊 Count: ${analysis.conversationCount} (${analysis.percentage}%)`,
            `   🏢 Top Queues:`,
            queueList,
            `   📱 Media Types:`,
            mediaList,
            `   🔗 Example Conversations: ${analysis.examples.slice(0, 3).join(', ')}`,
          ].join('\n');
        }).join('\n\n');

        const resultText = [
          `📈 WRAP-UP CODE ANALYTICS REPORT`,
          `${'='.repeat(40)}`,
          '',
          summaryStats,
          '',
          '📋 DETAILED BREAKDOWN:',
          detailedAnalysis,
        ].join('\n');

        return {
          content: [
            {
              type: "text",
              text: resultText,
            },
          ],
        };

      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve wrap-up code analytics: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve wrap-up code analytics: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }
    },
  }); 