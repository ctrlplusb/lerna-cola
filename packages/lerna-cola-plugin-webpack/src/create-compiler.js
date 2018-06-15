// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'

const webpack = require('webpack')
const generateConfig = require('./generate-config')

// :: Options -> Promise<Compiler, Error>
module.exports = function createCompiler(pkg: Package) {
  return new Promise((resolve, reject) => {
    const config = generateConfig(pkg)
    try {
      const compiler = webpack(config)
      resolve(compiler)
    } catch (err) {
      reject(err)
    }
  })
}
