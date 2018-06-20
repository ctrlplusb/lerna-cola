// @flow

const { Config, TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const pSeries = require('p-series')
const asyncCommandHandler = require('../utils/async-command-handler')

module.exports = {
  command: 'clean',
  describe: 'Cleans the build output for packages',
  builder: yargs =>
    yargs.option('packages', {
      alias: 'p',
      describe: 'The packages to clean',
      type: 'array',
    }),
  handler: asyncCommandHandler(async () => {
    try {
      TerminalUtils.title('Running clean command...')
      const clean = pkg => () => PackageUtils.cleanPackage(pkg)
      await pSeries(Config.packages.map(clean))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Clean failed', ex)
    }
  }),
}
