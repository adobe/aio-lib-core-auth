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

import { describe, test, expect } from 'vitest'
import { codes, messages } from '../src/AuthErrors.js'

describe('AuthErrors', () => {
  test('codes object is defined', () => {
    expect(codes).toBeDefined()
    expect(typeof codes).toBe('object')
  })

  test('messages Map is defined', () => {
    expect(messages).toBeDefined()
    expect(messages instanceof Map).toBe(true)
  })

  test('IMS_TOKEN_ERROR error code exists', () => {
    expect(codes.IMS_TOKEN_ERROR).toBeDefined()
    expect(typeof codes.IMS_TOKEN_ERROR).toBe('function')
  })

  test('MISSING_PARAMETERS error code exists', () => {
    expect(codes.MISSING_PARAMETERS).toBeDefined()
    expect(typeof codes.MISSING_PARAMETERS).toBe('function')
  })

  test('GENERIC_ERROR error code exists', () => {
    expect(codes.GENERIC_ERROR).toBeDefined()
    expect(typeof codes.GENERIC_ERROR).toBe('function')
  })

  test('can instantiate MISSING_PARAMETERS error', () => {
    const error = new codes.MISSING_PARAMETERS({
      messageValues: 'clientId, clientSecret'
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('MISSING_PARAMETERS')
    expect(error.sdk).toBe('AuthSDK')
    expect(error.message).toContain('clientId, clientSecret')
  })

  test('can instantiate IMS_TOKEN_ERROR error', () => {
    const error = new codes.IMS_TOKEN_ERROR({
      messageValues: 'Invalid credentials',
      sdkDetails: { statusCode: 401 }
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('IMS_TOKEN_ERROR')
    expect(error.sdk).toBe('AuthSDK')
    expect(error.message).toContain('Invalid credentials')
    expect(error.sdkDetails.statusCode).toBe(401)
  })

  test('can instantiate GENERIC_ERROR error', () => {
    const error = new codes.GENERIC_ERROR({
      messageValues: 'Connection timeout'
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AuthSDKError')
    expect(error.code).toBe('GENERIC_ERROR')
    expect(error.sdk).toBe('AuthSDK')
    expect(error.message).toContain('Connection timeout')
  })

  test('error messages are stored in messages Map', () => {
    expect(messages.size).toBeGreaterThan(0)
    expect(messages.has('MISSING_PARAMETERS')).toBe(true)
    expect(messages.has('IMS_TOKEN_ERROR')).toBe(true)
    expect(messages.has('GENERIC_ERROR')).toBe(true)
  })
})
