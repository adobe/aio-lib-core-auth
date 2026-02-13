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

const { getAccessTokenByClientCredentials, getAndValidateCredentials } = require('./ims.js')
const { codes, messages } = require('./errors.js')
const { TTLCache } = require('@isaacs/ttlcache')
const crypto = require('crypto')

// Token cache with TTL
// Opinionated for now, we could make it configurable in the future if needed -mg
const tokenCache = new TTLCache({ ttl: 5 * 60 * 1000 }) // 5 minutes in milliseconds

/**
 * Generates a cache key for token storage
 *
 * @private
 * @param {object} credentials - The credentials object
 * @param {string} credentials.clientId - The client ID
 * @param {string} credentials.orgId - The organization ID
 * @param {string} credentials.env - The env
 * @param {string[]} credentials.scopes - Array of scopes
 * @returns {string} The cache key
 */
function getCacheKey ({clientId, orgId, env, scopes, clientSecret}) {
  const scopeKey = scopes.length > 0 ? scopes.sort().join(',') : 'none'
  return crypto.createHash('sha1').update(`${clientId}:${orgId}:${scopeKey}:${clientSecret}:${env}`).digest('hex')
}

/**
 * Invalidates the token cache
 *
 * @returns {void}
 */
function invalidateCache () {
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
 * @param {string} [imsEnv] - The IMS environment ('prod' or 'stage'); when omitted or falsy, uses stage if __OW_NAMESPACE starts with 'development-', else prod
 * @returns {Promise<object>} Promise that resolves with the token response
 * @throws {Error} If there's an error getting the access token
 */
async function generateAccessToken (params, imsEnv) {
  imsEnv = imsEnv || (ioRuntimeStageNamespace() ? 'stage' : 'prod')

  const credentials = getAndValidateCredentials(params)

  const credAndEnv = { ...credentials, env: imsEnv }

  // Check cache first
  const cacheKey = getCacheKey(credAndEnv)
  const cachedToken = tokenCache.get(cacheKey)
  if (cachedToken) {
    return cachedToken
  }

  // Get token from IMS
  const token = await getAccessTokenByClientCredentials(credAndEnv)

  // Cache the token
  tokenCache.set(cacheKey, token)

  return token
}

function ioRuntimeStageNamespace () {
  return process.env.__OW_NAMESPACE && process.env.__OW_NAMESPACE.startsWith('development-')
}

module.exports = {
  invalidateCache,
  generateAccessToken,
  getAccessTokenByClientCredentials,
  getAndValidateCredentials,
  codes,
  messages
}
