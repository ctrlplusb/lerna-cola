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
  packageFilters: ?Array<string> = [],
): Array<Package> {
  const packages = config().packages

  if (!packageFilters || packageFilters.length === 0) {
    return packages
  }

  TerminalUtils.verbose(
    `Resolving packages with filter [${packageFilters.join(', ')}]`,
  )

  const packageNames = packages.map(x => x.name)
  const invalidFilters = R.without(packageNames, packageFilters)
  if (invalidFilters.length > 0) {
    throw new Error(
      `The following packages could not be resolved:\n[${invalidFilters.join(
        ',',
      )}]`,
    )
  }

  const targets = new Set()

  packageFilters.forEach(name => {
    targets.add(name)
    config().packageMap[name].allDependencies.forEach(x => {
      targets.add(x)
    })
  })

  const filteredPackagesNames = [...targets]

  // Let's get a sorted version by filtering allPackages
  // which will already be in a safe build order.
  const result = packages.filter(
    x => !!filteredPackagesNames.find(name => name === x.name),
  )

  TerminalUtils.verbose(`Resolved: [${result.map(R.prop('name')).join(', ')}]`)
  return result
}
