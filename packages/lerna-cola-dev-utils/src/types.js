// @flow
/* eslint-disable no-use-before-define */

import type { ChildProcess } from 'child_process'
import type { Chalk } from 'chalk'

export type PackageVersions = { [string]: string }

export type PackageWatcher = {
  start: () => void,
  stop: () => void,
}

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

export type BuildPlugin = {
  name: string,
  clean: () => Promise<mixed>,
  build: () => Promise<mixed>,
}

export type DeployPath = string

export type DeployPlugin = {
  name: string,
  deploy: DeployPath => Promise<mixed>,
}

export type DevelopInstance = {
  kill: () => Promise<void>,
}

export type DevelopPlugin = {
  name: string,
  develop: PackageWatcher => Promise<DevelopInstance>,
}

export type PackagePlugins = {
  buildPlugin: ?BuildPlugin,
  deployPlugin: ?DeployPlugin,
  developPlugin: ?DevelopPlugin,
}

export type Package = {
  config: Object,
  color: Chalk,
  dependants: Array<string>,
  dependencies: Array<string>,
  devDependencies: Array<string>,
  maxPackageNameLength: number,
  name: string,
  packageJson: Object,
  packageName: string,
  paths: PackagePaths,
  plugins: PackagePlugins,
  version: string,
}

export type PackageMap = { [string]: Package }

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
