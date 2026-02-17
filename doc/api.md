## Constants

<dl>
<dt><a href="#Updater">Updater</a></dt>
<dd><p>Create an Updater for the Error wrapper</p>
</dd>
<dt><a href="#E">E</a></dt>
<dd><p>Provides a wrapper to easily create classes of a certain name, and values</p>
</dd>
<dt><a href="#IMS_BASE_URL_PROD">IMS_BASE_URL_PROD</a></dt>
<dd><p>IMS Base URLs</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#getAccessTokenByClientCredentials">getAccessTokenByClientCredentials(params)</a> ⇒ <code>Promise.&lt;object&gt;</code></dt>
<dd><p>Gets an access token using client credentials flow</p>
</dd>
<dt><a href="#invalidateCache">invalidateCache()</a> ⇒ <code>void</code></dt>
<dd><p>Invalidates the token cache</p>
</dd>
<dt><a href="#generateAccessToken">generateAccessToken(params, [imsEnv])</a> ⇒ <code>Promise.&lt;object&gt;</code></dt>
<dd><p>Generates an access token for authentication (with caching)</p>
</dd>
</dl>

<a name="Updater"></a>

## Updater
Create an Updater for the Error wrapper

**Kind**: global constant  
<a name="E"></a>

## E
Provides a wrapper to easily create classes of a certain name, and values

**Kind**: global constant  
<a name="IMS_BASE_URL_PROD"></a>

## IMS\_BASE\_URL\_PROD
IMS Base URLs

**Kind**: global constant  
<a name="getAccessTokenByClientCredentials"></a>

## getAccessTokenByClientCredentials(params) ⇒ <code>Promise.&lt;object&gt;</code>
Gets an access token using client credentials flow

**Kind**: global function  
**Returns**: <code>Promise.&lt;object&gt;</code> - Promise that resolves with the token response  
**Throws**:

- <code>Error</code> If there's an error getting the access token


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| params | <code>object</code> |  | Parameters for token generation |
| params.clientId | <code>string</code> |  | The client ID |
| params.clientSecret | <code>string</code> |  | The client secret |
| params.orgId | <code>string</code> |  | The organization ID |
| [params.scopes] | <code>Array.&lt;string&gt;</code> | <code>[]</code> | Array of scopes to request |
| [params.environment] | <code>string</code> | <code>&quot;&#x27;prod&#x27;&quot;</code> | The IMS environment ('prod' or 'stage') |

<a name="invalidateCache"></a>

## invalidateCache() ⇒ <code>void</code>
Invalidates the token cache

**Kind**: global function  
<a name="generateAccessToken"></a>

## generateAccessToken(params, [imsEnv]) ⇒ <code>Promise.&lt;object&gt;</code>
Generates an access token for authentication (with caching)

**Kind**: global function  
**Returns**: <code>Promise.&lt;object&gt;</code> - Promise that resolves with the token response  
**Throws**:

- <code>Error</code> If there's an error getting the access token


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| params | <code>object</code> |  | Parameters for token generation |
| params.clientId | <code>string</code> |  | The client ID |
| params.clientSecret | <code>string</code> |  | The client secret |
| params.orgId | <code>string</code> |  | The organization ID |
| [params.scopes] | <code>Array.&lt;string&gt;</code> | <code>[]</code> | Array of scopes to request |
| [imsEnv] | <code>string</code> |  | The IMS environment ('prod' or 'stage'); when omitted or falsy, uses stage if __OW_NAMESPACE starts with 'development-', else prod |

