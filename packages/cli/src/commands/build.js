// @flow

const { config, TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const pSeries = require('p-series')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'build',
  desc: 'Executes the configured build plugin for each package',
  handler: asyncCommand(async () => {
    try {
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'production'
      }
      TerminalUtils.title('Running build command...')
      const queueBuild = pkg => () => PackageUtils.buildPackage(pkg)
      await pSeries(config().packages.map(queueBuild))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Build failed', ex)
    }
  }),
}
