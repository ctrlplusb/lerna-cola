// @flow

import type { Package, DeployPlugin } from '@lerna-cola/lib/build/types'

const R = require('ramda')
const pWhilst = require('p-whilst')
const dedent = require('dedent')
const chalk = require('chalk')
const deepMerge = require('deepmerge')
const tempWrite = require('temp-write')
const fs = require('fs-extra')
const {
  TerminalUtils,
  ChildProcessUtils,
  Errors: { PackageError },
} = require('@lerna-cola/lib')

type NowSettings = {
  alias?: string,
  forwardNpm?: boolean,
  public?: boolean,
}

type Options = {
  disableRemovePrevious?: boolean,
  deployTimeoutMins?: number,
  passThroughEnvVars?: Array<string>,
  settings?: NowSettings,
}

const nowDeployPlugin: DeployPlugin = {
  name: '@lerna-cola/plugin-now',
  build: (pkg: Package) => {
    throw new PackageError(pkg, '"build" not supported by "now" plugin')
  },
  clean: (pkg: Package) => {
    throw new PackageError(pkg, '"clean" not supported by "now" plugin')
  },
  develop: (pkg: Package) => {
    throw new PackageError(pkg, '"develop" not supported by "now" plugin')
  },
  deploy: async (pkg: Package, options: Options) => {
    try {
      try {
        ChildProcessUtils.execSync('now', ['-v'])
      } catch (err) {
        TerminalUtils.errorPkg(
          pkg,
          'You need to have the "now" CLI installed on your machine and available on your PATH in order to deploy to now.',
        )
        throw err
      }

      const deploymentName = pkg.name

      const envVars = options.passThroughEnvVars
        ? options.passThroughEnvVars.reduce(
            (acc, cur) =>
              process.env[cur]
                ? [...acc, '-e', `${cur}=${process.env[cur]}`]
                : acc,
            [],
          )
        : []

      const nowSettingsPath = tempWrite.sync()
      const nowSettings = deepMerge(
        // Defaults
        {
          forwardNpm: true,
          public: false,
        },
        // User overrides
        options.settings || {},
      )
      fs.outputJsonSync(nowSettingsPath, nowSettings)
      TerminalUtils.verbosePkg(pkg, nowSettings)

      const args = [
        'deploy',
        '-n',
        deploymentName,
        ...envVars,
        '-A',
        nowSettingsPath,
        '-C',
      ]

      const deployResponse = await ChildProcessUtils.execPkg(pkg, 'now', args, {
        cwd: pkg.paths.packageRoot,
      })
      const deploymentIdRegex = /(https:\/\/.+\.now\.sh)/g
      if (!deploymentIdRegex.test(deployResponse.stdout)) {
        throw new PackageError(
          pkg,
          'No deployment id could be found, could not complete deployment',
        )
      }
      const deploymentId = deployResponse.stdout.match(deploymentIdRegex)[0]
      TerminalUtils.infoPkg(
        pkg,
        `Waiting for deployment (${deploymentId}) to be ready...`,
      )

      // Now we need to wait for the deployment to be ready.

      let ready = false

      setTimeout(() => {
        if (ready) {
          return
        }
        throw new PackageError(
          pkg,
          dedent(`
          The deployment process timed out. There may be an issue with your deployment or with "now". You could try a manually deployment using the following commands to gain more insight into the issue:

            ${chalk.blue(`cd ${pkg.paths.packageRoot}`)}
            ${chalk.blue(`now ${args.join(' ')}`)}
          `),
        )
      }, (options.deployTimeoutMins || 15) * 60 * 1000)

      await pWhilst(
        () => !ready,
        async () => {
          // we will check the status for the deployment every 5 seconds
          await new Promise(resolve => setTimeout(resolve, 5 * 1000))
          const status = ChildProcessUtils.execSync('now', ['ls', deploymentId])
          if (/READY/.test(status)) {
            ready = true
          } else {
            TerminalUtils.infoPkg(pkg, '...')
          }
        },
      )

      const alias = R.path(['settings', 'alias'], options)

      if (alias != null) {
        TerminalUtils.infoPkg(
          pkg,
          `Setting up alias for new deployment to ${alias}....`,
        )
        await ChildProcessUtils.execPkg(pkg, 'now', [
          'alias',
          'set',
          deploymentId,
          alias,
        ])

        // We need to do this at this point before attaching the rules as the rules
        // seem to indicate the deployment as not being aliased :-/
        if (!options.disableRemovePrevious) {
          // Removes previous deployments 👍
          try {
            TerminalUtils.infoPkg(
              pkg,
              `Checking to see if there are any previous deployments to remove...`,
            )
            await ChildProcessUtils.execPkg(pkg, 'now', [
              'rm',
              deploymentName,
              '--safe',
              '-y',
            ])
          } catch (err) {
            TerminalUtils.infoPkg(pkg, 'No previous deployments to remove.')
            TerminalUtils.verbosePkg(pkg, err.stack)
          }
        }
      }

      TerminalUtils.successPkg(pkg, `Deployment successful`)
    } catch (err) {
      throw new PackageError(pkg, 'Failed to deploy', err)
    }
  },
}

module.exports = nowDeployPlugin
