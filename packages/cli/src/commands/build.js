// @flow

const { Config, TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const pSeries = require('p-series')
const asyncCommandHandler = require('../utils/async-command-handler')

module.exports = {
  command: 'build',
  desc: 'Executes the configured build plugin for each package',
  handler: asyncCommandHandler(async () => {
    try {
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'production'
      }
      TerminalUtils.title('Running build command...')
      const queueBuild = pkg => () => PackageUtils.buildPackage(pkg)
      await pSeries(Config.packages.map(queueBuild))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Build failed', ex)
    }
  }),
}
