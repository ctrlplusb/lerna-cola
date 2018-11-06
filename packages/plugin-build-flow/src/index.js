// @flow

import type {
  Package,
  CleanPlugin,
  BuildPlugin,
} from '@lerna-cola/lib/build/types'

const os = require('os')
const path = require('path')
const pLimit = require('p-limit')
const R = require('ramda')
const fs = require('fs-extra')
const globby = require('globby')
const flowRemoveTypes = require('flow-remove-types')
const {
  Errors: { PackageError },
} = require('@lerna-cola/lib')

const maxConcurrentTranspiles = os.cpus().length

// :: string -> void
const ensureParentDirectoryExists = filePath => {
  const dir = path.dirname(filePath)
  fs.ensureDirSync(dir)
}

type PluginOptions = {
  inputs?: Array<string>,
}

const flowBuildPlugin: CleanPlugin & BuildPlugin = {
  name: '@lerna-cola/plugin-build-flow',
  build: (pkg: Package, options: PluginOptions) => {
    const patterns = (
      options.inputs || ['**/*.js', '!__tests__', '!test.js']
    ).concat(['!node_modules/**/*', `!${pkg.paths.packageBuildOutput}/**/*`])

    // :: string -> Array<string>
    const getJsFilePaths = () =>
      globby(patterns, {
        cwd: pkg.paths.packageSrc,
      })

    return getJsFilePaths().then(filePaths => {
      const transpileFile = filePath =>
        new Promise(resolve => {
          const module = path.resolve(pkg.paths.packageSrc, filePath)
          const input = fs.readFileSync(module, 'utf8')
          const output = flowRemoveTypes(input)
          const outFile = path.resolve(pkg.paths.packageBuildOutput, filePath)
          ensureParentDirectoryExists(outFile)
          fs.writeFileSync(outFile, output.toString(), { encoding: 'utf8' })
          fs.writeFileSync(`${outFile}.flow`, input, { encoding: 'utf8' })
          resolve()
        })

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
    throw new PackageError(pkg, '"deploy" not supported by "flow" plugin')
  },
  develop: (pkg: Package) => {
    throw new PackageError(pkg, '"develop" not supported by "flow" plugin')
  },
}

module.exports = flowBuildPlugin
