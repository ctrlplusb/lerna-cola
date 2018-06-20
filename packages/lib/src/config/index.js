// @flow

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

import type { Config, LernaColaConfig, Package } from '../types'

const path = require('path')
const fs = require('fs-extra')
const ObjectUtils = require('../objects')
const getPackageRoots = require('./get-package-roots')
const ColorUtils = require('../colors')
const {
  getAllDependants,
  getDependencies,
  getDependants,
  getPlugin,
  orderByDependencies,
} = require('./utils')

const defaultAppConfig = {
  packageSources: ['packages/*'],
  packages: {},
}

const defaultPackageConfig = {
  srcDir: 'src',
  entryFile: 'index.js',
  outputDir: 'build',
  buildPlugin: undefined,
  developPlugin: undefined,
  deployPlugin: undefined,
}

const jsConfigPath = path.resolve(process.cwd(), './lerna-cola.js')
const jsonConfigPath = path.resolve(process.cwd(), './lerna-cola.json')

if (!fs.existsSync(jsonConfigPath) && !fs.existsSync(jsConfigPath)) {
  console.error(
    `No lerna-cola config was found. Please create either a lerna-cola.js or a lerna-cola.json configuration file`,
  )
  process.exit(1)
}

const lernaColaConfig: LernaColaConfig = ObjectUtils.mergeDeep(
  defaultAppConfig,
  fs.existsSync(jsonConfigPath)
    ? // $FlowFixMe
      require(jsonConfigPath)
    : // $FlowFixMe
      require(jsonConfigPath),
)

let packages: Array<Package> = getPackageRoots().map(packagePath => {
  // $FlowFixMe
  const packageJson = require(packagePath)
  const packageConfig = ObjectUtils.mergeDeep(
    defaultPackageConfig,
    lernaColaConfig.packages[packageJson.name] || {},
  )
  return {
    name: packageJson.name,
    color: ColorUtils.nextColorPair(),
    config: packageConfig,
    allDependants: [],
    dependants: [],
    dependencies: [],
    devDependencies: [],
    packageJson,
    paths: {
      monoRepoRoot: process.cwd(),
      monoRepoRootNodeModules: path.resolve(process.cwd(), './node_modules'),
      packageBuildOutput: path.resolve(packagePath, packageConfig.outputDir),
      packageSrc: path.resolve(packagePath, packageConfig.srcDir),
      packageEntryFile: path.resolve(
        packagePath,
        packageConfig.srcDir,
        packageConfig.entryFile,
      ),
      packageJson: packagePath,
      packageLockJson: path.resolve(packagePath, './package-lock.json'),
      packageNodeModules: path.resolve(packagePath, './node_modules'),
      packageRoot: packagePath,
      packageWebpackCache: path.resolve(packagePath, './.webpackcache'),
    },
    plugins: {
      // $FlowFixMe
      buildPlugin: getPlugin(
        packageJson.name,
        packageConfig.buildPlugin,
        'buildPlugin',
      ),
      // $FlowFixMe
      developPlugin: getPlugin(
        packageJson.name,
        packageConfig.developPlugin,
        'developPlugin',
      ),
      // $FlowFixMe
      deployPlugin: getPlugin(
        packageJson.name,
        packageConfig.deployPlugin,
        'deployPlugin',
      ),
    },
    version: packageJson.version || '0.0.0',
  }
})

packages.forEach(pkg => {
  pkg.dependencies = getDependencies(pkg, packages, 'dependencies')
  pkg.devDependencies = getDependencies(pkg, packages, 'devDependencies')
  pkg.dependants = getDependants(pkg, packages)
})

// Packages ordered based on their dependencies (via link or soft dep)
// based order, which mean building them in order should be safe.
packages = orderByDependencies(packages)

packages.forEach(pkg => {
  // We get the full dependant list for this package traversing through
  // each dependant. This is so we can know which packages will all be
  // affect (either directly, or indirectly) when this package changes
  pkg.allDependants = getAllDependants(pkg, packages)
})

// Ensure there are no references to unknown packages
Object.keys(lernaColaConfig.packages).forEach(packageName => {
  if (lernaColaConfig.packages[packageName].packageJson == null) {
    console.error(
      `There is a lerna-cola configuration for "${packageName}", however, this package could not be resolved via the packageSources configuration.`,
    )
    process.exit(1)
  }
})

const config: Config = {
  packages,
  packageMap: packages.reduce(
    (acc, pkg) => Object.assign(acc, { [pkg.name]: pkg }),
    {},
  ),
  terminalLabelMinLength: Math.max(
    ...['lerna-cola', ...Object.keys(lernaColaConfig.packages)].map(
      x => x.length,
    ),
  ),
}

module.exports = config
