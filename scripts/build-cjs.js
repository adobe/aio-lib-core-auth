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

import * as esbuild from 'esbuild'
import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'cjs')

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

await esbuild.build({
  entryPoints: [join(root, 'src', 'index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: join(outDir, 'index.cjs'),
  external: ['@adobe/aio-lib-core-errors', '@isaacs/ttlcache']
})
