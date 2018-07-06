// @flow

const { TerminalUtils } = require('@lerna-cola/lib')
const deploymentService = require('../deployment-service')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'deploy',
  desc: 'Executes the deployment process',
  handler: asyncCommand(async () => {
    try {
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'production'
      }
      TerminalUtils.title('Running deploy...')
      await deploymentService()
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Deployment failed', ex)
    }
  }),
}
