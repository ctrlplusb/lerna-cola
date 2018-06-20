// @flow

import type { PackageMap } from '../types'

const { EOL } = require('os')
const fs = require('fs-extra')
const path = require('path')
const toposort = require('toposort')
const readPkg = require('read-pkg')
const R = require('ramda')
const TerminalUtils = require('../terminal')
const AppUtils = require('../app')
const ObjectUtils = require('../objects')
const ColorUtils = require('../colors')
const resolvePlugin = require('../plugins/resolvePlugin')
const resolvePackageRoots = require('./resolve-package-roots')

let cache = null

const defaultPackageConfig = {
  srcDir: 'src',
  entryFile: 'index.js',
  outputDir: 'build',
  buildPlugin: null,
  developPlugin: null,
  deployPlugin: null,
  dependencies: [],
}

// :: Package -> Array<string>
const allDeps = pkg =>
  (pkg.dependencies || [])
    .concat(pkg.devDependencies || [])
    .concat(pkg.softDependencies || [])

// :: Package -> Array<string>
const linkDeps = pkg =>
  (pkg.dependencies || []).concat(pkg.devDependencies || [])

// :: string -> Package
const toPackage = packagePath => {
  const appConfig = AppUtils.getConfig()
  const packageJsonPath = path.resolve(packagePath, './package.json')
  if (!fs.pathExistsSync(packageJsonPath)) {
    TerminalUtils.error(
      `No package.json file found for package at ${packagePath}`,
    )
    process.exit(1)
  }
  const packageJson = readPkg.sync(packageJsonPath, { normalize: false })
  const packageName = packageJson.name
  const config = ObjectUtils.mergeDeep(
    defaultPackageConfig,
    R.path(['packages', packageName], appConfig) || {},
  )
  return {
    name: packageName,
    color: ColorUtils.nextColorPair(),
    config,
    packageJson,
    packageName: packageJson.name,
    version: packageJson.version || '0.0.0',
    paths: {
      monoRepoRoot: process.cwd(),
      monoRepoRootNodeModules: path.resolve(process.cwd(), './node_modules'),
      packageBuildOutput: path.resolve(packagePath, config.outputDir),
      packageSrc: path.resolve(packagePath, config.srcDir),
      packageEntryFile: path.resolve(
        packagePath,
        config.srcDir,
        config.entryFile,
      ),
      packageJson: packageJsonPath,
      packageLockJson: path.resolve(packagePath, './package-lock.json'),
      packageNodeModules: path.resolve(packagePath, './node_modules'),
      packageRoot: packagePath,
      packageWebpackCache: path.resolve(packagePath, './.webpackcache'),
    },
  }
}

const resolvePluginFor = (pkg, type) => {
  const pluginDef = pkg.config[type]
  if (pluginDef == null) {
    return null
  }
  const config =
    typeof pluginDef === 'string' ? { name: pluginDef, options: {} } : pluginDef
  const pluginFactory = resolvePlugin(config.name)
  return pluginFactory(pkg, config.options)
}

function getPlugins(pkg) {
  const resolvedPlugins = {
    buildPlugin: resolvePluginFor(pkg, 'buildPlugin'),
    developPlugin: resolvePluginFor(pkg, 'developPlugin'),
    deployPlugin: resolvePluginFor(pkg, 'deployPlugin'),
  }

  // If a package has a "build" plugin but no "develop" plugin then
  // we will automatically assign the "develop-build" plugin:
  if (resolvedPlugins.buildPlugin && !resolvedPlugins.developPlugin) {
    resolvedPlugins.developPlugin = resolvePlugin('core-plugin-develop-build')
  }

  return resolvedPlugins
}

