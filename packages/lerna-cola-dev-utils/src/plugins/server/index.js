// @flow

import type { Package, DevelopPlugin } from '../../types'

const TerminalUtils = require('../../terminal')
const develop = require('./develop')

module.exports = function serverPlugin(pkg: Package): DevelopPlugin {
  if (!pkg.packageJson.main) {
    TerminalUtils.errorPkg(
      pkg,
      `You must provide a "main" within your package.json when using the "server" develop plugin. See the configuration for ${
        pkg.name
      }`,
    )
    process.exit(1)
  }

  return {
    name: 'lerna-cola-core-plugin/sever',
    build: () => {
      TerminalUtils.errorPkg(pkg, '"build" not supported by "server" plugin')
      process.exit(1)
    },
    clean: () => {
      TerminalUtils.errorPkg(pkg, '"clean" not supported by "server" plugin')
      process.exit(1)
    },
    develop: () => develop(pkg),
    deploy: () => {
      TerminalUtils.errorPkg(pkg, '"deploy" not supported by "server" plugin')
      process.exit(1)
    },
  }
}
