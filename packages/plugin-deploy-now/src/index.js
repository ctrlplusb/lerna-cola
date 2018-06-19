// @flow

import type { Package, DeployPlugin } from '@lerna-cola/lib/build/types'

const R = require('ramda')
const pWhilst = require('p-whilst')
const dedent = require('dedent')
const chalk = require('chalk')
const deepMerge = require('deepmerge')
const tempWrite = require('temp-write')
const writeJsonFile = require('write-json-file')
const { TerminalUtils, ChildProcessUtils } = require('@lerna-cola/lib')

type NowConfig = {
  forwardNpm?: boolean,
  public?: boolean,
}

type NowAliasRules = {}

type Options = {
  additionalAliasRules?: Array<NowAliasRules>,
  alias?: string,
  disableRemovePrevious?: boolean,
  deployTimeoutMins?: number,
  passThroughEnvVars?: Array<string>,
  nowConfig?: NowConfig,
}

module.exports = function nowDeploy(
  pkg: Package,
  options: Options = {},
): DeployPlugin {
  if (R.isNil(options.alias) || R.isEmpty(options.alias)) {
    TerminalUtils.errorPkg(
      pkg,
      'You must supply an "alias" for the "now" deploy plugin.',
    )
    process.exit(1)
  }

  return {
    name: '@lerna-cola/plugin-now',
    build: () => {
      TerminalUtils.errorPkg(pkg, '"build" not supported by "now" plugin')
      process.exit(1)
    },
    clean: () => {
      TerminalUtils.errorPkg(pkg, '"clean" not supported by "now" plugin')
      process.exit(1)
    },
    develop: () => {
      TerminalUtils.errorPkg(pkg, '"develop" not supported by "now" plugin')
      process.exit(1)
    },
    deploy: async () => {
      if (process.env.NOW_USERNAME == null) {
        TerminalUtils.errorPkg(
          pkg,
          'In order to deploy to "now" you must supply your "now" username via a NOW_USERNAME environment variable.',
        )
        process.exit(1)
      }

      if (process.env.NOW_TOKEN == null) {
        TerminalUtils.errorPkg(
          pkg,
          'In order to deploy to "now" you must supply your "now" API token via a NOW_TOKEN environment variable.',
        )
        process.exit(1)
      }

      try {
        ChildProcessUtils.execSync('now', ['-v'])
      } catch (err) {
        TerminalUtils.errorPkg(
          pkg,
          'You need to have the "now" CLI installed on your machine and available on your PATH in order to deploy to now.',
        )
        throw err
      }

      const deploymentName = pkg.packageName

      const alias = options.alias
      const envVars = options.passThroughEnvVars
        ? options.passThroughEnvVars.reduce(
            (acc, cur) =>
              process.env[cur]
                ? [...acc, '-e', `${cur}=${process.env[cur]}`]
                : acc,
            [],
          )
        : []

      const nowConfigPath = tempWrite.sync()
      const nowConfig = deepMerge(
        deepMerge(
          // Defaults
          {
            forwardNpm: true,
            public: false,
          },
          // User overrides
          options.nowConfig || {},
        ),
        // These must be provided via the env for forced safety:
        {
          token: process.env.NOW_TOKEN,
          user: {
            username: process.env.NOW_USERNAME,
          },
        },
      )
      writeJsonFile.sync(nowConfigPath, nowConfig)

      const args = [
        'deploy',
        '-n',
        deploymentName,
        ...envVars,
        '-c',
        nowConfigPath,
        '-C',
        '-t',
        process.env.NOW_TOKEN || '',
      ]

      const deployResponse = await ChildProcessUtils.execPkg(pkg, 'now', args, {
        cwd: pkg.paths.packageRoot,
      })
      const deploymentIdRegex = /(https:\/\/.+\.now\.sh)/g
      if (!deploymentIdRegex.test(deployResponse)) {
        // Todo error
        process.exit(1)
      }
      const deploymentId = deployResponse.match(deploymentIdRegex)[0]
      TerminalUtils.infoPkg(pkg, `Creating deployment (${deploymentId})...`)

      // Now we need to wait for the deployment to be ready.

      let ready = false

      setTimeout(() => {
        if (ready) {
          return
        }
        TerminalUtils.errorPkg(
          pkg,
          dedent(`
          The deployment process timed out. :( There may be an issue with your deployment or with "now". You could try to manually deploy using the following commands to gain more insight into the issue:

            ${chalk.blue(`cd ${pkg.paths.packageRoot}`)}
            ${chalk.blue(`now ${args.join(' ')}`)}
          `),
        )
        process.exit(1)
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
          TerminalUtils.infoPkg(pkg, `Removing unaliased deployments...`)
          await ChildProcessUtils.execPkg(pkg, 'now', [
            'rm',
            deploymentName,
            '--safe',
            '-y',
          ])
        } catch (err) {
          TerminalUtils.errorPkg(
            pkg,
            'Failed to remove previous deployments. There may not have been any previous deployments.',
          )
          TerminalUtils.verbosePkg(pkg, err.stack)
        }
      }

      if (options.additionalAliasRules) {
        TerminalUtils.infoPkg(pkg, 'Attaching additional alias rules...')
        const aliasRulesPath = tempWrite.sync()
        writeJsonFile.sync(aliasRulesPath, {
          rules: [
            ...(options.additionalAliasRules || []),
            {
              dest: deploymentId,
            },
          ],
        })
        await ChildProcessUtils.execPkg(pkg, 'now', [
          'alias',
          alias,
          '-r',
          aliasRulesPath,
        ])
      }

      const minScale = R.path(['scale', 'min'], options)
      if (minScale) {
        const maxScale = R.path(['scale', 'max'], options)
        TerminalUtils.infoPkg(
          pkg,
          `Setting the scale factor to min(${minScale}) ${
            maxScale ? `max(${maxScale})` : ''
          }....`,
        )
        await ChildProcessUtils.execPkg(
          pkg,
          'now',
          ['scale', deploymentId, minScale, maxScale].filter(x => x != null),
        )
      }

      TerminalUtils.successPkg(pkg, `Deployment successful`)
    },
  }
}
