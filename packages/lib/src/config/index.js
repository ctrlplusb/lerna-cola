// @flow

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

import type {
  Config,
  LernaColaConfig,
  LernaColaPackageConfig,
  Package,
} from '../types'

const path = require('path')
const fs = require('fs-extra')
const ObjectUtils = require('../objects')
const getPackageRoots = require('./get-package-roots')
const ColorUtils = require('../colors')
const {
  getAllDependants,
  getAllDependencies,
  getDependencies,
  getDependants,
  getPlugin,
  orderByDependencies,
} = require('./utils')

let cache

const defaultConfig = {
  commandHooks: {
    clean: {
      pre: () => Promise.resolve(),
      post: () => Promise.resolve(),
    },
    build: {
      pre: () => Promise.resolve(),
      post: () => Promise.resolve(),
    },
    develop: {
      pre: () => Promise.resolve(),
      post: () => Promise.resolve(),
    },
    deploy: {
      pre: () => Promise.resolve(),
      post: () => Promise.resolve(),
    },
  },
  packageSources: ['packages/*'],
  packages: {},
}

const defaultPackageConfig = {
  srcDir: 'src',
  entryFile: 'index.js',
  outputDir: 'build',
  disableSrcWatching: false,
  buildPlugin: undefined,
  developPlugin: undefined,
  deployPlugin: undefined,
}

const jsConfigPath = path.join(process.cwd(), './lerna-cola.js')
const jsonConfigPath = path.join(process.cwd(), './lerna-cola.json')

const config = () => {
  if (cache) {
    return cache
  }

  if (!fs.existsSync(jsonConfigPath) && !fs.existsSync(jsConfigPath)) {
    throw new Error(
      `No lerna-cola config was found. Please create either a lerna-cola.js or a lerna-cola.json configuration file`,
    )
  }

  const lernaColaConfig: LernaColaConfig = ObjectUtils.mergeDeep(
    defaultConfig,
    fs.existsSync(jsonConfigPath)
      ? // $FlowFixMe
        require(jsonConfigPath)
      : // $FlowFixMe
        require(jsConfigPath),
  )

  let packages: Array<Package> = getPackageRoots().map(packagePath => {
    // $FlowFixMe
    const packageJson = require(path.join(packagePath, './package.json'))
    const packageConfig: LernaColaPackageConfig = ObjectUtils.mergeDeep(
      defaultPackageConfig,
      lernaColaConfig.packages[packageJson.name] || {},
    )
    const plugins = {
      cleanPlugin: getPlugin(
        packageJson.name,
        packageConfig.cleanPlugin,
        'cleanPlugin',
      ),
      buildPlugin: getPlugin(
        packageJson.name,
        packageConfig.buildPlugin,
        'buildPlugin',
      ),
      developPlugin: getPlugin(
        packageJson.name,
        packageConfig.developPlugin,
        'developPlugin',
      ),
      deployPlugin: getPlugin(
        packageJson.name,
        packageConfig.deployPlugin,
        'deployPlugin',
      ),
    }

    // If we have a buildPlugin but no cleanPlugin then we will assign the
    // default cleanPlugin that will ensure the build output directory
    // gets cleaned between builds.
    if (!plugins.cleanPlugin && plugins.buildPlugin) {
      plugins.cleanPlugin = getPlugin(
        packageJson.name,
        'plugin-clean-build',
        'cleanPlugin',
      )
    }

    // If we have a build plugin then we should be building our library
    // if it changes
    if (!plugins.developPlugin && plugins.buildPlugin) {
      plugins.developPlugin = getPlugin(
        packageJson.name,
        'plugin-develop-build',
        'developPlugin',
      )
    }

    return {
      name: packageJson.name,
      color: ColorUtils.nextColorPair(),
      config: packageConfig,
      disableSrcWatching: packageConfig.disableSrcWatching,
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
      // $FlowFixMe
      plugins,
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
    pkg.allDependencies = getAllDependencies(pkg, packages)
  })

  // Ensure there are no references to unknown packages
  Object.keys(lernaColaConfig.packages).forEach(packageName => {
    if (packages.find(x => x.name === packageName) == null) {
      throw new Error(
        `There is a lerna-cola configuration for "${packageName}", however, this package could not be resolved via the packageSources configuration.`,
      )
    }
  })

  const result: Config = {
    // $FlowFixMe
    commandHooks: lernaColaConfig.commandHooks,
    packages,
    packageMap: packages.reduce(
      (acc, pkg) => Object.assign(acc, { [pkg.name]: pkg }),
      {},
    ),
    terminalLabelMinLength: Math.max(
      ...['lerna-cola'.length, ...packages.map(x => x.name.length)],
    ),
  }

  cache = result

  return result
}

module.exports = config
