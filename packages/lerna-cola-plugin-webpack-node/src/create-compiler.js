// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'
import type { PluginOptions } from './types'

const webpack = require('webpack')
const generateConfig = require('./generate-config')

// :: Options -> Promise<Compiler, Error>
module.exports = function createCompiler(pkg: Package, options: PluginOptions) {
  return new Promise((resolve, reject) => {
    const config = generateConfig(pkg, options)
    try {
      const compiler = webpack(config)
      resolve(compiler)
    } catch (err) {
      reject(err)
    }
  })
}
