// @flow

const R = require('ramda')
const pSeries = require('p-series')
const { TerminalUtils, PackageUtils } = require('lerna-cola-dev-utils')

module.exports = async function deploymentService() {
  const allPackages = PackageUtils.getAllPackages()
  const allPackagesArray = R.values(allPackages)

  const packagesWithDeployConfig = allPackagesArray.filter(
    pkg => pkg.deployPlugin,
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

  if (namesOfPackagesToDeploy.length === 0) {
    TerminalUtils.info('No packages selected. Exiting...')
    process.exit(0)
  }

  const packagesToDeploy = namesOfPackagesToDeploy.map(x => allPackages[x])

  TerminalUtils.info('Deploying packages...')

  await pSeries(
    packagesToDeploy.map(pkg => async () => {
      await pkg.plugins.deployPlugin.deploy()
    }),
  )

  TerminalUtils.success('Deployments complete')
}
