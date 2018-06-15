// @flow

import type { ExecaChildProcess } from 'execa'
import type { Package } from './types'

const execa = require('execa')
const TerminalUtils = require('./terminal')
const StringUtils = require('./strings')

function exec(
  command: string,
  args?: Array<string> = [],
  opts?: Object = {},
): ExecaChildProcess {
  TerminalUtils.verbose(
    `exec child process: ${command} ${args.join(' ')}${
      opts.cwd ? ` (${opts.cwd})` : ''
    }`,
  )

  process.env.FORCE_COLOR = 'true'

  return execa(
    command,
    args,
    Object.assign(
      {},
      {
        env: process.env,
        stdio: 'pipe',
      },
      opts,
    ),
  ).then(result => result.stdout)
}

function execPkg(
  pkg: Package,
  command: string,
  args?: Array<string> = [],
  opts?: Object = {},
): ExecaChildProcess {
  process.env.FORCE_COLOR = 'true'

  const childProcess = execa(
    command,
    args,
    Object.assign({}, opts, {
      env: process.env,
    }),
  )

  childProcess.stdout.on('data', data => {
    // eslint-disable-next-line no-console
    console.log(StringUtils.packageMsg(pkg, data))
  })

  childProcess.stderr.on('data', data => {
    // eslint-disable-next-line no-console
    console.error(StringUtils.packageMsg(pkg, data))
  })

  return childProcess
}

function execSync(
  command: string,
  args?: Array<string> = [],
  opts?: Object = {},
): string {
  process.env.FORCE_COLOR = 'true'

  TerminalUtils.verbose(
    `execSync child process: ${command} ${args.join(' ')}${
      opts.cwd ? ` (${opts.cwd})` : ''
    }`,
  )

  return execa.sync(
    command,
    args,
    Object.assign(
      {},
      {
        env: process.env,
      },
      opts,
    ),
  ).stdout
}

module.exports = {
  exec,
  execPkg,
  execSync,
}
