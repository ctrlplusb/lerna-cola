/* eslint-disable global-require */
const dedent = require('dedent')
const chalk = require('chalk')
const R = require('ramda')
const FSUtils = require('../fs')

const pluginCache = {}

module.exports = pluginName => {
  if (R.isEmpty(pluginName) || R.isNil(pluginName)) {
    throw new Error('No plugin name was given to resolvePlugin')
  }

  const fullPluginName = pluginName.startsWith('lerna-cola-plugin-')
    ? pluginName
    : `lerna-cola-plugin-${pluginName}`

  switch (fullPluginName) {
    case 'lerna-cola-plugin-build-develop':
      return require('./build-develop')
    case 'lerna-cola-plugin-server':
      return require('./server')
    case 'lerna-cola-plugin-script':
      return require('./script')
    default:
    // Do nothing, fall through and resolve custom plugin...
  }

  if (pluginCache[fullPluginName]) {
    return pluginCache[fullPluginName]
  }

  const plugin = FSUtils.resolvePackage(fullPluginName)

  if (!plugin) {
    throw new Error(
      dedent(`
        Could not resolve "${pluginName}" plugin. Make sure you have the plugin installed:

            ${chalk.blue('npm install -D')} ${chalk.green(fullPluginName)}
      `),
    )
  }

  pluginCache[fullPluginName] = plugin
  return plugin
}
