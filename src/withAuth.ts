import { type ApiClientClass } from "purecloud-platform-client-v2";
import { type ToolCall } from "./tools/utils/createTool.js";
import { z } from "zod";

let isAuthenticated = false;

interface AuthConfig {
  readonly region: string;
  readonly oAuthClientId: string;
  readonly oAuthClientSecret: string;
}

async function ensureAuthenticated(
  apiClient: ApiClientClass,
  authConfig: AuthConfig,
) {
  if (!isAuthenticated) {
    apiClient.setEnvironment(authConfig.region);
    await apiClient.loginClientCredentialsGrant(
      authConfig.oAuthClientId,
      authConfig.oAuthClientSecret,
    );
    isAuthenticated = true;
  }
}

export function withAuth<Schema extends z.Schema = z.Schema>(
  call: ToolCall<Schema>,
  authConfig: AuthConfig,
  apiClient: ApiClientClass,
): ToolCall<Schema> {
  return async (input: Schema) => {
    await ensureAuthenticated(apiClient, authConfig);
    return call(input);
  };
}
