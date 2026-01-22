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

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { generateAccessToken, invalidateCache } from '../src/index.js'
import { getAccessTokenByClientCredentials } from '../src/ims.js'
import { codes } from '../src/errors.js'

// Mock fetch globally
global.fetch = vi.fn()

// Helper to create mock headers
const createMockHeaders = (headers = {}) => ({
  get: (name) => headers[name.toLowerCase()] || null
})

describe('getAccessTokenByClientCredentials', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid', 'AdobeID']
  }

  const mockSuccessResponse = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('is a function', () => {
    expect(typeof getAccessTokenByClientCredentials).toBe('function')
  })

  test('successfully gets an access token with valid credentials', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const result = await getAccessTokenByClientCredentials(validParams)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expect.stringContaining('grant_type=client_credentials')
      })
    )
  })

  test('sends correct form data in request body', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials(validParams)

    const callArgs = fetch.mock.calls[0][1]
    const body = callArgs.body

    expect(body).toContain('grant_type=client_credentials')
    expect(body).toContain(`client_id=${validParams.clientId}`)
    expect(body).toContain(`client_secret=${validParams.clientSecret}`)
    expect(body).toContain(`org_id=${validParams.orgId}`)
    // URLSearchParams encodes commas as %2C
    // Scopes are sorted, so we check for both scopes
    expect(body).toContain('scope=')
    expect(body).toContain('AdobeID')
    expect(body).toContain('openid')
  })

  test('works with empty scopes array', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const paramsWithoutScopes = { ...validParams, scopes: [] }
    await getAccessTokenByClientCredentials(paramsWithoutScopes)

    const callArgs = fetch.mock.calls[0][1]
    const body = callArgs.body

    expect(body).not.toContain('scope=')
  })

  test('works without scopes parameter', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const { scopes, ...paramsWithoutScopes } = validParams
    await getAccessTokenByClientCredentials(paramsWithoutScopes)

    const callArgs = fetch.mock.calls[0][1]
    const body = callArgs.body

    expect(body).not.toContain('scope=')
  })

  test('uses production IMS URL by default', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials(validParams)

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses stage IMS URL when environment is stage', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, environment: 'stage' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses production IMS URL when environment is prod', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, environment: 'prod' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses production IMS URL for unknown environment values', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, environment: 'invalid' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('throws MISSING_PARAMETERS error when clientId is missing', async () => {
    const { clientId, ...paramsWithoutClientId } = validParams

    await expect(getAccessTokenByClientCredentials(paramsWithoutClientId))
      .rejects
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS error when clientSecret is missing', async () => {
    const { clientSecret, ...paramsWithoutClientSecret } = validParams

    await expect(getAccessTokenByClientCredentials(paramsWithoutClientSecret))
      .rejects
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS error when orgId is missing', async () => {
    const { orgId, ...paramsWithoutOrgId } = validParams

    await expect(getAccessTokenByClientCredentials(paramsWithoutOrgId))
      .rejects
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS error with multiple missing params', async () => {
    await expect(getAccessTokenByClientCredentials({ scopes: ['test'] }))
      .rejects
      .toThrow(codes.MISSING_PARAMETERS)

    // Additional validation
    let error
    try {
      await getAccessTokenByClientCredentials({ scopes: ['test'] })
    } catch (e) {
      error = e
    }
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('MISSING_PARAMETERS')
    expect(error.message).toContain('clientId')
    expect(error.message).toContain('clientSecret')
    expect(error.message).toContain('orgId')
  })

  test('throws IMS_TOKEN_ERROR when API returns error response', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: createMockHeaders({ 'x-debug-id': 'debug-123' }),
      json: async () => ({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      })
    }

    fetch.mockResolvedValue(mockErrorResponse)

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow(codes.IMS_TOKEN_ERROR)

    // Additional validation
    let error
    try {
      await getAccessTokenByClientCredentials(validParams)
    } catch (e) {
      error = e
    }
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('IMS_TOKEN_ERROR')
    expect(error.message).toContain('Invalid client credentials')
    expect(error.sdkDetails.statusCode).toBe(400)
  })

  test('throws IMS_TOKEN_ERROR on 401 unauthorized', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: createMockHeaders(),
      json: async () => ({
        error: 'unauthorized',
        error_description: 'Authentication failed'
      })
    })

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow(codes.IMS_TOKEN_ERROR)
  })

  test('throws IMS_TOKEN_ERROR with HTTP status when no error fields present', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: createMockHeaders(),
      json: async () => ({}) // Empty response without error or error_description
    })

    // Verify it falls back to HTTP status message
    let error
    try {
      await getAccessTokenByClientCredentials(validParams)
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('IMS_TOKEN_ERROR')
    expect(error.message).toContain('HTTP 503')
    expect(error.sdkDetails.statusCode).toBe(503)
  })

  test('throws GENERIC_ERROR on network failure', async () => {
    fetch.mockRejectedValue(new Error('Network connection failed'))

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow(codes.GENERIC_ERROR)

    // Additional validation
    let error
    try {
      await getAccessTokenByClientCredentials(validParams)
    } catch (e) {
      error = e
    }
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('GENERIC_ERROR')
    expect(error.message).toContain('Network connection failed')
  })

  test('throws GENERIC_ERROR on timeout', async () => {
    fetch.mockRejectedValueOnce(new Error('Request timeout'))

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow(codes.GENERIC_ERROR)
  })

  test('includes sdkDetails in error for debugging', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: createMockHeaders({ 'x-debug-id': 'debug-500' }),
      json: async () => ({
        error: 'server_error'
      })
    }

    fetch.mockResolvedValue(mockErrorResponse)

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow(codes.IMS_TOKEN_ERROR)

    // Additional validation
    let error
    try {
      await getAccessTokenByClientCredentials(validParams)
    } catch (e) {
      error = e
    }
    expect(error.sdkDetails).toBeDefined()
    expect(error.sdkDetails.clientId).toBe(validParams.clientId)
    expect(error.sdkDetails.orgId).toBe(validParams.orgId)
    expect(error.sdkDetails.statusCode).toBe(500)
    expect(error.sdkDetails.xDebugId).toBe('debug-500')
  })
})

