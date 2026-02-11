var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  generateAccessToken: () => generateAccessToken,
  invalidateCache: () => invalidateCache
});
module.exports = __toCommonJS(index_exports);

// src/errors.js
var import_aio_lib_core_errors = require("@adobe/aio-lib-core-errors");
var { ErrorWrapper, createUpdater } = import_aio_lib_core_errors.AioCoreSDKErrorWrapper;
var codes = {};
var messages = /* @__PURE__ */ new Map();
var Updater = createUpdater(
  // object that stores the error classes (to be exported)
  codes,
  // Map that stores the error strings (to be exported)
  messages
);
var E = ErrorWrapper(
  // The class name for your SDK Error. Your Error objects will be these objects
  "AuthSDKError",
  // The name of your SDK. This will be a property in your Error objects
  "AuthSDK",
  // the object returned from the CreateUpdater call above
  Updater
);
E("IMS_TOKEN_ERROR", "Error calling IMS to get access token: %s");
E("MISSING_PARAMETERS", "Missing required parameters: %s");
E("BAD_CREDENTIALS_FORMAT", "Credentials must be either an object or a stringified object");
E("BAD_SCOPES_FORMAT", "Scopes must be an array");
E("GENERIC_ERROR", "An unexpected error occurred: %s");

// src/ims.js
var IMS_BASE_URL_PROD = "https://ims-na1.adobelogin.com";
var IMS_BASE_URL_STAGE = "https://ims-na1-stg1.adobelogin.com";
function getImsUrl(env) {
  return env === "stage" ? IMS_BASE_URL_STAGE : IMS_BASE_URL_PROD;
}
function getAndValidateCredentials(params) {
  if (!(typeof params === "object" && params !== null && !Array.isArray(params))) {
    throw new codes.BAD_CREDENTIALS_FORMAT({
      sdkDetails: { paramsType: typeof params }
    });
  }
  if (params.scopes && !Array.isArray(params.scopes)) {
    throw new codes.BAD_SCOPES_FORMAT({
      sdkDetails: { scopesType: typeof params.scopes }
    });
  }
  const credentials = {};
  credentials.clientId = params.clientId || params.client_id;
  credentials.clientSecret = params.clientSecret || params.client_secret;
  credentials.orgId = params.orgId || params.org_id;
  credentials.scopes = params.scopes || [];
  const { clientId, clientSecret, orgId, scopes } = credentials;
  const missingParams = [];
  if (!clientId) {
    missingParams.push("clientId");
  }
  if (!clientSecret) {
    missingParams.push("clientSecret");
  }
  if (!orgId) {
    missingParams.push("orgId");
  }
  if (missingParams.length > 0) {
    throw new codes.MISSING_PARAMETERS({
      messageValues: missingParams.join(", "),
      sdkDetails: { clientId, orgId, scopes }
    });
  }
  return credentials;
}
async function getAccessTokenByClientCredentials({ clientId, clientSecret, orgId, scopes = [], env }) {
  const imsBaseUrl = getImsUrl(env);
  const formData = new URLSearchParams();
  formData.append("grant_type", "client_credentials");
  formData.append("client_id", clientId);
  formData.append("client_secret", clientSecret);
  formData.append("org_id", orgId);
  if (scopes.length > 0) {
    formData.append("scope", scopes.join(","));
  }
  try {
    const response = await fetch(`${imsBaseUrl}/ims/token/v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMessage = data.error_description || data.error || `HTTP ${response.status}`;
      const xDebugId = response.headers.get("x-debug-id");
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
      });
    }
    return data;
  } catch (error) {
    if (error.name === "AuthSDKError") {
      throw error;
    }
    throw new codes.GENERIC_ERROR({
      messageValues: error.message,
      sdkDetails: {
        originalError: error.message,
        clientId,
        orgId,
        scopes,
        imsEnv: env
      }
    });
  }
}

// src/index.js
var import_ttlcache = require("@isaacs/ttlcache");
var import_crypto = __toESM(require("crypto"), 1);
var tokenCache = new import_ttlcache.TTLCache({ ttl: 5 * 60 * 1e3 });
function getCacheKey({ clientId, orgId, env, scopes, clientSecret }) {
  const scopeKey = scopes.length > 0 ? scopes.sort().join(",") : "none";
  return import_crypto.default.createHash("sha1").update(`${clientId}:${orgId}:${scopeKey}:${clientSecret}:${env}`).digest("hex");
}
function invalidateCache() {
  tokenCache.clear();
}
async function generateAccessToken(params, imsEnv) {
  imsEnv = imsEnv || (ioRuntimeStageNamespace() ? "stage" : "prod");
  const credentials = getAndValidateCredentials(params);
  const credAndEnv = { ...credentials, env: imsEnv };
  const cacheKey = getCacheKey(credAndEnv);
  const cachedToken = tokenCache.get(cacheKey);
  if (cachedToken) {
    return cachedToken;
  }
  const token = await getAccessTokenByClientCredentials(credAndEnv);
  tokenCache.set(cacheKey, token);
  return token;
}
function ioRuntimeStageNamespace() {
  return process.env.__OW_NAMESPACE && process.env.__OW_NAMESPACE.startsWith("development-");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateAccessToken,
  invalidateCache
});
