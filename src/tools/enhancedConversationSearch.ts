import { z } from "zod";
import type { AnalyticsApi, Models } from "purecloud-platform-client-v2";
import { formatDistanceStrict } from "date-fns/formatDistanceStrict";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { paginationSection } from "./utils/paginationSection.js";
import { errorResult } from "./utils/errorResult.js";

export interface ToolDependencies {
  readonly analyticsApi: Pick<
    AnalyticsApi,
    "postAnalyticsConversationsDetailsQuery"
  >;
}

// All supported media types in Genesys Cloud
const MEDIA_TYPES = [
  "voice",
  "email", 
  "chat",
  "sms",
  "messaging", // Facebook, WhatsApp, Twitter
  "callback",
  "social",
  "video",
  "cobrowse",
  "screenshare"
] as const;

function createAniSegmentFilter(
  phoneNumber: string,
): Models.SegmentDetailQueryFilter {
  const normalisedPhoneNumber = phoneNumber.replace(/\D/g, "");
  return {
    type: "or",
    predicates: [
      {
        dimension: "ani",
        value: normalisedPhoneNumber,
      },
    ],
  };
}

function createMediaTypeFilter(
  mediaTypes: string[],
): Models.SegmentDetailQueryFilter {
  return {
    type: "or",
    predicates: mediaTypes.map(mediaType => ({
      dimension: "mediaType",
      value: mediaType,
    })),
  };
}

const paramsSchema = z.object({
  phoneNumber: z
    .string()
    .optional()
    .describe(
      "Optional. Filters results to only include conversations involving this phone number (e.g., '+440000000000')",
    ),
  mediaTypes: z
    .array(z.enum(MEDIA_TYPES))
    .optional()
    .describe(
      "Optional. Filter by specific media types. Available: voice, email, chat, sms, messaging, callback, social, video, cobrowse, screenshare. If not specified, includes all types.",
    ),
  pageNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets",
    ),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "The maximum number of conversations to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 100",
    ),
  startDate: z
    .string()
    .describe(
      "The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')",
    ),
  endDate: z
    .string()
    .describe(
      "The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')",
    ),
});

export const enhancedConversationSearch: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "enhanced_conversation_search",
      annotations: { title: "Enhanced Conversation Search" },
      description:
        "Searches for conversations across all media types (voice, email, chat, SMS, messaging, etc.) within a specified time window. Provides media type breakdown and filtering capabilities for comprehensive omnichannel analytics.",
      paramsSchema,
    },
    call: async ({
      phoneNumber,
      mediaTypes,
      startDate,
      endDate,
      pageNumber = 1,
      pageSize = 100,
    }) => {
      const from = new Date(startDate);
      const to = new Date(endDate);

      if (isNaN(from.getTime()))
        return errorResult("startDate is not a valid ISO-8601 date.");
      if (isNaN(to.getTime()))
        return errorResult("endDate is not a valid ISO-8601 date.");
      if (from >= to) return errorResult("Start date must be before end date.");

      const now = new Date();
      if (from > now) return errorResult("Start date cannot be in the future.");

      let result: Models.AnalyticsConversationQueryResponse;

      // Create segment filters
      const segmentFilters: Models.SegmentDetailQueryFilter[] = [];

      // Add media type filter
      if (mediaTypes && mediaTypes.length > 0) {
        segmentFilters.push(createMediaTypeFilter(mediaTypes));
      } else {
        // Include all common media types if none specified
        segmentFilters.push(createMediaTypeFilter(["voice", "email", "chat", "sms", "messaging", "callback"]));
      }

      // Add direction filter for voice/callback
      segmentFilters.push({
        type: "or",
        predicates: [
          { dimension: "direction", value: "inbound" },
          { dimension: "direction", value: "outbound" },
        ],
      });

      // Add phone number filter if provided
      if (phoneNumber) {
        segmentFilters.push(createAniSegmentFilter(phoneNumber));
      }

      try {
        result = await analyticsApi.postAnalyticsConversationsDetailsQuery({
          order: "desc",
          orderBy: "conversationStart",
          paging: { pageSize, pageNumber },
          interval: `${from.toISOString()}/${to.toISOString()}`,
          segmentFilters,
          conversationFilters: [],
          evaluationFilters: [],
          surveyFilters: [],
        });
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to search conversations: Unauthorised access. Please check API credentials or permissions."
          : `Failed to search conversations: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

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

      if (!result.conversations) {
        return {
          isError: false,
          content: [
            {
              type: "text",
              text: "No conversations found for the specified criteria.",
            },
          ],
        };
      }

      // Analyze media type breakdown
      const mediaTypeBreakdown: Record<string, number> = {};
      const conversationDetails: Array<{
        id: string;
        mediaType: string;
        direction: string;
        duration: string;
        startTime: string;
      }> = [];

      result.conversations.forEach((conversation) => {
        if (conversation.conversationId && conversation.participants) {
          const participant = conversation.participants[0];
          const mediaType = participant?.sessions?.[0]?.mediaType || "unknown";
          const direction = participant?.sessions?.[0]?.direction || "unknown";
          
          // Count media types
          mediaTypeBreakdown[mediaType] = (mediaTypeBreakdown[mediaType] || 0) + 1;
          
          // Calculate duration
          const startTime = conversation.conversationStart ? new Date(conversation.conversationStart) : new Date();
          const endTime = conversation.conversationEnd ? new Date(conversation.conversationEnd) : new Date();
          const duration = formatDistanceStrict(startTime, endTime);
          
          conversationDetails.push({
            id: conversation.conversationId,
            mediaType,
            direction,
            duration,
            startTime: startTime.toISOString(),
          });
        }
      });

      // Create summary
      const totalConversations = result.conversations.length;
      const mediaTypeSummary = Object.entries(mediaTypeBreakdown)
        .map(([type, count]) => `${type}: ${count}`)
        .join(", ");

      // Create pagination info
      const pagination = paginationSection("Total Conversations", {
        pageNumber,
        pageSize,
        totalHits: result.totalHits,
        pageCount: Math.ceil((result.totalHits || 0) / pageSize),
      });

      // Create results text
      const conversationsList = conversationDetails
        .map((conv) => `${conv.id} (${conv.mediaType}/${conv.direction}) [${conv.duration}]`)
        .join("\n");

      const resultText = `📞 Enhanced Conversation Search Results

📊 Summary:
   • Total Conversations: ${totalConversations}
   • Media Types: ${mediaTypeSummary}
   • Date Range: ${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}
   ${phoneNumber ? `• Phone Filter: ${phoneNumber}` : ""}
   ${mediaTypes ? `• Media Filter: ${mediaTypes.join(", ")}` : ""}

🎯 Media Type Breakdown:
${Object.entries(mediaTypeBreakdown)
  .map(([type, count]) => `   • ${type.toUpperCase()}: ${count} conversations`)
  .join("\n")}

📋 Conversation Details:
${conversationsList}

${pagination.join("\n")}`;

      return {
        isError: false,
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    },
  }); 