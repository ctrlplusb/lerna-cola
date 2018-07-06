// @flow

import type { Package, CleanPlugin } from '../../types'

const rimraf = require('rimraf')
const pify = require('pify')
const PackageUtils = require('../../packages')
const { PackageError } = require('../../errors')

const rimrafAsync = pify(rimraf)

const cleanBuildPlugin: CleanPlugin = {
  name: 'plugin-clean-build',
  clean: (pkg: Package) => rimrafAsync(pkg.paths.packageBuildOutput),
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

module.exports = cleanBuildPlugin
