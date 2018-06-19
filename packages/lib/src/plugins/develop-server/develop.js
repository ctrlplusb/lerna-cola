// @flow

import type { Package, DevelopInstance } from '../../types'

const path = require('path')
const TerminalUtils = require('../../terminal')
const ChildProcessUtils = require('../../childProcess')
const PackageUtils = require('../../packages')
const DevelopPluginUtils = require('../utils')

const childProcessMap = {}

const killChildProcessFor = (pkg: Package): Promise<void> => {
  const childProcess = childProcessMap[pkg.name]
  if (!childProcess) {
    TerminalUtils.verbose(`No running child process for ${pkg.name} to kill`)
    return Promise.resolve()
  }

  return DevelopPluginUtils.killChildProcess(pkg, childProcess).then(() => {
    TerminalUtils.verbose(`${pkg.name} killed successfully`)
    if (childProcessMap[pkg.name]) {
      delete childProcessMap[pkg.name]
    }
  })
}

// :: (Package) -> Promise
module.exports = function develop(pkg: Package): Promise<DevelopInstance> {
  const startServer = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const childProcess = ChildProcessUtils.execPkg(
        pkg,
        // Spawn a node process
        'node',
        // That runs the main file
        [path.resolve(pkg.paths.packageRoot, pkg.packageJson.main)],
        {
          cwd: pkg.paths.packageRoot,
        },
      )
      childProcess.catch(err => {
        TerminalUtils.verbosePkg(pkg, `Error starting`)
        reject(err)
      })

      // Give the catch above a tick of space, so that it can resolve any
      // error that may have occurred
      process.nextTick(() => {
        if (!childProcess.stderr) {
          TerminalUtils.verbosePkg(
            pkg,
            'Not resolving server as childProcess was not created properly. An error probably occurred.',
          )
          reject(new Error(`${pkg.name} has problems. Please fix`))
        } else {
          childProcess.on('close', () => {
            TerminalUtils.verbosePkg(pkg, `Server process stopped`)
          })

          childProcessMap[pkg.name] = childProcess

          resolve()
        }
      })
    })

  return (
    PackageUtils.buildPackage(pkg)
      // Ensure any existing childProcess is killed
      .then(() => killChildProcessFor(pkg))
      // Fire up the new childProcess
      .then(startServer)
      // Return the dev instance API
      .then(() => ({
        kill: () => killChildProcessFor(pkg),
      }))
  )
}