// :: Array<Package> -> Array<Package>
function orderByDependencies(packages) {
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

/**
 * Gets all the packages for the lerna-cola application.
 *
 * The packages are ordered based on their dependency graph.
 * i.e. build them in order.
 *
 * @return {Array<Package>} The package meta object
 */
module.exports = async function getAllPackages(
  skipCache: ?boolean,
): PackageMap {
  if (!skipCache && cache) {
    return cache
  }

  TerminalUtils.verbose('Resolving package data from disk')

  const appConfig = AppUtils.getConfig()
  const packagePaths = await resolvePackageRoots(appConfig.packageSources)

  // convert into a Package
  let packages = packagePaths.map(toPackage)

  // :: Package -> Array<string>
  const getSoftDependencies = pkg =>
    (pkg.config.softDependencies || []).reduce((acc, dependencyName) => {
      const dependency = R.find(R.propEq('name', dependencyName), packages)
      if (!dependency) {
        TerminalUtils.warning(
          `Could not find ${dependencyName} referenced as soft dependency for ${
            pkg.name
          }`,
        )
        return acc
      }
      return acc.concat([dependencyName])
    }, [])

  // :: (Package, string) -> Array<string>
  const getDependencies = (allPackages, pkg, dependencyType) => {
    const targetDependencies = R.path(['packageJson', dependencyType], pkg)
    if (!targetDependencies) {
      return []
    }
    return Object.keys(targetDependencies).reduce((acc, cur) => {
      const match = allPackages.find(x => x.packageName === cur)
      return match ? [...acc, match.name] : acc
    }, [])
  }

  // :: -> Array<string>
  const getDependants = (allPackages, pkg) =>
    allPackages
      .filter(x => R.contains(pkg.name, allDeps(x)))
      .map(R.prop('name'))

  // :: -> Array<string>
  const getLinkedDependants = (allPackages, pkg) =>
    allPackages
      .filter(x => R.contains(pkg.name, linkDeps(x)))
      .map(R.prop('name'))

  // TODO: getAllDependants and getAllLinkedDependants can be generalised.

  // :: -> Array<string>
  const getAllDependants = (allPackages, pkg) => {
    const findPackage = name => R.find(R.propEq('name', name), allPackages)

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
    return allPackages
      .filter(x => !!R.find(R.equals(x.name), allDependants))
      .map(R.prop('name'))
  }

  // :: -> Array<string>
  const getAllLinkedDependants = (allPackages, pkg) => {
    const findPackage = name => R.find(R.propEq('name', name), allPackages)

    // :: String -> Array<String>
    const resolveLinkedDependants = dependantName => {
      const dependant = findPackage(dependantName)
      return [
        dependant.name,
        ...dependant.linkedDependants,
        ...R.map(resolveLinkedDependants, dependant.linkedDependants),
      ]
    }

    const allLinkedDependants = R.chain(
      resolveLinkedDependants,
      pkg.linkedDependants,
    )

    // Let's get a sorted version of allDependants by filtering allPackages
    // which will already be in a safe build order.
    return allPackages
      .filter(x => !!R.find(R.equals(x.name), allLinkedDependants))
      .map(R.prop('name'))
  }

  // The packages this package directly depends on.
  packages = packages.map(pkg => {
    const dependencies = getDependencies(packages, pkg, 'dependencies')
    const devDependencies = getDependencies(packages, pkg, 'devDependencies')
    const softDependencies = getSoftDependencies(pkg)
    return Object.assign({}, pkg, {
      dependencies,
      devDependencies,
      softDependencies,
    })
  })

  // Packages that directly depend (via link) on this package.
  packages = packages.map(pkg =>
    Object.assign({}, pkg, {
      linkedDependants: getLinkedDependants(packages, pkg),
    }),
  )

  // Packages that directly depend (via link or soft dep) on this package.
  packages = packages.map(pkg =>
    Object.assign({}, pkg, {
      dependants: getDependants(packages, pkg),
    }),
  )

  // Packages ordered based on their dependencies (via link or soft dep)
  // based order, which mean building them in order should be safe.
  packages = orderByDependencies(packages)

  // Add the FULL linked dependant tree
  packages = packages.map(pkg =>
    Object.assign(pkg, {
      allLinkedDependants: getAllLinkedDependants(packages, pkg),
    }),
  )

  // Add the FULL dependant tree
  packages = packages.map(pkg =>
    Object.assign(pkg, {
      allDependants: getAllDependants(packages, pkg),
    }),
  )

  // Attach Plugins
  packages = packages.map(pkg =>
    Object.assign(pkg, {
      plugins: getPlugins(pkg),
    }),
  )

  // Attach max length to packages,
  const maxPackageNameLength = Math.max(...packages.map(x => x.name.length))
  packages.forEach(x => {
    // eslint-disable-next-line no-param-reassign
    x.maxPackageNameLength = maxPackageNameLength
  })

  // Verbose logging
  packages.forEach(pkg =>
    TerminalUtils.verbose(
      `Resolved package ${pkg.name}:${EOL}${JSON.stringify(
        R.omit(['packageJson'], pkg),
        null,
        2,
      )}`,
    ),
  )

  // Convert into an object map and assign to cache
  cache = packages.reduce(
    (acc, cur) => Object.assign(acc, { [cur.name]: cur }),
    {},
  )

  TerminalUtils.verbose(
    `Package build order: \n\t- ${R.values(cache)
      .map(R.prop('name'))
      .join(`${EOL}\t- `)}`,
  )

  return cache
}
