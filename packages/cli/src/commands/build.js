// @flow

const { TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const pSeries = require('p-series')
const asyncCommand = require('../lib/async-command')

module.exports = {
  command: 'build',
  desc: 'Executes the configured build plugin for each package',
  builder: yargs =>
    yargs
      .option('packages', {
        alias: 'p',
        describe: 'The packages to build',
        type: 'array',
      })
      .option('select', {
        alias: 's',
        describe: 'Enable selection of packages to build',
        type: 'boolean',
      })
      .option('exact', {
        alias: 'e',
        describe:
          'Useful when selecting/filtering packages. When enabled only the specifically selected/filtered packages will be built.',
        type: 'boolean',
      }),
  handler: asyncCommand(async argv => {
    try {
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'production'
      }
      TerminalUtils.title('Running build command...')
      const queueBuild = pkg => () => PackageUtils.buildPackage(pkg)

      let packages = PackageUtils.resolvePackages(argv.packages || [], {
        strict: argv.exact,
      })

      if (argv.select) {
        // Ask which packages to develop if the select option was enabled
        const selectedPackages = await TerminalUtils.multiSelect(
          'Which packages would you like to develop?',
          {
            choices: packages.map(x => ({
              value: x.name,
              text: `${x.name} (${x.version})`,
            })),
          },
        )
        packages = PackageUtils.resolvePackages(selectedPackages, {
          strict: argv.exact,
        })
      }

      TerminalUtils.verbose(`Building packages:`)
      TerminalUtils.verbose(packages.map(x => x.name))

      await pSeries(packages.map(queueBuild))
      TerminalUtils.success('Done')
    } catch (ex) {
      TerminalUtils.error('Build failed', ex)
    }
  }),
}
