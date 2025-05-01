import { z } from "zod";

export interface MockingConfig {
  readonly mockingEnabled: true;
}

export interface RealConfig {
  readonly mockingEnabled: false;
  readonly genesysCloud: {
    readonly region: string;
    readonly oAuthClientId: string;
    readonly oAuthClientSecret: string;
  };
}

export interface SuccessResult {
  success: true;
  config: MockingConfig | RealConfig;
}

export interface ErrorResult {
  success: false;
  reason: string;
}

export type Result = SuccessResult | ErrorResult;

const mockingConfigSchema = z.object({
  MOCKING_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false"),
});

const genesysAuthConfigSchema = z.object({
  GENESYSCLOUD_REGION: z.string({
    required_error: "Missing environment variable: GENESYSCLOUD_REGION",
  }),
  GENESYSCLOUD_OAUTHCLIENT_ID: z.string({
    required_error: "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_ID",
  }),
  GENESYSCLOUD_OAUTHCLIENT_SECRET: z.string({
    required_error:
      "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_SECRET",
  }),
});

export function loadConfig(env: NodeJS.ProcessEnv): Result {
  const mockingConfig = mockingConfigSchema.safeParse(env);
  const mockingEnabled = Boolean(mockingConfig.data?.MOCKING_ENABLED);

  if (mockingEnabled) {
    return {
      success: true,
      config: {
        mockingEnabled,
      },
    };
  }

  const genesysAuthConfig = genesysAuthConfigSchema.safeParse(env);
  if (!genesysAuthConfig.success) {
    const failureReason = [
      "Failed to parse environment variables",
      ...genesysAuthConfig.error.issues.map((i) => i.message),
    ];

    return {
      success: false,
      reason: failureReason.join("\n"),
    };
  }

  return {
    success: true,
    config: {
      mockingEnabled,
      genesysCloud: {
        region: genesysAuthConfig.data.GENESYSCLOUD_REGION,
        oAuthClientId: genesysAuthConfig.data.GENESYSCLOUD_OAUTHCLIENT_ID,
        oAuthClientSecret:
          genesysAuthConfig.data.GENESYSCLOUD_OAUTHCLIENT_SECRET,
      },
    },
  };
}
