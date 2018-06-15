// @flow

import type { Package } from '../types'

const TerminalUtils = require('../terminal')

module.exports = async function cleanPackage(pkg: Package) {
  const buildPlugin = pkg.plugins.buildPlugin
  if (buildPlugin != null) {
    TerminalUtils.verbosePkg(
      pkg,
      `Running clean from build plugin: ${buildPlugin.name}`,
    )
    await buildPlugin.clean()
    TerminalUtils.verbosePkg(pkg, `Ran clean`)
  } else {
    TerminalUtils.verbosePkg(pkg, `No clean plugin to run`)
  }
}
