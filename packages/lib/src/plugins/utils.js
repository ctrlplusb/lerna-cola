// @flow

import type { ExecaChildProcess } from 'execa'
import type { Package } from '../types'

const TerminalUtils = require('../terminal')

function killChildProcess(
  pkg: Package,
  childProcess: ExecaChildProcess,
): Promise<void> {
  TerminalUtils.verbosePkg(pkg, `Killing child process...`)

  return new Promise(resolve => {
    let killed = false

    childProcess.on('close', () => {
      killed = true
    })

    childProcess.catch(err => {
      TerminalUtils.verbosePkg(pkg, `Process killed with errors`)
      TerminalUtils.verbosePkg(pkg, err)
      resolve()
    })

    const checkInterval = setInterval(() => {
      if (killed) {
        TerminalUtils.verbosePkg(pkg, `Process killed`)
        clearInterval(checkInterval)
        resolve()
      }
    }, 50)

    childProcess.kill('SIGTERM')
  }).catch(err => {
    TerminalUtils.verbosePkg(pkg, `Fatal error whilst killing process`)
    throw err
  })
}

module.exports = { killChildProcess }
