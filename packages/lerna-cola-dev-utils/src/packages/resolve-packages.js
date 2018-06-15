// @flow

import type { Package } from '../types'

const R = require('ramda')
const TerminalUtils = require('../terminal')
const getAllPackages = require('./get-all-packages')

/**
 * Filters the packages down to the given.
 *
 * @param  {Array}  [packageFilters=[]]
 *         The names of the packages to resolve. If none is specified then
 *         all of them are resolved.
 *
 * @return {Promise<Array<Package>>} The resolved packages
 */
module.exports = async function resolvePackages(
  packageFilters: Array<string> = [],
): Promise<Array<Package>> {
  TerminalUtils.verbose(
    `Resolving packages with filter [${packageFilters.join(', ')}]`,
  )
  const packages = await getAllPackages()
  const packagesArray = R.values(packages)
  if (packagesArray.length === 0) {
    TerminalUtils.error('Could not find any packages.')
    process.exit(1)
  }
  const result =
    packageFilters.length === 0
      ? packagesArray
      : (() => {
          const packageNames = packagesArray.map(x => x.name)
          const invalidFilters = R.without(packageNames, packageFilters)
          if (invalidFilters.length > 0) {
            TerminalUtils.error(
              `The following packages could not be resolved:\n[${invalidFilters.join(
                ',',
              )}]`,
            )
            process.exit(1)
          }
          return packageFilters.map(x => packages[x])
        })()
  TerminalUtils.verbose(`Resolved: [${result.map(R.prop('name')).join(', ')}]`)
  return result
}
