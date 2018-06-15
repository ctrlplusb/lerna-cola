// @flow

import type { Package, BuildPlugin } from 'lerna-cola-dev-utils/build/types'

const path = require('path')
const babel = require('babel-core')
const pify = require('pify')
const pLimit = require('p-limit')
const R = require('ramda')
const fs = require('fs-extra')
const globby = require('globby')
const { TerminalUtils } = require('lerna-cola-dev-utils')
const generateConfig = require('./generate-config')

// Having concurrent babel transpilations seems to break the sourcemap output.
// Incorrect sources get mapped - I wonder if there is a shared global state
// that references the "current" file being transpiled for reference in a
// sourcemap.
const maxConcurrentTranspiles = 1

// :: (..args) => Promise<BabelTransformFileResult>
const transformFile = pify(babel.transformFile)

const ensureParentDirectoryExists = (filePath: string): void => {
  const dir = path.dirname(filePath)
  fs.ensureDirSync(dir)
}

type PluginOptions = {
  inputs?: Array<string>,
  nodeVersion?: string,
}

// :: Package, Options -> DevelopAPI
module.exports = function babelBuildPlugin(
  pkg: Package,
  options: PluginOptions = {},
): BuildPlugin {
  const patterns = (
    options.inputs || ['**/*.js', '**/*.jsx', '!__tests__', '!test.js']
  ).concat([
    '!node_modules/**/*',
    `!${path.basename(pkg.paths.packageBuildOutput)}/**/*`,
  ])

  // :: string -> Array<string>
  const getJsFilePaths = () =>
    globby(patterns, {
      cwd: pkg.paths.packageSrc,
    })

  return {
    name: 'lerna-cola-plugin-babel',
    build: () =>
      getJsFilePaths().then(filePaths => {
        // :: Object
        const babelConfig = generateConfig(pkg, options)

        // :: string -> Promise<void>
        const transpileFile = filePath => {
          const writeTranspiledFile = result => {
            const outFile = path.resolve(pkg.paths.packageBuildOutput, filePath)
            ensureParentDirectoryExists(outFile)
            fs.writeFileSync(outFile, result.code, { encoding: 'utf8' })
            fs.writeFileSync(`${outFile}.map`, JSON.stringify(result.map), {
              encoding: 'utf8',
            })
          }
          const module = path.resolve(pkg.paths.packageSrc, filePath)
          return transformFile(module, babelConfig).then(writeTranspiledFile)
        }

        const limit = pLimit(maxConcurrentTranspiles)
        const queueTranspile = filePath => limit(() => transpileFile(filePath))
        return Promise.all(R.map(queueTranspile, filePaths))
      }),
    clean: () =>
      new Promise(resolve => {
        if (fs.pathExistsSync(pkg.paths.packageBuildOutput)) {
          fs.removeSync(pkg.paths.packageBuildOutput)
        }
        resolve()
      }),
    deploy: () => {
      TerminalUtils.errorPkg(pkg, '"deploy" not supported by "babel" plugin')
      process.exit(1)
    },
    develop: () => {
      TerminalUtils.errorPkg(pkg, '"develop" not supported by "babel" plugin')
      process.exit(1)
    },
  }
}
