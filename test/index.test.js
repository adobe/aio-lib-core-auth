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
import { getAccessTokenByClientCredentials, getAndValidateCredentials } from '../src/ims.js'
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

  test('uses stage IMS URL when env is stage', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, env: 'stage' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses production IMS URL when env is prod', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, env: 'prod' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses production IMS URL for unknown env values', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await getAccessTokenByClientCredentials({ ...validParams, env: 'invalid' })

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
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

    await generateAccessToken(validParams, 'prod')
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken(validParams, 'stage')
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

  test('empty scopes use same cache entry', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const paramsNoScopes = { ...validParams, scopes: [] }
    await generateAccessToken(paramsNoScopes)
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken(paramsNoScopes)
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

describe('getAndValidateCredentials', () => {
  test('is a function', () => {
    expect(typeof getAndValidateCredentials).toBe('function')
  })

  test('validates and returns credentials with camelCase params', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid']
    }

    const result = getAndValidateCredentials(params)

    expect(result).toEqual({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid']
    })
  })

  test('validates and returns credentials with snake_case params', () => {
    const params = {
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      org_id: 'test-org-id',
      scopes: ['openid']
    }

    const result = getAndValidateCredentials(params)

    expect(result).toEqual({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid']
    })
  })

  test('prefers camelCase over snake_case when both are provided', () => {
    const params = {
      clientId: 'camel-client-id',
      client_id: 'snake-client-id',
      clientSecret: 'camel-secret',
      client_secret: 'snake-secret',
      orgId: 'camel-org-id',
      org_id: 'snake-org-id'
    }

    const result = getAndValidateCredentials(params)

    expect(result.clientId).toBe('camel-client-id')
    expect(result.clientSecret).toBe('camel-secret')
    expect(result.orgId).toBe('camel-org-id')
  })

  test('defaults scopes to empty array when not provided', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id'
    }

    const result = getAndValidateCredentials(params)

    expect(result.scopes).toEqual([])
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is null', () => {
    expect(() => getAndValidateCredentials(null))
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)

    let error
    try {
      getAndValidateCredentials(null)
    } catch (e) {
      error = e
    }
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is undefined', () => {
    expect(() => getAndValidateCredentials(undefined))
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is an array', () => {
    expect(() => getAndValidateCredentials(['test']))
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is a string', () => {
    expect(() => getAndValidateCredentials('test'))
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is a number', () => {
    expect(() => getAndValidateCredentials(123))
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws MISSING_PARAMETERS when clientId is missing', () => {
    const params = {
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id'
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS when clientSecret is missing', () => {
    const params = {
      clientId: 'test-client-id',
      orgId: 'test-org-id'
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS when orgId is missing', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.MISSING_PARAMETERS)
  })

  test('throws MISSING_PARAMETERS with all missing params listed', () => {
    let error
    try {
      getAndValidateCredentials({})
    } catch (e) {
      error = e
    }

    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('MISSING_PARAMETERS')
    expect(error.message).toContain('clientId')
    expect(error.message).toContain('clientSecret')
    expect(error.message).toContain('orgId')
  })

  test('throws BAD_SCOPES_FORMAT when scopes is a string', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 'openid'
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.BAD_SCOPES_FORMAT)

    let error
    try {
      getAndValidateCredentials(params)
    } catch (e) {
      error = e
    }
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('BAD_SCOPES_FORMAT')
    expect(error.sdkDetails.scopesType).toBe('string')
  })

  test('throws BAD_SCOPES_FORMAT when scopes is an object', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: { scope: 'openid' }
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.BAD_SCOPES_FORMAT)
  })

  test('throws BAD_SCOPES_FORMAT when scopes is a number', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 123
    }

    expect(() => getAndValidateCredentials(params))
      .toThrow(codes.BAD_SCOPES_FORMAT)
  })

  test('accepts scopes as an array', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid', 'profile']
    }

    const result = getAndValidateCredentials(params)
    expect(result.scopes).toEqual(['openid', 'profile'])
  })
})

describe('generateAccessToken - BAD_SCOPES_FORMAT error', () => {
  test('throws BAD_SCOPES_FORMAT when scopes is a string', async () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 'openid'
    }

    await expect(generateAccessToken(params))
      .rejects
      .toThrow(codes.BAD_SCOPES_FORMAT)
  })
})

