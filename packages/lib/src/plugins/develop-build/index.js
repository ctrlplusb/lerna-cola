// @flow

import type { Package, DevelopPlugin } from '../../types'

const PackageUtils = require('../../packages')
const TerminalUtils = require('../../terminal')

const developBuildPlugin: DevelopPlugin = {
  name: 'plugin-develop-build',
  clean: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"clean" not supported by "build" plugin')
    process.exit(1)
  },
  build: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"build" not supported by "build" plugin')
    process.exit(1)
  },
  develop: (pkg: Package) =>
    PackageUtils.buildPackage(pkg)
      // we ensure that nothing is returned as we won't be resolving a
      // develop instance with kill cmd etc
      .then(() => ({ kill: () => Promise.resolve(undefined) })),
  deploy: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"deploy" not supported by "build" plugin')
    process.exit(1)
  },
}

module.exports = developBuildPlugin
