// @flow

import type {
  Package,
  PackageWatcher,
  PackageConductor,
} from '@lerna-cola/lib/build/types'

const { config, TerminalUtils } = require('@lerna-cola/lib')

const noPluginResult = {
  kill: () => Promise.resolve(),
}

module.exports = function createPackageConductor(
  pkg: Package,
  watcher: PackageWatcher,
): PackageConductor {
  let runningDevelopInstance

  return {
    run: (runType, changedDependency) => {
      const developPlugin = pkg.plugins.developPlugin
      if (!developPlugin) {
        TerminalUtils.verbosePkg(
          pkg,
          `No develop plugin, skipping develop execution/conductor`,
        )
        return Promise.resolve(noPluginResult)
      }

      TerminalUtils.verbosePkg(
        pkg,
        `Running develop plugin for change type: ${runType}`,
      )

      return developPlugin.plugin
        .develop(pkg, developPlugin.options, {
          config: config(),
          watcher,
          runType,
          changedDependency,
        })
        .then(developInstance => {
          runningDevelopInstance = developInstance
          return developInstance
        })
    },
    stop: () =>
      runningDevelopInstance
        ? runningDevelopInstance.kill()
        : Promise.resolve(),
  }
}
