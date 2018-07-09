// @flow

/* eslint-disable no-console */
/* eslint-disable global-require */

import type { LernaColaPluginConfig, Package } from '../types'

const R = require('ramda')
const toposort = require('toposort')
const resolvePlugin = require('../plugins/resolve-plugin')

const allDeps = (pkg: Package) =>
  (pkg.dependencies || []).concat(pkg.devDependencies || [])

const getDependencies = (
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

const getDependants = (pkg: Package, packages: Array<Package>): Array<string> =>
  packages.filter(x => R.contains(pkg.name, allDeps(x))).map(R.prop('name'))

const orderByDependencies = (packages: Array<Package>): Array<Package> => {
  const packageDependencyGraph = (pkg: Package): Array<Array<string>> =>
    R.pipe(
      allDeps,
      R.map(dependencyName => [dependencyName, pkg.name]),
    )(pkg)

  // $FlowFixMe
  const dependencyGraph = R.chain(packageDependencyGraph)

  const hasNoDependencies = ({ dependencies }: Package): boolean =>
    dependencies.length === 0

  const packagesWithNoDependencies: Array<string> = R.pipe(
    R.filter(hasNoDependencies),
    R.map(R.prop('name')),
  )(packages)

  const findPackageByName = (packageNames: Array<string>): Array<Package> =>
    packageNames.reduce((acc, name) => {
      const found = packages.find(x => x.name === name)
      if (found != null) {
        return [...acc, found]
      }
      return acc
    }, [])

  return R.pipe(
    dependencyGraph,
    toposort,
    R.without(packagesWithNoDependencies),
    R.concat(packagesWithNoDependencies),
    findPackageByName,
  )(packages)
}

const getAllDependants = (
  pkg: Package,
  packages: Array<Package>,
): Array<string> => {
  const findPackage = name => packages.find(x => x.name === name)

  const resolveDependants = dependantName => {
    const dependant = findPackage(dependantName)
    if (!dependant) {
      throw new Error(
        `Could not find dependant package "${dependantName ||
          ''}" for package ${pkg.name}`,
      )
    }
    return [
      dependant.name,
      ...dependant.dependants,
      ...R.map(resolveDependants, dependant.dependants),
    ]
  }

  // $FlowFixMe
  const allDependants = R.chain(resolveDependants, pkg.dependants)

  // Let's get a sorted version of allDependants by filtering allPackages
  // which will already be in a safe build order.
  return packages
    .filter(x => !!R.find(R.equals(x.name), allDependants))
    .map(R.prop('name'))
}

const getAllDependencies = (
  pkg: Package,
  packages: Array<Package>,
): Array<string> => {
  const findPackage = name => R.find(R.propEq('name', name), packages)

  const resolveDependencies = dependencyName => {
    const dependency = findPackage(dependencyName)
    if (!dependency) {
      throw new Error(
        `Could not find dependency package "${dependencyName ||
          ''}" for package ${pkg.name}`,
      )
    }
    return [
      dependency.name,
      ...dependency.dependencies,
      ...R.map(resolveDependencies, dependency.dependencies),
    ]
  }

  // $FlowFixMe
  const allDependencies = R.chain(resolveDependencies, pkg.dependencies)

  // Let's get a sorted version of allDependencies by filtering allPackages
  // which will already be in a safe build order.
  return packages
    .filter(x => !!R.find(R.equals(x.name), allDependencies))
    .map(R.prop('name'))
}

const getPlugin = (
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
    throw err
  }
}

module.exports = {
  getAllDependants,
  getAllDependencies,
  getDependants,
  getDependencies,
  getPlugin,
  orderByDependencies,
}
