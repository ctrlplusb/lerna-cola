// @flow

import type { Package, DevelopPlugin } from '../../types'

const develop = require('./develop')
const { PackageError } = require('../../errors')

const developServerPlugin: DevelopPlugin = {
  name: 'plugin-develop-server',
  build: (pkg: Package) => {
    throw new PackageError(pkg, '"build" not supported by "server" plugin')
  },
  clean: (pkg: Package) => {
    throw new PackageError(pkg, '"clean" not supported by "server" plugin')
  },
  develop: (pkg: Package) => {
    if (!pkg.packageJson.main) {
      throw new PackageError(
        pkg,
        `You must provide a "main" within your package.json when using the "server" develop plugin. See the configuration for ${
          pkg.name
        }`,
      )
    }
    return develop(pkg)
  },
  deploy: (pkg: Package) => {
    throw new PackageError(pkg, '"deploy" not supported by "server" plugin')
  },
}

module.exports = developServerPlugin