describe('generateAccessToken', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid']
  }

  const mockSuccessResponse = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateCache()
  })

  test('is a function', () => {
    expect(typeof generateAccessToken).toBe('function')
  })

  test('is an alias for getAccessTokenByClientCredentials', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse
    })

    const result = await generateAccessToken(validParams)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('throws same errors as getAccessTokenByClientCredentials', async () => {
    await expect(generateAccessToken({}))
      .rejects
      .toThrow(codes.MISSING_PARAMETERS)
  })
})

describe('getAccessTokenByClientCredentials - no caching', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid']
  }

  const mockSuccessResponse = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('does not cache - always makes fresh API calls', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    // First call
    await getAccessTokenByClientCredentials(validParams)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call - should make another API call (no cache)
    await getAccessTokenByClientCredentials(validParams)
    expect(fetch).toHaveBeenCalledTimes(2)

    // Third call - should make another API call (no cache)
    await getAccessTokenByClientCredentials(validParams)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})

describe('generateAccessToken - with caching', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid']
  }

  const mockSuccessResponse = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateCache()
  })

  test('caches token and returns from cache on subsequent calls', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    // First call - should fetch
    const result1 = await generateAccessToken(validParams)
    expect(result1).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call - should return from cache
    const result2 = await generateAccessToken(validParams)
    expect(result2).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1) // Still only 1 call
  })

  test('different credentials result in different cache entries', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Different clientId
    await generateAccessToken({ ...validParams, clientId: 'different-client' })
    expect(fetch).toHaveBeenCalledTimes(2)

    // Different orgId
    await generateAccessToken({ ...validParams, orgId: 'different-org' })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('different environments result in different cache entries', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken({ ...validParams, environment: 'prod' })
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken({ ...validParams, environment: 'stage' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('different scopes result in different cache entries', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken({ ...validParams, scopes: ['openid'] })
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken({ ...validParams, scopes: ['openid', 'profile'] })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('same scopes in different order use same cache entry', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken({ ...validParams, scopes: ['profile', 'openid'] })
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken({ ...validParams, scopes: ['openid', 'profile'] })
    expect(fetch).toHaveBeenCalledTimes(1) // Should use cache
  })

  test('invalidateCache clears the cache', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    // First call
    await generateAccessToken(validParams)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Clear cache
    invalidateCache()

    // Should fetch again
    await generateAccessToken(validParams)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('failed requests are not cached', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: createMockHeaders(),
      json: async () => ({ error: 'unauthorized' })
    })

    // First call - should fail
    await expect(generateAccessToken(validParams))
      .rejects
      .toThrow(codes.IMS_TOKEN_ERROR)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call - should try again (not cached)
    await expect(generateAccessToken(validParams))
      .rejects
      .toThrow(codes.IMS_TOKEN_ERROR)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('invalidateCache', () => {
  test('is a function', () => {
    expect(typeof invalidateCache).toBe('function')
  })

  test('can be called without errors', () => {
    expect(() => invalidateCache()).not.toThrow()
  })
})
