// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'
import type { PluginOptions } from './types'

const createCompiler = require('./create-compiler')
const extractError = require('./extract-error')

module.exports = function bundle(pkg: Package, options: PluginOptions) {
  return createCompiler(pkg, options).then(
    compiler =>
      new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          const error = extractError(pkg, err, stats)
          if (error) {
            reject(error)
          } else {
            resolve(compiler)
          }
        })
      }),
  )
}
