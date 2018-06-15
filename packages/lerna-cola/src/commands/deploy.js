// @flow

const { TerminalUtils } = require('lerna-cola-dev-utils')
const deploymentService = require('../deployment-service')
const asyncCommandHandler = require('../utils/async-command-handler')

module.exports = {
  command: 'deploy',
  desc: 'Executes the deployment process',
  handler: asyncCommandHandler(async () => {
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
