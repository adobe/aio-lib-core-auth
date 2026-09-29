/**
 * Typings for @adobe/aio-lib-core-auth
 */

type Credentials =
  | { clientId: string; clientSecret: string; orgId: string; scopes?: string[] }
  | { client_id: string; client_secret: string; org_id: string; scopes?: string[] }

export type TokenParams = (
  | Credentials
  | { __ims_oauth_s2s: Credentials }
) & {
  /** Runtime IMS environment override */
  __ims_env?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface ResolvedCredentials {
  clientId: string
  clientSecret: string
  orgId: string
  scopes: string[]
}

export interface ResolvedAuth {
  credentials: ResolvedCredentials
  env: string
}

/**
 * Resolves credentials and environment from token params, without requesting a token.
 *
 * Credentials are resolved in order: direct params (camelCase or snake_case), then __ims_oauth_s2s if direct credentials are absent.
 * Environment is resolved in order: imsEnv argument, then params.__ims_env, then 'stage' if __OW_NAMESPACE starts with 'development-', otherwise 'prod'.
 *
 * @param params - Token parameters; must include camelCase credentials, snake_case credentials, or an __ims_oauth_s2s annotation object
 * @param [imsEnv] - The IMS environment ('prod' or 'stage'); when omitted or falsy, uses stage if __OW_NAMESPACE starts with 'development-', else prod
 * @returns The resolved, normalized credentials and environment
 * @throws If no valid credentials can be resolved
 */
export function resolveCredentials(params: TokenParams, imsEnv?: string): ResolvedAuth

/**
 * Generates an access token for authentication (with caching), from an already-resolved
 * { credentials, env } object (as returned by resolveCredentials).
 *
 * @param auth - Already-resolved credentials and environment
 * @returns Promise that resolves with the token response
 * @throws If there's an error getting the access token
 */
export function generateAccessToken(auth: ResolvedAuth): Promise<TokenResponse>

/**
 * Generates an access token for authentication (with caching)
 *
 * Credentials are resolved in order: direct params (camelCase or snake_case), then __ims_oauth_s2s if direct credentials are absent.
 * Environment is resolved in order: imsEnv argument, then params.__ims_env, then 'stage' if __OW_NAMESPACE starts with 'development-', otherwise 'prod'.
 *
 * @param params - Token parameters; must include camelCase credentials, snake_case credentials, or an __ims_oauth_s2s annotation object
 * @param params.clientId - The client ID (camelCase form; alternatively client_id)
 * @param params.clientSecret - The client secret (camelCase form; alternatively client_secret)
 * @param params.orgId - The organization ID (camelCase form; alternatively org_id)
 * @param params.scopes - Array of scopes to request (default [])
 * @param params.__ims_oauth_s2s - Credentials injected by the include-ims-credentials annotation
 * @param [imsEnv] - The IMS environment ('prod' or 'stage'); when omitted or falsy, uses stage if __OW_NAMESPACE starts with 'development-', else prod
 * @returns Promise that resolves with the token response
 * @throws If there's an error getting the access token
 */
export function generateAccessToken(params: TokenParams, imsEnv?: string): Promise<TokenResponse>

/**
 * Invalidates the token cache
 */
export function invalidateCache(): void

