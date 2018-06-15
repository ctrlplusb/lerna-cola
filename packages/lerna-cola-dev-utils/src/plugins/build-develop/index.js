// @flow

import type { Package, DevelopPlugin } from '../../types'

const PackageUtils = require('../../packages')
const TerminalUtils = require('../../terminal')

module.exports = function buildDevelopPlugin(pkg: Package): DevelopPlugin {
  return {
    name: 'lerna-cola-core-plugin/build-develop',
    clean: () => {
      TerminalUtils.errorPkg(pkg, '"clean" not supported by "build" plugin')
      process.exit(1)
    },
    build: () => {
      TerminalUtils.errorPkg(pkg, '"build" not supported by "build" plugin')
      process.exit(1)
    },
    develop: () =>
      PackageUtils.buildPackage(pkg)
        // we ensure that nothing is returned as we won't be resolving a
        // develop instance with kill cmd etc
        .then(() => ({ kill: () => Promise.resolve(undefined) })),
    deploy: () => {
      TerminalUtils.errorPkg(pkg, '"deploy" not supported by "build" plugin')
      process.exit(1)
    },
  }
}
