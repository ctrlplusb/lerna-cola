// @flow

import type { Package, BuildPlugin } from 'lerna-cola-dev-utils/build/types'
import type { PluginOptions } from './types'

const fs = require('fs-extra')
const { TerminalUtils } = require('lerna-cola-dev-utils')
const bundle = require('./bundle')

module.exports = function webpackNodeBuildPlugin(
  pkg: Package,
  options: PluginOptions = {},
): BuildPlugin {
  return {
    name: 'lerna-cola-plugin-webpack-node',
    build: () => bundle(pkg, options),
    clean: () =>
      new Promise(resolve => {
        if (fs.pathExistsSync(pkg.paths.packageBuildOutput)) {
          fs.removeSync(pkg.paths.packageBuildOutput)
        }
        resolve()
      }),
    deploy: () => {
      TerminalUtils.errorPkg(
        pkg,
        '"deploy" not supported by "webpack-node" plugin',
      )
      process.exit(1)
    },
    develop: () => {
      TerminalUtils.errorPkg(
        pkg,
        '"develop" not supported by "webpack-node" plugin. Why not try the "server" plugin instead.',
      )
      process.exit(1)
    },
  }
}
