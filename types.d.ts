/**
 * Typings for @adobe/aio-lib-core-auth
 * Generated from JSDoc
 */

export interface TokenParams {
  clientId: string
  clientSecret: string
  orgId: string
  scopes?: string[]
  environment?: 'prod' | 'stage'
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Generates an access token for authentication (with caching)
 * @param params - Parameters for token generation
 * @param params.clientId - The client ID
 * @param params.clientSecret - The client secret
 * @param params.orgId - The organization ID
 * @param [params.scopes = []] - Array of scopes to request
 * @param [imsEnv] - The IMS environment ('prod' or 'stage'); when omitted or falsy, uses stage if __OW_NAMESPACE starts with 'development-', else prod
 * @returns Promise that resolves with the token response
 */
export function generateAccessToken(params: TokenParams): Promise<TokenResponse>

/**
 * Invalidates the token cache
 */
export function invalidateCache(): void

