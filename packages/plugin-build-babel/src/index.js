// @flow

import type { Package, BuildPlugin } from '@lerna-cola/lib/build/types'

const path = require('path')
const babel = require('babel-core')
const pify = require('pify')
const pLimit = require('p-limit')
const R = require('ramda')
const fs = require('fs-extra')
const globby = require('globby')
const { FsUtils, TerminalUtils } = require('@lerna-cola/lib')

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

type Options = {
  inputs?: Array<string>,
  config?: string | Object,
}

type SanitisedOptions = {
  inputs: Array<string>,
  config: Object,
}

const babelBuildPlugin: BuildPlugin = {
  name: '@lerna-cola/plugin-build-babel',
  build: (pkg: Package, options: Options) => {
    const sanitiseOptions = (opts: Options): SanitisedOptions => {
      const { config, inputs } = opts

      if (!config || typeof config !== 'string' || typeof config === 'object') {
        TerminalUtils.errorPkg(
          pkg,
          'A babel config package name or object must be provided as options',
        )
        process.exit(1)
        throw new Error('💩')
      }

      const resolveConfig = (packageName): Object => {
        const module = FsUtils.resolvePackage(packageName)
        if (typeof module !== 'function' || typeof module !== 'object') {
          TerminalUtils.errorPkg(
            pkg,
            `The babel config "${packageName}" is an invalid package. Should export an object or a funciton.`,
          )
          process.exit(1)
        }
        // $FlowFixMe
        return typeof module === 'function' ? module(pkg, options) : module
      }

      return {
        config: typeof config === 'string' ? resolveConfig(config) : config,
        inputs: inputs || ['**/*.js', '**/*.jsx', '!__tests__', '!test.js'],
      }
    }

    const sanitisedOptions = sanitiseOptions(options)

    const patterns = sanitisedOptions.inputs.concat([
      '!node_modules/**/*',
      `!${path.basename(pkg.paths.packageBuildOutput)}/**/*`,
    ])

    // :: string -> Array<string>
    const getJsFilePaths = () =>
      globby(patterns, {
        cwd: pkg.paths.packageSrc,
      })

    return getJsFilePaths().then(filePaths => {
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
        return transformFile(module, sanitisedOptions.config).then(
          writeTranspiledFile,
        )
      }

      const limit = pLimit(maxConcurrentTranspiles)
      const queueTranspile = filePath => limit(() => transpileFile(filePath))
      return Promise.all(R.map(queueTranspile, filePaths))
    })
  },
  clean: (pkg: Package) =>
    new Promise(resolve => {
      if (fs.pathExistsSync(pkg.paths.packageBuildOutput)) {
        fs.removeSync(pkg.paths.packageBuildOutput)
      }
      resolve()
    }),
  deploy: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"deploy" not supported by "babel" plugin')
    process.exit(1)
  },
  develop: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"develop" not supported by "babel" plugin')
    process.exit(1)
  },
}

module.exports = babelBuildPlugin
