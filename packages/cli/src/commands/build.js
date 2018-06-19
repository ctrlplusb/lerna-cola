// @flow

const { TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const R = require('ramda')
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
      TerminalUtils.title('Running build...')
      const packages = await PackageUtils.getAllPackages()
      const queueBuild = pkg => () => PackageUtils.buildPackage(pkg)
      await pSeries(R.values(packages).map(queueBuild))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Build failed', ex)
    }
  }),
}
