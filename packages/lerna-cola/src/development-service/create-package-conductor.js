// @flow

import type { Package, PackageWatcher } from 'lerna-cola-dev-utils/build/types'

const { TerminalUtils } = require('lerna-cola-dev-utils')

const noPluginResult = {
  kill: () => Promise.resolve(),
}

module.exports = function createPackageConductor(
  pkg: Package,
  watcher: PackageWatcher,
) {
  let runningDevelopInstance

  return {
    // :: void -> Promise
    start: () => {
      if (!pkg.plugins.developPlugin) {
        TerminalUtils.verbosePkg(
          pkg,
          `No develop plugin, skipping develop execution/conductor`,
        )
        return Promise.resolve(noPluginResult)
      }

      TerminalUtils.verbosePkg(pkg, `Starting develop plugin`)

      return pkg.plugins.developPlugin
        .develop(watcher)
        .then(developInstance => {
          runningDevelopInstance = developInstance
        })
    },

    // :: void -> Promise
    stop: () =>
      runningDevelopInstance
        ? runningDevelopInstance.kill()
        : Promise.resolve(),
  }
}
