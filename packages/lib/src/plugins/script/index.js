// @flow

import type { ChildProcess } from 'child_process'
import type {
  Package,
  BuildPlugin,
  DevelopPlugin,
  DeployPlugin,
  DevelopInstance,
} from '../../types'

const R = require('ramda')
const readPkg = require('read-pkg')
const TerminalUtils = require('../../terminal')
const ChildProcessUtils = require('../../childProcess')
const DevelopPluginUtils = require('../utils')

type Options = {|
  scriptName: string,
  runForEveryChange?: boolean,
|}

type TaskName = 'build' | 'develop' | 'deploy' | 'clean'

type ChildProcessMap = {
  [key: TaskName]: {
    [key: string]: ChildProcess,
  },
}

const childProcessMap: ChildProcessMap = {
  build: {},
  clean: {},
  develop: {},
  deploy: {},
}

const addChildProcess = (
  pkg: Package,
  task: TaskName,
  processInstance: ChildProcess,
) => {
  childProcessMap[task][pkg.name] = processInstance
}

const getChildProcess = (pkg: Package, task: TaskName) =>
  childProcessMap[task][pkg.name]

const killChildProcessFor = (pkg: Package, task: TaskName) => {
  const childProcess = getChildProcess(pkg, task)
  if (!childProcess) {
    TerminalUtils.verbosePkg(pkg, `No running "${task}" script process to kill`)
    return Promise.resolve()
  }
  return DevelopPluginUtils.killChildProcess(pkg, childProcess).then(() => {
    TerminalUtils.verbosePkg(
      pkg,
      `Killed "${task}" script process successfully`,
    )
    if (childProcessMap[task]) {
      delete childProcessMap[task]
    }
  })
}

const runScript = (task: TaskName) => async (
  pkg: Package,
  options: Options,
) => {
  if (!options.scriptName || typeof options.scriptName !== 'string') {
    throw new Error(
      `No scriptName was provided for the develop configuration of ${
        pkg.name
      }.`,
    )
  }

  const pkgJson = readPkg.sync(pkg.paths.packageJson)

  const returnAPI: DevelopInstance = {
    kill: () => killChildProcessFor(pkg, task),
  }

  const existingProcess = getChildProcess(pkg, task)
  if (existingProcess && !options.runForEveryChange) {
    // $FlowFixMe
    return task === 'develop' ? returnAPI : undefined
  }

  if (existingProcess) {
    await killChildProcessFor(pkg, task)
  }

  await new Promise((resolve, reject) => {
    const scriptCmd = R.path(['scripts', options.scriptName], pkgJson)
    if (!scriptCmd || R.isEmpty(scriptCmd)) {
      throw new Error(
        `Could not resolve script named "${options.scriptName}" on ${pkg.name}`,
      )
    }

    TerminalUtils.infoPkg(pkg, `Executing script "${options.scriptName}"`)

    const childProcess = ChildProcessUtils.execPkg(
      pkg,
      'npm',
      ['run', options.scriptName],
      {
        cwd: pkg.paths.packageRoot,
      },
    )

    childProcess.catch(err => {
      TerminalUtils.verbosePkg(
        pkg,
        `Error executing script "${options.scriptName}"`,
      )
      reject(err)
    })

    // Give the catch above a tick of space, so that it can resolve any
    // error that may have occurred
    process.nextTick(() => {
      childProcess.on('close', () => {
        TerminalUtils.verbosePkg(
          pkg,
          `Stopped script "${options.scriptName}" process`,
        )
      })
      addChildProcess(pkg, task, childProcess)
      resolve()
    })
  })

  // $FlowFixMe
  return task === 'develop' ? returnAPI : undefined
}

const scriptPlugin: BuildPlugin & DevelopPlugin & DeployPlugin = {
  name: 'plugin-script',
  build: runScript('build'),
  clean: runScript('clean'),
  // $FlowFixMe
  develop: runScript('develop'),
  deploy: runScript('deploy'),
}

module.exports = scriptPlugin
