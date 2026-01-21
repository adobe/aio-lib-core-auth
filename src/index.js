/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { getAccessTokenByClientCredentials } from './ims.js'
import TTLCache from '@isaacs/ttlcache'

// Token cache with TTL
// Opinionated for now, we could make it confiurable in the future if needed -mg
const tokenCache = new TTLCache({ ttl: 5 * 60 * 1000 }) // 5 minutes in milliseconds

/**
 * Generates a cache key for token storage
 *
 * @private
 * @param {string} clientId - The client ID
 * @param {string} orgId - The organization ID
 * @param {string} environment - The environment
 * @param {string[]} scopes - Array of scopes
 * @returns {string} The cache key
 */
function getCacheKey (clientId, orgId, environment, scopes) {
  const scopeKey = scopes.length > 0 ? scopes.sort().join(',') : 'none'
  return `${clientId}:${orgId}:${environment}:${scopeKey}`
}

/**
 * Invalidates the token cache
 *
 * @returns {void}
 */
export function invalidateCache () {
  tokenCache.clear()
}

/**
 * Generates an access token for authentication (with caching)
 *
 * @param {object} params - Parameters for token generation
 * @param {string} params.clientId - The client ID
 * @param {string} params.clientSecret - The client secret
 * @param {string} params.orgId - The organization ID
 * @param {string[]} [params.scopes=[]] - Array of scopes to request
 * @param {string} [params.environment='prod'] - The IMS environment ('prod' or 'stage')
 * @returns {Promise<object>} Promise that resolves with the token response
 * @throws {Error} If there's an error getting the access token
 */
export async function generateAccessToken ({ clientId, clientSecret, orgId, scopes = [], environment = 'prod' }) {
  // Check cache first
  const cacheKey = getCacheKey(clientId, orgId, environment, scopes)
  const cachedToken = tokenCache.get(cacheKey)
  if (cachedToken) {
    return cachedToken
  }

  // Get token from IMS
  const token = await getAccessTokenByClientCredentials({ clientId, clientSecret, orgId, scopes, environment })

  // Cache the token
  tokenCache.set(cacheKey, token)

  return token
}
