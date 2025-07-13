import { z } from "zod";
import { type ApiClientClass } from "purecloud-platform-client-v2";
import { type ToolCall } from "../tools/utils/createTool.js";
import { type ConfigRetriever } from "../createConfigRetriever.js";
import { errorResult } from "../tools/utils/errorResult.js";

let isAuthenticated = false;

type AuthResult =
  | { authenticated: true }
  | { authenticated: false; reason: string };

// Region mapping from AWS region names to Genesys Cloud environment domains
const REGION_MAPPING: Record<string, string> = {
  // Americas
  'us-east-1': 'mypurecloud.com',
  'us-east-2': 'use2.us-gov-pure.cloud', // FedRAMP
  'us-west-2': 'usw2.pure.cloud', 
  'ca-central-1': 'cac1.pure.cloud',
  'sa-east-1': 'sae1.pure.cloud',
  
  // Europe, Middle East, Africa
  'eu-central-1': 'mypurecloud.de',
  'eu-west-1': 'mypurecloud.ie',
  'eu-west-2': 'euw2.pure.cloud',
  'eu-central-2': 'euc2.pure.cloud',
  'me-central-1': 'mec1.pure.cloud',
  
  // Asia Pacific
  'ap-south-1': 'aps1.pure.cloud',
  'ap-northeast-2': 'apne2.pure.cloud',
  'ap-southeast-2': 'mypurecloud.com.au',
  'ap-northeast-1': 'mypurecloud.jp',
  'ap-northeast-3': 'apne3.pure.cloud',
};

function mapRegionToEnvironment(region: string): string {
  const mappedRegion = REGION_MAPPING[region];
  if (!mappedRegion) {
    throw new Error(`Unsupported region: ${region}. Supported regions: ${Object.keys(REGION_MAPPING).join(', ')}`);
  }
  return mappedRegion;
}

async function authenticate(
  apiClient: ApiClientClass,
  configRetriever: ConfigRetriever,
): Promise<AuthResult> {
  const config = configRetriever.getGenesysCloudConfig();
  if (!config.success) {
    return { authenticated: false, reason: config.reason };
  }
  const authConfig = config.value;

  try {
    const environment = mapRegionToEnvironment(authConfig.region);
    apiClient.setEnvironment(environment);
    await apiClient.loginClientCredentialsGrant(
      authConfig.oAuthClientId,
      authConfig.oAuthClientSecret,
    );
  } catch (e: unknown) {
    return {
      authenticated: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  return {
    authenticated: true,
  };
}

export const OAuthClientCredentialsWrapper = (
  configRetriever: ConfigRetriever,
  apiClient: ApiClientClass,
) => {
  return function <Schema extends z.Schema = z.Schema>(
    call: ToolCall<Schema>,
  ): ToolCall<Schema> {
    return async (input: Schema) => {
      if (!isAuthenticated) {
        const authResult = await authenticate(apiClient, configRetriever);
        if (authResult.authenticated) {
          isAuthenticated = true;
        } else {
          return errorResult(
            `Failed to authenticate with Genesys Cloud. Reason:\n${authResult.reason}`,
          );
        }
      }

      return call(input);
    };
  };
};
