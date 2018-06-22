// @flow
/* eslint-disable no-use-before-define */

// eslint-disable-next-line no-unused-vars
import type { ChildProcess } from 'child_process'
import type { Chalk } from 'chalk'

export type LernaColaPluginConfig =
  | string
  | {
      name: string,
      options: Object,
    }

export type CommandHooks = {
  pre: () => Promise<void>,
  post: () => Promise<void>,
}

export type LernaColaCommandHooksConfig = {
  clean?: CommandHooks,
  build?: CommandHooks,
  develop?: CommandHooks,
  deploy?: CommandHooks,
}

export type LernaColaPackageConfig = {
  srcDir: string,
  entryFile: string,
  outputDir: string,
  disableSrcWatching: boolean,
  cleanPlugin?: LernaColaPluginConfig,
  buildPlugin?: LernaColaPluginConfig,
  developPlugin?: LernaColaPluginConfig,
  deployPlugin?: LernaColaPluginConfig,
}

export type LernaColaConfig = {
  commandHooks?: LernaColaCommandHooksConfig,
  packages: { [key: string]: LernaColaPackageConfig },
  packageSources?: Array<string>,
}

export type PackageVersions = { [string]: string }

export type PackageWatcher = {
  start: () => void,
  stop: () => void,
}

export type RunType = 'FIRST_RUN' | 'SELF_CHANGED' | 'DEPENDENCY_CHANGED'

export type PackageConductor = {
  run: (type: RunType, changedDependency?: Package) => Promise<DevelopInstance>,
  stop: () => Promise<void>,
}

export type DevelopInstance = {
  kill: () => Promise<void>,
}

/**
 * Paths for a Package
 */
export type PackagePaths = {
  monoRepoRoot: string,
  monoRepoRootNodeModules: string,
  packageBuildOutput: string,
  packageEntryFile: string,
  packageJson: string,
  packageLockJson: string,
  packageNodeModules: string,
  packageRoot: string,
  packageSrc: string,
  packageWebpackCache: string,
}

export type PluginArgs = {
  config: Config,
}

export type DevelopPluginArgs = PluginArgs & {
  runType: RunType,
  changedDependency?: Package,
  watcher: PackageWatcher,
}

export type CleanPlugin = {
  name: string,
  clean: (pkg: Package, options: Object, args: PluginArgs) => Promise<void>,
}

export type BuildPlugin = {
  name: string,
  build: (pkg: Package, options: Object, args: PluginArgs) => Promise<void>,
}

export type DeployPath = string

export type DeployPlugin = {
  name: string,
  deploy: (pkg: Package, options: Object, args: PluginArgs) => Promise<void>,
}

export type DevelopPlugin = {
  name: string,
  develop: (
    pkg: Package,
    options: Object,
    args: DevelopPluginArgs,
  ) => Promise<DevelopInstance>,
}

export type PackagePlugins = {
  cleanPlugin?: {
    plugin: CleanPlugin,
    options: Object,
  },
  buildPlugin?: {
    plugin: BuildPlugin,
    options: Object,
  },
  deployPlugin?: {
    plugin: DeployPlugin,
    options: Object,
  },
  developPlugin?: {
    plugin: DevelopPlugin,
    options: Object,
  },
}

export type Package = {
  name: string,
  config: Object,
  color: Chalk,
  disableSrcWatching: boolean,
  allDependants: Array<string>,
  dependants: Array<string>,
  dependencies: Array<string>,
  devDependencies: Array<string>,
  packageJson: Object,
  paths: PackagePaths,
  plugins: PackagePlugins,
  version: string,
}

export type PackageMap = { [string]: Package }

export type Config = {
  commandHooks: {
    clean: CommandHooks,
    build: CommandHooks,
    develop: CommandHooks,
    deploy: CommandHooks,
  },
  packages: Array<Package>,
  packageMap: PackageMap,
  terminalLabelMinLength: number,
}

declare module 'execa' {
  declare type ExecaChildProcess = ChildProcess & Promise<string, Error>
  declare type Execa = (
    cmd: string,
    args: ?Array<string>,
    opts: ?Object,
  ) => ExecaChildProcess

  declare type ExecaStatics = {
    spawn: Execa,
    sync: ChildProcess,
  }

  declare type ExecaWithStatics = Execa & ExecaStatics

  declare module.exports: ExecaWithStatics
}
