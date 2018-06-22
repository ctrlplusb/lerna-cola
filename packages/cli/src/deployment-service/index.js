// @flow

import type { Package } from '@lerna-cola/lib/build/types'

const pSeries = require('p-series')
const { config, TerminalUtils } = require('@lerna-cola/lib')

module.exports = async function deploymentService() {
  const packagesWithDeployConfig = config().packages.filter(
    pkg => !!pkg.plugins.deployPlugin,
  )
  if (packagesWithDeployConfig.length === 0) {
    TerminalUtils.info(
      'You do not have any packages with a deploy configuration.  Exiting...',
    )
    process.exit(1)
  }

  const namesOfPackagesToDeploy = await TerminalUtils.multiSelect(
    'Which packages would you like to deploy?',
    {
      choices: packagesWithDeployConfig.map(x => ({
        value: x.name,
        text: `${x.name} (${x.version})`,
      })),
    },
  )

  if (namesOfPackagesToDeploy.value.length === 0) {
    TerminalUtils.info('No packages selected. Exiting...')
    process.exit(0)
  }

  const packagesToDeploy = namesOfPackagesToDeploy.map(
    x => config().packageMap[x],
  )

  TerminalUtils.info('Deploying packages...')

  await pSeries(
    packagesToDeploy.map((pkg: Package) => async () => {
      const deployPlugin = pkg.plugins.deployPlugin
      if (!deployPlugin) {
        return
      }

      await deployPlugin.plugin.deploy(pkg, deployPlugin.options, {
        config: config(),
      })
    }),
  )

  TerminalUtils.success('Deployments complete')
}
