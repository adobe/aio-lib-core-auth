<!--
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-core-auth.svg)](https://npmjs.org/package/@adobe/aio-lib-core-auth)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-core-auth.svg)](https://npmjs.org/package/@adobe/aio-lib-core-auth)
![Node.js CI](https://github.com/adobe/aio-lib-core-auth/workflows/Node.js%20CI/badge.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-lib-core-auth/main.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-lib-core-auth/)
[![Size(minified)](https://badgen.net/bundlephobia/min/@adobe/aio-lib-core-auth)](https://npmjs.org/package/@adobe/aio-lib-core-auth)

# Adobe I/O Core Authentication Library

This library provides core authentication functionality for Adobe I/O SDK libraries and applications.

## Installation

```bash
npm install @adobe/aio-lib-core-auth
```

## Usage

### Generating an Access Token in a Runtime action

```javascript
const { generateAccessToken } = require('@adobe/aio-lib-core-auth')

async function main(params) {
  try {
    // if the include-ims-credentials annotation is set, the library infers credentials from the Runtime params
    const token = await generateAccessToken(params)

    // otherwise credentials can be passed manually
    const token = await generateAccessToken({
      clientId: '<clientId>',
      clientSecret: '<clientSecret>',
      orgId: '<orgId>@AdobeOrg',
      scopes: ['<scope1>', '<scope2>', '..']
    })

    console.log('Authentication successful:', token.access_token)
  } catch (error) {
    console.error('Authentication failed:', error)
  }
}
```

Note: The token is cached for 5 minutes in the Runtime's container memory. A single Runtime action can run in multiple containers, meaning the cache is not shared across actions.

### Invalidating the Token Cache in a Runtime action

The library caches tokens for 5 minutes to improve performance. If you need to force a refresh:

```javascript
const { invalidateCache } = require('@adobe/aio-lib-core-auth')

async function main(params) {
  try {
    invalidateCache()
  } catch (error) {
    console.error('Authentication failed:', error)
  }
}
```

## API

`goto` [API](./doc/api.md)

## Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
