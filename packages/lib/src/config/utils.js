// @flow

/* eslint-disable no-console */

import type { LernaColaPluginConfig, Package } from '../types'

const R = require('ramda')
const toposort = require('toposort')
const resolvePlugin = require('../plugins/resolvePlugin')

const allDeps = (pkg: Package) =>
  (pkg.dependencies || []).concat(pkg.devDependencies || [])

export const getDependencies = (
  pkg: Package,
  packages: Array<Package>,
  dependencyType: 'dependencies' | 'devDependencies',
): Array<string> => {
  const targetDependencies = R.path(['packageJson', dependencyType], pkg)
  if (!targetDependencies) {
    return []
  }
  return Object.keys(targetDependencies).reduce((acc, cur) => {
    const match = packages.find(x => x.name === cur)
    return match ? [...acc, match.name] : acc
  }, [])
}

export const getDependants = (
  pkg: Package,
  packages: Array<Package>,
): Array<string> =>
  packages.filter(x => R.contains(pkg.name, allDeps(x))).map(R.prop('name'))

export const orderByDependencies = (
  packages: Array<Package>,
): Array<Package> => {
  const packageDependencyGraph = pkg =>
    R.pipe(
      allDeps,
      R.map(dependencyName => [dependencyName, pkg.name]),
    )(pkg)

  // :: Array<Package> -> Array<Array<string, string>>
  const dependencyGraph = R.chain(packageDependencyGraph)

  // :: Package -> bool
  const hasNoDependencies = ({ dependencies }) => dependencies.length === 0

  // :: Array<Package>
  const packagesWithNoDependencies = R.pipe(
    R.filter(hasNoDependencies),
    R.map(R.prop('name')),
  )(packages)

  // :: string -> Package
  const findPackageByName = R.map(name =>
    R.find(R.propEq('name', name), packages),
  )

  return R.pipe(
    dependencyGraph,
    toposort,
    R.without(packagesWithNoDependencies),
    R.concat(packagesWithNoDependencies),
    findPackageByName,
  )(packages)
}

export const getAllDependants = (
  pkg: Package,
  packages: Array<Package>,
): Array<string> => {
  const findPackage = name => R.find(R.propEq('name', name), packages)

  // :: String -> Array<String>
  const resolveDependants = dependantName => {
    const dependant = findPackage(dependantName)
    return [
      dependant.name,
      ...dependant.dependants,
      ...R.map(resolveDependants, dependant.dependants),
    ]
  }

  const allDependants = R.chain(resolveDependants, pkg.dependants)

  // Let's get a sorted version of allDependants by filtering allPackages
  // which will already be in a safe build order.
  return packages
    .filter(x => !!R.find(R.equals(x.name), allDependants))
    .map(R.prop('name'))
}

export const getPlugin = (
  packageName: string,
  pluginConfig: ?LernaColaPluginConfig,
  pluginType: string,
) => {
  if (pluginConfig == null) {
    return undefined
  }
  try {
    const config =
      typeof pluginConfig === 'string'
        ? { name: pluginConfig, options: {} }
        : pluginConfig
    return {
      plugin: resolvePlugin(config.name),
      options: config.options,
    }
  } catch (err) {
    console.error(`Failed to load "${pluginType}" for ${packageName}`)
    console.error(err)
    process.exit(1)
  }
}
