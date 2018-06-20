// @flow

import type {
  Package,
  PackageWatcher,
  PackageConductor,
} from '@lerna-cola/lib/build/types'

const { Config, TerminalUtils } = require('@lerna-cola/lib')

const noPluginResult = {
  kill: () => Promise.resolve(),
}

module.exports = function createPackageConductor(
  pkg: Package,
  watcher: PackageWatcher,
): PackageConductor {
  let runningDevelopInstance

  return {
    // :: void -> Promise
    start: () => {
      const developPlugin = pkg.plugins.developPlugin
      if (!developPlugin) {
        TerminalUtils.verbosePkg(
          pkg,
          `No develop plugin, skipping develop execution/conductor`,
        )
        return Promise.resolve(noPluginResult)
      }

      TerminalUtils.verbosePkg(pkg, `Starting develop plugin`)

      return developPlugin.plugin
        .develop(pkg, developPlugin.options, { config: Config, watcher })
        .then(developInstance => {
          runningDevelopInstance = developInstance
          return developInstance
        })
    },

    // :: void -> Promise
    stop: () =>
      runningDevelopInstance
        ? runningDevelopInstance.kill()
        : Promise.resolve(),
  }
}
