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

const { codes } = require('./errors.js')

/**
 * IMS Base URLs
 */
const IMS_BASE_URL_PROD = 'https://ims-na1.adobelogin.com'
const IMS_BASE_URL_STAGE = 'https://ims-na1-stg1.adobelogin.com'

/**
 * Gets the IMS base URL based on the environment
 *
 * @private
 * @param {string} env - The environment ('prod' or 'stage')
 * @returns {string} The IMS base URL
 */
function getImsUrl (env) {
  return env === 'stage' ? IMS_BASE_URL_STAGE : IMS_BASE_URL_PROD
}

/**
 * Validates required parameters for client credentials flow
 *
 * @private
 * @param {object} params - Parameters to validate
 * @returns {{ error, credentials }} Object with error (if any) and validated credentials object
 */
function getAndValidateCredentials (params) {
  if (!(typeof params === 'object' && params !== null && !Array.isArray(params))) {
    return {
      error: new codes.BAD_CREDENTIALS_FORMAT({
        sdkDetails: { paramsType: typeof params }
      })
    }
  }

  if (params.scopes && !Array.isArray(params.scopes)) {
    return {
      error: new codes.BAD_SCOPES_FORMAT({
        sdkDetails: { scopesType: typeof params.scopes }
      })
    }
  }

  const credentials = {}
  credentials.clientId = params.clientId || params.client_id
  credentials.clientSecret = params.clientSecret || params.client_secret
  credentials.orgId = params.orgId || params.org_id
  credentials.scopes = params.scopes || []

  const { clientId, clientSecret, orgId, scopes } = credentials
  const missingParams = []
  if (!clientId) {
    missingParams.push('clientId')
  }
  if (!clientSecret) {
    missingParams.push('clientSecret')
  }
  if (!orgId) {
    missingParams.push('orgId')
  }

  if (missingParams.length > 0) {
    return { error: new codes.MISSING_PARAMETERS({
      messageValues: missingParams.join(', '),
      sdkDetails: { clientId, orgId, scopes }
    }) }
  }

  return { credentials, error: null }
}

/**
 * Gets an access token using client credentials flow
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
async function getAccessTokenByClientCredentials ({ clientId, clientSecret, orgId, scopes = [], env } ) {
  const imsBaseUrl = getImsUrl(env)

  // Prepare form data using URLSearchParams (native Node.js)
  const formData = new URLSearchParams()
  formData.append('grant_type', 'client_credentials')
  formData.append('client_id', clientId)
  formData.append('client_secret', clientSecret)
  formData.append('org_id', orgId)
  if (scopes.length > 0) {
    formData.append('scope', scopes.join(','))
  }

  try {
    const response = await fetch(`${imsBaseUrl}/ims/token/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    /* v8 ignore next */})

    const data = await response.json()

    // Check if the response indicates an error
    if (!response.ok) {
      const errorMessage = data.error_description || data.error || `HTTP ${response.status}`
      const xDebugId = response.headers.get('x-debug-id')

      throw new codes.IMS_TOKEN_ERROR({
        messageValues: errorMessage,
        sdkDetails: {
          statusCode: response.status,
          statusText: response.statusText,
          error: data.error,
          errorDescription: data.error_description,
          xDebugId,
          clientId,
          orgId,
          scopes,
          imsEnv: env
        }
      /* v8 ignore next */})
    }

    return data
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.name === 'AuthSDKError') {
      throw error
    }

    // Handle unexpected errors
    throw new codes.GENERIC_ERROR({
      messageValues: error.message,
      sdkDetails: {
        originalError: error.message,
        clientId,
        orgId,
        scopes,
        imsEnv: env
      }
    })
  }
}

module.exports = {
  getAndValidateCredentials,
  getAccessTokenByClientCredentials
}
