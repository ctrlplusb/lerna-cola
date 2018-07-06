// @flow

import type { Package } from '../types'

const R = require('ramda')
const config = require('../config')
const TerminalUtils = require('../terminal')

/**
 * Filters the packages down to the given.
 *
 * @param  {Array}  [packageFilters=[]]
 *         The names of the packages to resolve. If none is specified then
 *         all of them are resolved.
 *
 * @return {Promise<Array<Package>>} The resolved packages
 */
module.exports = function filterPackages(
  packageFilters: Array<string> = [],
): Array<Package> {
  TerminalUtils.verbose(
    `Resolving packages with filter [${packageFilters.join(', ')}]`,
  )
  const packages = config().packages
  const packagesArray = R.values(packages)
  if (packagesArray.length === 0) {
    throw new Error('Could not find any packages.')
  }
  const result =
    packageFilters.length === 0
      ? packagesArray
      : (() => {
          const packageNames = packagesArray.map(x => x.name)
          const invalidFilters = R.without(packageNames, packageFilters)
          if (invalidFilters.length > 0) {
            throw new Error(
              `The following packages could not be resolved:\n[${invalidFilters.join(
                ',',
              )}]`,
            )
          }
          return packageFilters.map(x => config().packageMap[x])
        })()
  TerminalUtils.verbose(`Resolved: [${result.map(R.prop('name')).join(', ')}]`)
  return result
}
