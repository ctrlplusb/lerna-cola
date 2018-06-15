// @flow

/**
 * Lifted from Lerna ❤️
 */

const globby = require('globby')
const path = require('path')
const pMap = require('p-map')
const TerminalUtils = require('../terminal')

module.exports = function resolvePackageRoots(
  packageSources: Array<string> = ['packages/*'],
) {
  const globOpts = {
    cwd: process.cwd(),
    absolute: true,
    followSymlinkedDirectories: false,
    ignore: [],
  }

  const hasNodeModules = packageSources.some(
    cfg => cfg.indexOf('node_modules') > -1,
  )
  const hasGlobStar = packageSources.some(cfg => cfg.indexOf('**') > -1)

  if (hasGlobStar) {
    if (hasNodeModules) {
      TerminalUtils.error(
        'An explicit node_modules package path does not allow globstars (**)',
      )
      process.exit(1)
    }

    globOpts.ignore.push(
      // allow globs like "packages/**",
      // but avoid picking up node_modules/**/package.json
      '**/node_modules/**',
    )
  }

  return pMap(
    packageSources,
    globPath =>
      globby(path.join(globPath, 'package.json'), globOpts).then(globResults =>
        pMap(
          globResults,
          globResult => {
            // https://github.com/isaacs/node-glob/blob/master/common.js#L104
            // glob always returns "\\" as "/" in windows, so everyone
            // gets normalized because we can't have nice things.
            const packageConfigPath = path.normalize(globResult)
            const packageDir = path.dirname(packageConfigPath)
            return packageDir
          },
          {
            concurrency: 50,
          },
        ),
      ),
    {
      concurrency: 4,
    },
  ).then(results => {
    // fast-glob does not respect pattern order, so we re-sort by absolute path
    const lexicalByLocation = (a, b) => a.localeCompare(b)
    return results.reduce(
      (pkgs, result) => pkgs.concat(result.sort(lexicalByLocation)),
      [],
    )
  })
}
