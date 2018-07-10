// @flow

const { TerminalUtils } = require('@lerna-cola/lib')
const developmentService = require('../development-service')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'develop',
  desc: 'Starts the coordinated development service',
  // $FlowFixMe
  builder: yargs =>
    yargs
      .option('packages', {
        alias: 'p',
        describe: 'The packages to develop',
        type: 'array',
      })
      .option('select', {
        alias: 's',
        describe: 'Enable selection of packages to develop',
        type: 'boolean',
      })
      .option('exact', {
        alias: 'e',
        describe:
          'Useful when selecting/filtering packages. When enabled only the selected/filtered packages will be tracked.',
        type: 'boolean',
      }),
  handler: asyncCommand(async argv => {
    try {
      TerminalUtils.title('Starting development service...')
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development'
      }
      await developmentService({
        packagesFilter: argv.packages,
        selectPackages: argv.select,
        exact: argv.exact,
      })
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Unhandled exception in development service', ex)
    }
  }),
}
