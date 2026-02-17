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

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateAccessToken, invalidateCache } from '../src/index.js'
import { IMS_OAUTH_S2S_INPUT } from '../src/constants.js'
import {
  getAccessTokenByClientCredentials,
  getAndValidateCredentials
} from '../src/ims.js'

// Credentials object as provided by include-ims-credentials annotation
const annotationCredentials = {
  clientId: 'annotation-client-id',
  clientSecret: 'annotation-client-secret',
  orgId: 'annotation-org-id',
  scopes: ['openid']
}

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
      .toThrow('IMS_TOKEN_ERROR')

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
      .toThrow('IMS_TOKEN_ERROR')
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

  test('throws GENERIC_ERROR on network failure', async () => {
    fetch.mockRejectedValue(new Error('Network connection failed'))

    await expect(getAccessTokenByClientCredentials(validParams))
      .rejects
      .toThrow('GENERIC_ERROR')

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
      .toThrow('GENERIC_ERROR')
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
      .toThrow('IMS_TOKEN_ERROR')

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

describe('getAccessTokenByClientCredentials - no caching', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid']
  }

  const mockSuccessResponse = {
    access_token: 'annotation-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateCache()
  })

  test('uses credentials from __ims_oauth_s2s when params has no credentials', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const params = {
      [IMS_OAUTH_S2S_INPUT]: annotationCredentials
    }

    const result = await generateAccessToken(params)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
    const callArgs = fetch.mock.calls[0][1]
    expect(callArgs.body).toContain('client_id=annotation-client-id')
    expect(callArgs.body).toContain('org_id=annotation-org-id')
  })

  test('throws params error when __ims_oauth_s2s is missing and params has no credentials', async () => {
    await expect(generateAccessToken({}))
      .rejects
      .toThrow('MISSING_PARAMETERS')
  })

  test('throws params error when __ims_oauth_s2s has invalid credentials', async () => {
    const params = {
      [IMS_OAUTH_S2S_INPUT]: { clientId: 'only-id' }
    }

    await expect(generateAccessToken(params))
      .rejects
      .toThrow('MISSING_PARAMETERS')
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

    expect(result.error).toBeNull()
    expect(result.credentials).toEqual({
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

    expect(result.error).toBeNull()
    expect(result.credentials).toEqual({
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

    expect(result.error).toBeNull()
    expect(result.credentials.clientId).toBe('camel-client-id')
    expect(result.credentials.clientSecret).toBe('camel-secret')
    expect(result.credentials.orgId).toBe('camel-org-id')
  })

  test('defaults scopes to empty array when not provided', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id'
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeNull()
    expect(result.credentials.scopes).toEqual([])
  })

  test('returns BAD_CREDENTIALS_FORMAT error when params is null', () => {
    const result = getAndValidateCredentials(null)

    expect(result.credentials).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(result.error.name).toBe('AuthSDKError')
    expect(result.error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('returns BAD_CREDENTIALS_FORMAT error when params is undefined', () => {
    const result = getAndValidateCredentials(undefined)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('returns BAD_CREDENTIALS_FORMAT error when params is an array', () => {
    const result = getAndValidateCredentials(['test'])

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('returns BAD_CREDENTIALS_FORMAT error when params is a string', () => {
    const result = getAndValidateCredentials('test')

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('returns BAD_CREDENTIALS_FORMAT error when params is a number', () => {
    const result = getAndValidateCredentials(123)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_CREDENTIALS_FORMAT')
  })

  test('returns MISSING_PARAMETERS error when clientId is missing', () => {
    const params = {
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id'
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('MISSING_PARAMETERS')
  })

  test('returns MISSING_PARAMETERS error when clientSecret is missing', () => {
    const params = {
      clientId: 'test-client-id',
      orgId: 'test-org-id'
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('MISSING_PARAMETERS')
  })

  test('returns MISSING_PARAMETERS error when orgId is missing', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('MISSING_PARAMETERS')
  })

  test('returns MISSING_PARAMETERS with all missing params listed', () => {
    const result = getAndValidateCredentials({})

    expect(result.error).toBeDefined()
    expect(result.error.name).toBe('AuthSDKError')
    expect(result.error.code).toBe('MISSING_PARAMETERS')
    expect(result.error.message).toContain('clientId')
    expect(result.error.message).toContain('clientSecret')
    expect(result.error.message).toContain('orgId')
  })

  test('returns BAD_SCOPES_FORMAT error when scopes is a string', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 'openid'
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.name).toBe('AuthSDKError')
    expect(result.error.code).toBe('BAD_SCOPES_FORMAT')
    expect(result.error.sdkDetails.scopesType).toBe('string')
  })

  test('returns BAD_SCOPES_FORMAT error when scopes is an object', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: { scope: 'openid' }
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_SCOPES_FORMAT')
  })

  test('returns BAD_SCOPES_FORMAT error when scopes is a number', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 123
    }

    const result = getAndValidateCredentials(params)

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('BAD_SCOPES_FORMAT')
  })

  test('accepts scopes as an array', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid', 'profile']
    }

    const result = getAndValidateCredentials(params)
    expect(result.error).toBeNull()
    expect(result.credentials.scopes).toEqual(['openid', 'profile'])
  })
})
