// Capability only: credentials never leave the server.
import { isDirectConfigured } from './direct-provider.js';
export function isGatewayConfigured(env = process.env) {
  return !!(
    (env.AI_GATEWAY_MODEL &&
      (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN)) ||
    isDirectConfigured(env)
  );
}
