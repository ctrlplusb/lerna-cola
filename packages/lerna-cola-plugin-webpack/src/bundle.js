// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'

const extractError = require('./extract-error')
const createCompiler = require('./create-compiler')

// :: Options -> Promise<Compiler, Error>
module.exports = function bundle(pkg: Package) {
  return createCompiler(pkg).then(
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
