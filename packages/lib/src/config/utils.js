// @flow

/* eslint-disable no-console */
/* eslint-disable global-require */

import type { LernaColaPluginConfig, Package } from '../types'

const R = require('ramda')
const toposort = require('toposort')
const path = require('path')
const fs = require('fs-extra')

const pluginCache = {}

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

  const findPackageByName: (Array<string>) => Array<Package> = R.map(name =>
    packages.find(x => x.name === name),
  ).filter(x => x != null)

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

  // $FlowFixMe
  const allDependants = R.chain(resolveDependants, pkg.dependants)

  // Let's get a sorted version of allDependants by filtering allPackages
  // which will already be in a safe build order.
  return packages
    .filter(x => !!R.find(R.equals(x.name), allDependants))
    .map(R.prop('name'))
}

const resolvePackage = (packageName: string): mixed => {
  const packagePath = require.resolve(packageName)
  console.info(`Trying to resolve package ${packagePath}`)
  let resolvedPackage
  try {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    resolvedPackage = require(packagePath)
  } catch (err) {
    console.info(`Failed to resolve package ${packagePath}`)
    console.info(err)
    console.info(`Trying to resolve package ${packagePath} as a symlink`)
    // EEK! Could be a symlink?
    try {
      fs.lstatSync(packagePath)
      const symLinkPath = fs.readlinkSync(path)
      // eslint-disable-next-line global-require,import/no-dynamic-require
      resolvedPackage = require(symLinkPath)
    } catch (symErr) {
      // DO nothing
      console.info(`Failed to resolve package ${packagePath} as a symlink`)
      console.info(symErr)
    }
  }

  console.info(`Resolved package ${packagePath}`)

  return resolvedPackage
}

const resolvePlugin = (pluginName: string) => {
  if (R.isEmpty(pluginName) || R.isNil(pluginName)) {
    throw new Error('No plugin name was given to resolvePlugin')
  }

  // Core plugins
  switch (pluginName) {
    case 'core-plugin-develop-build':
      return require('../plugins/develop-build')
    case 'core-plugin-develop-server':
      return require('../plugins/develop-server')
    case 'core-plugin-script':
      return require('../plugins/script')
    default:
    // Do nothing, fall through and resolve custom plugin...
  }

  if (pluginCache[pluginName]) {
    return pluginCache[pluginName]
  }

  const packagePlugin = resolvePackage(pluginName)

  if (!packagePlugin) {
    throw new Error(
      `Could not resolve "${pluginName}" plugin. Make sure you have the plugin installed.`,
    )
  }

  pluginCache[pluginName] = packagePlugin

  return packagePlugin
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
    console.error(err)
    process.exit(1)
    throw new Error('💩')
  }
}

module.exports = {
  getAllDependants,
  getDependants,
  getDependencies,
  getPlugin,
  orderByDependencies,
  resolvePackage,
  resolvePlugin,
}
