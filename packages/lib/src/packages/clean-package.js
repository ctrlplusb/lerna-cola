// @flow

import type { Package } from '../types'

const TerminalUtils = require('../terminal')
const Config = require('../config')

module.exports = async function cleanPackage(pkg: Package) {
  const buildPlugin = pkg.plugins.buildPlugin
  if (buildPlugin != null) {
    TerminalUtils.verbosePkg(
      pkg,
      `Running clean from build plugin: ${buildPlugin.plugin.name}`,
    )
    await buildPlugin.plugin.clean(pkg, buildPlugin.options, {
      config: Config,
    })
    TerminalUtils.verbosePkg(pkg, `Ran clean`)
  } else {
    TerminalUtils.verbosePkg(pkg, `No clean plugin to run`)
  }
}
