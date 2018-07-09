// @flow

const { TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const pSeries = require('p-series')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'clean',
  describe: 'Cleans the build output for packages',
  builder: yargs =>
    yargs.option('packages', {
      alias: 'p',
      describe: 'The packages to clean',
      type: 'array',
    }),
  handler: asyncCommand(async argv => {
    try {
      TerminalUtils.title('Running clean command...')
      const packages = PackageUtils.filterPackages(argv.packages)
      const clean = pkg => () => PackageUtils.cleanPackage(pkg)
      await pSeries(packages.map(clean))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Clean failed', ex)
    }
  }),
}
