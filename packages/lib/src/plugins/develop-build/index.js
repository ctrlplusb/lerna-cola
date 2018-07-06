// @flow

import type { Package, DevelopPlugin } from '../../types'

const PackageUtils = require('../../packages')
const { PackageError } = require('../../errors')

const developBuildPlugin: DevelopPlugin = {
  name: 'plugin-develop-build',
  clean: (pkg: Package) => {
    throw new PackageError(pkg, '"clean" not supported by "build" plugin')
  },
  build: (pkg: Package) => {
    throw new PackageError(pkg, '"build" not supported by "build" plugin')
  },
  develop: (pkg: Package) =>
    PackageUtils.buildPackage(pkg)
      // we ensure that nothing is returned as we won't be resolving a
      // develop instance with kill cmd etc
      .then(() => ({ kill: () => Promise.resolve(undefined) })),
  deploy: (pkg: Package) => {
    throw new PackageError(pkg, '"deploy" not supported by "build" plugin')
  },
}

module.exports = developBuildPlugin
