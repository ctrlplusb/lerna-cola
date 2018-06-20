// @flow

import type { Package, DevelopPlugin } from '../../types'

const TerminalUtils = require('../../terminal')
const develop = require('./develop')

const developServerPlugin: DevelopPlugin = {
  name: 'plugin-develop-server',
  build: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"build" not supported by "server" plugin')
    process.exit(1)
  },
  clean: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"clean" not supported by "server" plugin')
    process.exit(1)
  },
  develop: (pkg: Package) => {
    if (!pkg.packageJson.main) {
      TerminalUtils.errorPkg(
        pkg,
        `You must provide a "main" within your package.json when using the "server" develop plugin. See the configuration for ${
          pkg.name
        }`,
      )
      process.exit(1)
    }
    return develop(pkg)
  },
  deploy: (pkg: Package) => {
    TerminalUtils.errorPkg(pkg, '"deploy" not supported by "server" plugin')
    process.exit(1)
  },
}

module.exports = developServerPlugin
