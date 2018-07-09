// @flow

const { TerminalUtils } = require('@lerna-cola/lib')
const developmentService = require('../development-service')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'develop',
  desc: 'Starts the coordinated development service',
  builder: yargs =>
    yargs
      .option('packages', {
        alias: 'p',
        describe:
          'The packages to develop (their dependencies will also be tracked)',
        type: 'array',
      })
      .option('select', {
        alias: 's',
        describe: 'Enable selection of packages to develop',
        type: 'boolean',
      }),
  handler: asyncCommand(async argv => {
    try {
      TerminalUtils.title('Starting development service...')
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development'
      }
      await developmentService({
        filteredPackages: argv.packages,
        selectPackages: argv.select,
      })
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Unhandled exception in development service', ex)
    }
  }),
}
