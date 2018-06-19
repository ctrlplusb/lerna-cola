// @flow

import type { Package, PackageWatcher } from '@lerna-cola/lib/build/types'

const chokidar = require('chokidar')
const { TerminalUtils } = require('@lerna-cola/lib')

module.exports = function createPackageWatcher(
  onChange: Function,
  pkg: Package,
): PackageWatcher {
  TerminalUtils.verbosePkg(pkg, `Creating development source watcher.`)

  const createWatcher = () => {
    const watcher = chokidar.watch(
      // TODO: Add the paths to the build folders of each of it's dependencies.
      [pkg.paths.packageRoot],
      {
        ignored: pkg.paths.packageBuildOutput
          ? pkg.paths.packageBuildOutput
          : undefined,
        ignoreInitial: true,
        cwd: pkg.paths.packageRoot,
        ignorePermissionErrors: true,
      },
    )
    watcher
      .on('add', onChange)
      .on('change', onChange)
      .on('unlink', onChange)
      .on('addDir', onChange)
      .on('unlinkDir', onChange)
    return watcher
  }

  let watcher = null

  return {
    start: () => {
      if (!watcher) {
        watcher = createWatcher()
      }
    },
    stop: () => {
      if (watcher) {
        watcher.close()
        watcher = null
      }
    },
  }
}
