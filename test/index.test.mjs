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
import { generateAccessToken, invalidateCache, resolveCredentials } from '../src/index.js'
import { IMS_OAUTH_S2S_INPUT } from '../src/constants.js'

// Mock fetch globally
global.fetch = vi.fn()

// Helper to create mock headers
const createMockHeaders = (headers = {}) => ({
  get: (name) => headers[name.toLowerCase()] || null
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
      .toThrow('IMS_TOKEN_ERROR')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call - should try again (not cached)
    await expect(generateAccessToken(validParams))
      .rejects
      .toThrow('IMS_TOKEN_ERROR')
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

describe('generateAccessToken - imsEnv default (ioRuntimeStageNamespace)', () => {
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

  const originalNamespace = process.env.__OW_NAMESPACE

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateCache()
  })

  afterEach(() => {
    if (originalNamespace !== undefined) {
      process.env.__OW_NAMESPACE = originalNamespace
    } else {
      delete process.env.__OW_NAMESPACE
    }
  })

  test('uses stage IMS URL when imsEnv not provided and __OW_NAMESPACE starts with development-', async () => {
    process.env.__OW_NAMESPACE = 'development-12345'

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ims-na1-stg1.adobelogin.com/ims/token/v2')
  })

  test('uses prod IMS URL when imsEnv not provided and __OW_NAMESPACE is unset', async () => {
    delete process.env.__OW_NAMESPACE

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ims-na1.adobelogin.com/ims/token/v2')
  })

  test('uses prod IMS URL when imsEnv not provided and __OW_NAMESPACE does not start with development-', async () => {
    process.env.__OW_NAMESPACE = 'production-12345'

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ims-na1.adobelogin.com/ims/token/v2')
  })

  test('uses stage IMS URL when imsEnv is falsy (empty string) and __OW_NAMESPACE starts with development-', async () => {
    process.env.__OW_NAMESPACE = 'development-xyz'

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams, '')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ims-na1-stg1.adobelogin.com/ims/token/v2')
  })

  test('uses prod IMS URL when imsEnv is falsy (empty string) and __OW_NAMESPACE is unset', async () => {
    delete process.env.__OW_NAMESPACE

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    await generateAccessToken(validParams, '')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ims-na1.adobelogin.com/ims/token/v2')
  })
})

describe('resolveCredentials', () => {
  const validParams = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    orgId: 'test-org-id',
    scopes: ['openid']
  }

  test('resolves camelCase credentials and defaults env to prod', () => {
    const { credentials, env } = resolveCredentials(validParams)

    expect(credentials).toEqual(validParams)
    expect(env).toBe('prod')
  })

  test('resolves snake_case credentials', () => {
    const snakeCaseParams = {
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      org_id: 'test-org-id'
    }

    const { credentials } = resolveCredentials(snakeCaseParams)

    expect(credentials).toEqual({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: []
    })
  })

  test('uses credentials from include-ims-credentials annotation when params has no direct credentials', () => {
    const annotationCredentials = {
      clientId: 'annotation-client-id',
      clientSecret: 'annotation-client-secret',
      orgId: 'annotation-org-id'
    }

    const { credentials } = resolveCredentials({ [IMS_OAUTH_S2S_INPUT]: annotationCredentials })

    expect(credentials).toEqual({ ...annotationCredentials, scopes: [] })
  })

  test('throws the original params error when both direct params and annotation are invalid', () => {
    expect(() => resolveCredentials({})).toThrow('MISSING_PARAMETERS')
  })

  test('throws BAD_SCOPES_FORMAT when scopes is a string', () => {
    const params = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: 'openid'
    }

    expect(() => resolveCredentials(params)).toThrow('BAD_SCOPES_FORMAT')
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is null', () => {
    expect(() => resolveCredentials(null)).toThrow('BAD_CREDENTIALS_FORMAT')
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is undefined', () => {
    expect(() => resolveCredentials(undefined)).toThrow('BAD_CREDENTIALS_FORMAT')
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is an array', () => {
    expect(() => resolveCredentials(['test'])).toThrow('BAD_CREDENTIALS_FORMAT')
  })

  test('throws BAD_CREDENTIALS_FORMAT when params is a string', () => {
    expect(() => resolveCredentials('test')).toThrow('BAD_CREDENTIALS_FORMAT')
  })

  test('BAD_CREDENTIALS_FORMAT error includes sdk details', () => {
    let error
    try {
      resolveCredentials(null)
    } catch (e) {
      error = e
    }

    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('BAD_CREDENTIALS_FORMAT')
    expect(error.sdkDetails).toBeDefined()
    expect(error.sdkDetails.paramsType).toBe('object')
  })

  test('resolves env in order: imsEnv arg, then params.__ims_env, then default', () => {
    expect(resolveCredentials(validParams, 'stage').env).toBe('stage')
    expect(resolveCredentials({ ...validParams, __ims_env: 'stage' }).env).toBe('stage')
    expect(resolveCredentials({ ...validParams, __ims_env: 'stage' }, 'prod').env).toBe('prod')
    expect(resolveCredentials(validParams).env).toBe('prod')
  })
})

describe('generateAccessToken - with pre-resolved credentials', () => {
  const mockSuccessResponse = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 86399
  }

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateCache()
  })

  test('accepts a ResolvedAuth object directly, skipping re-resolution', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const resolved = resolveCredentials({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id',
      scopes: ['openid']
    }, 'stage')

    const result = await generateAccessToken(resolved)

    expect(result).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })

  test('ignores the imsEnv argument when params is a ResolvedAuth object', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders(),
      json: async () => mockSuccessResponse
    })

    const resolved = resolveCredentials({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      orgId: 'test-org-id'
    }, 'stage')

    await generateAccessToken(resolved, 'prod')

    expect(fetch).toHaveBeenCalledWith(
      'https://ims-na1-stg1.adobelogin.com/ims/token/v2',
      expect.any(Object)
    )
  })
})
