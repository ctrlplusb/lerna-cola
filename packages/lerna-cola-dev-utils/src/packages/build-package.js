// @flow

import type { Package } from '../types'

const TerminalUtils = require('../terminal')

type Options = {
  quiet?: boolean,
}

const defaultOptions = { quiet: false }

const executeBuild = pkg => {
  if (pkg.plugins.buildPlugin) {
    TerminalUtils.verbosePkg(
      pkg,
      `Building using build plugin: ${pkg.plugins.buildPlugin.name}`,
    )
  }
  return pkg.plugins.buildPlugin
    ? pkg.plugins.buildPlugin.build()
    : Promise.resolve()
}

module.exports = async function buildPackage(
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
