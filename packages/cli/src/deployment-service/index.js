// @flow

import type { Package } from '@lerna-cola/lib/build/types'

const pSeries = require('p-series')
const { config, TerminalUtils, PackageUtils } = require('@lerna-cola/lib')

module.exports = async function deploymentService() {
  // Determine which packages have a deployment plugin configured
  const packagesWithDeployConfig = config().packages.filter(
    pkg => !!pkg.plugins.deployPlugin,
  )
  if (packagesWithDeployConfig.length === 0) {
    throw new Error(
      'You do not have any packages with a deploy configuration.  Exiting...',
    )
  }

  // Ask which packages to deploy?
  const namesOfPackagesToDeploy = await TerminalUtils.multiSelect(
    'Which packages would you like to deploy?',
    {
      choices: packagesWithDeployConfig.map(x => ({
        value: x.name,
        text: `${x.name} (${x.version})`,
      })),
    },
  )

  // Ensure at least one package was selected for deploymnet
  if (namesOfPackagesToDeploy.length === 0) {
    throw new Error('No packages selected. Exiting...')
  }

  // Map the package names to packages
  const packagesToDeploy = namesOfPackagesToDeploy.map(
    x => config().packageMap[x],
  )

  TerminalUtils.info('Building packages...')

  // Get full package tree so we know which related packages need to be built.
  const packagesWithDependencies = PackageUtils.resolvePackages(
    namesOfPackagesToDeploy,
  )

  // First we need to make sure we have built all packages
  await pSeries(
    packagesWithDependencies.map(pkg => () => PackageUtils.buildPackage(pkg)),
  )

  TerminalUtils.info('Deploying packages...')

  // Deploy each of the packages
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
