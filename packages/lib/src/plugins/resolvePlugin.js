/* eslint-disable global-require */
const R = require('ramda')
const FSUtils = require('../fs')

const pluginCache = {}

module.exports = pluginName => {
  if (R.isEmpty(pluginName) || R.isNil(pluginName)) {
    throw new Error('No plugin name was given to resolvePlugin')
  }

  // Core plugins
  switch (pluginName) {
    case 'core-plugin-develop-build':
      return require('./develop-build')
    case 'core-plugin-develop-server':
      return require('./develop-server')
    case 'core-plugin-script':
      return require('./script')
    default:
    // Do nothing, fall through and resolve custom plugin...
  }

  if (pluginCache[pluginName]) {
    return pluginCache[pluginName]
  }

  const packagePlugin = FSUtils.resolvePackage(pluginName)

  if (!packagePlugin) {
    throw new Error(
      `Could not resolve "${pluginName}" plugin. Make sure you have the plugin installed.`,
    )
  }

  pluginCache[pluginName] = packagePlugin

  return packagePlugin
}
