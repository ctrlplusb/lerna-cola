// @flow

import type { Package } from '../types'

const TerminalUtils = require('../terminal')
const config = require('../config')

type Options = {
  quiet?: boolean,
}

const defaultOptions = { quiet: false }

const executeBuild = pkg => {
  if (pkg.plugins.buildPlugin) {
    TerminalUtils.verbosePkg(
      pkg,
      `Building using build plugin: ${pkg.plugins.buildPlugin.plugin.name}`,
    )
  }
  return pkg.plugins.buildPlugin
    ? pkg.plugins.buildPlugin.plugin.build(
        pkg,
        pkg.plugins.buildPlugin.options,
        { config: config() },
      )
    : Promise.resolve()
}

/**
 * Builds the given package.
 *
 * @param {*} pkg
 *  The package to be built.
 * @param {*} options.quiet
 *  If set then the logs will only be displayed when the VERBOSE flag is enabled.
 */
async function buildPackage(
  pkg: Package,
  options: ?Options = {},
): Promise<void> {
  const { quiet } = Object.assign({}, defaultOptions, options)
  TerminalUtils[quiet ? 'verbosePkg' : 'infoPkg'](pkg, `Building...`)

  try {
    await executeBuild(pkg)
    TerminalUtils.verbosePkg(pkg, `Built`)
  } catch (err) {
    TerminalUtils.errorPkg(pkg, `Build failed`)
    throw err
  }
}

module.exports = buildPackage
