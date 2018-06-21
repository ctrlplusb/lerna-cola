// @flow

import type { Package } from '../types'

const TerminalUtils = require('../terminal')
const config = require('../config')

module.exports = async function cleanPackage(pkg: Package) {
  const cleanPlugin = pkg.plugins.cleanPlugin
  if (cleanPlugin != null) {
    TerminalUtils.verbosePkg(
      pkg,
      `Running clean plugin: ${cleanPlugin.plugin.name}`,
    )
    await cleanPlugin.plugin.clean(pkg, cleanPlugin.options, {
      config: config(),
    })
    TerminalUtils.verbosePkg(pkg, `Ran clean`)
  } else {
    TerminalUtils.verbosePkg(pkg, `No clean plugin to run`)
  }
}
