// @flow

/* eslint-disable global-require */
/* eslint-disable no-console */

import type {
  CleanPlugin,
  BuildPlugin,
  DevelopPlugin,
  DeployPlugin,
} from '../types'

const R = require('ramda')
const fs = require('fs-extra')
const path = require('path')

const pluginCache = {}

const resolvePackage = (packageName: string): mixed => {
  const packagePath = require.resolve(packageName)
  console.info(`Trying to resolve package ${packagePath}`)
  let resolvedPackage
  try {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    resolvedPackage = require(packagePath)
  } catch (err) {
    console.info(`Failed to resolve package ${packagePath}`)
    console.info(err)
    console.info(`Trying to resolve package ${packagePath} as a symlink`)
    // EEK! Could be a symlink?
    try {
      fs.lstatSync(packagePath)
      const symLinkPath = fs.readlinkSync(path)
      // eslint-disable-next-line global-require,import/no-dynamic-require
      resolvedPackage = require(symLinkPath)
    } catch (symErr) {
      // DO nothing
      console.info(`Failed to resolve package ${packagePath} as a symlink`)
      console.info(symErr)
    }
  }

  console.info(`Resolved package ${packagePath}`)

  return resolvedPackage
}

module.exports = (
  pluginName: string,
): CleanPlugin | BuildPlugin | DevelopPlugin | DeployPlugin => {
  if (R.isEmpty(pluginName) || R.isNil(pluginName)) {
    throw new Error('No plugin name was given to resolvePlugin')
  }

  // Core plugins
  switch (pluginName) {
    case 'plugin-clean-build':
      return require('./clean-build')
    case 'plugin-develop-build':
      return require('./develop-build')
    case 'plugin-develop-server':
      return require('./develop-server')
    case 'plugin-script':
      return require('./script')
    default:
    // Do nothing, fall through and resolve custom plugin...
  }

  if (pluginCache[pluginName]) {
    return pluginCache[pluginName]
  }

  const packagePlugin = resolvePackage(pluginName)

  if (!packagePlugin) {
    throw new Error(
      `Could not resolve "${pluginName}" plugin. Make sure you have the plugin installed.`,
    )
  }

  pluginCache[pluginName] = packagePlugin

  // $FlowFixMe
  return packagePlugin
}
