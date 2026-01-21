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
 * @returns Promise that resolves with the token response
 * @throws {Error} If there's an error getting the access token
 */
export function generateAccessToken(params: TokenParams): Promise<TokenResponse>

/**
 * Invalidates the token cache
 */
export function invalidateCache(): void