describe('generateAccessToken - snake_case params support', () => {
  const snakeCaseParams = {
    client_id: 'test-client-id',
    client_secret: 'test-client-secret',
    org_id: 'test-org-id',
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

  test('accepts snake_case parameters', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const result = await generateAccessToken(snakeCaseParams)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('sends correct form data with snake_case input params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(snakeCaseParams)

    const callArgs = fetch.mock.calls[0][1]
    const body = callArgs.body

    expect(body).toContain('client_id=test-client-id')
    expect(body).toContain('client_secret=test-client-secret')
    expect(body).toContain('org_id=test-org-id')
  })

  test('uses stage IMS URL when imsEnv is stage', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(snakeCaseParams, 'stage')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses prod IMS URL by default', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(snakeCaseParams)

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })
})

describe('generateAccessToken - imsEnv parameter', () => {
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

  test('uses stage IMS URL when imsEnv is stage', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams, 'stage')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses prod IMS URL when imsEnv is prod', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams, 'prod')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('defaults to prod IMS URL when imsEnv not provided', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams)

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses prod IMS URL for unknown imsEnv values', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams, 'unknown')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })
})

describe('generateAccessToken - include-ims-credentials annotation support', () => {
  const validCredentials = {
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

  test('extracts credentials from __ims_oauth_s2s property when present', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      __ims_oauth_s2s: validCredentials,
      someOtherProperty: 'ignored'
    }

    const result = await generateAccessToken(params)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
    
    const callArgs = fetch.mock.calls[0][1]
    const body = callArgs.body
    expect(body).toContain('client_id=test-client-id')
    expect(body).toContain('client_secret=test-client-secret')
    expect(body).toContain('org_id=test-org-id')
  })

  test('uses __ims_env from params when imsEnv argument is not provided', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      ...validCredentials,
      __ims_env: 'stage'
    }

    await generateAccessToken(params)

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('explicit imsEnv argument takes precedence over __ims_env in params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      ...validCredentials,
      __ims_env: 'stage'
    }

    await generateAccessToken(params, 'prod')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('supports both __ims_oauth_s2s and __ims_env together', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      __ims_oauth_s2s: validCredentials,
      __ims_env: 'stage'
    }

    const result = await generateAccessToken(params)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('defaults to prod when no imsEnv argument and no __ims_env in params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validCredentials)

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('uses credentials directly when __ims_oauth_s2s is not present', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const result = await generateAccessToken(validCredentials)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('caches correctly with __ims_oauth_s2s params', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      __ims_oauth_s2s: validCredentials,
      __ims_env: 'prod'
    }

    // First call - should fetch
    await generateAccessToken(params)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call with same params - should use cache
    await generateAccessToken(params)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('different __ims_env values result in different cache entries', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const paramsStage = {
      __ims_oauth_s2s: validCredentials,
      __ims_env: 'stage'
    }

    const paramsProd = {
      __ims_oauth_s2s: validCredentials,
      __ims_env: 'prod'
    }

    await generateAccessToken(paramsStage)
    expect(fetch).toHaveBeenCalledTimes(1)

    await generateAccessToken(paramsProd)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('generateAccessToken - BAD_CREDENTIALS_FORMAT error', () => {
  test('throws BAD_CREDENTIALS_FORMAT when params is null', async () => {
    await expect(generateAccessToken(null))
      .rejects
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is undefined', async () => {
    await expect(generateAccessToken(undefined))
      .rejects
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is an array', async () => {
    await expect(generateAccessToken(['test']))
      .rejects
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is a string', async () => {
    await expect(generateAccessToken('test'))
      .rejects
      .toThrow(codes.BAD_CREDENTIALS_FORMAT)
  })

  test('BAD_CREDENTIALS_FORMAT error includes sdk details', async () => {
    let error
    try {
      await generateAccessToken(null)
    } catch (e) {
      error = e
    }

    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('BAD_CREDENTIALS_FORMAT')
    expect(error.sdkDetails).toBeDefined()
    expect(error.sdkDetails.paramsType).toBe('object') // typeof null === 'object'
  })
})
