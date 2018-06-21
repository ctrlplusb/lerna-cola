// @flow

import type { Chalk } from 'chalk'
import type { Package } from './types'

const { EOL } = require('os')
const R = require('ramda')
const chalk = require('chalk')
const { removeNil, removeEmpty } = require('./arrays')
const config = require('./config')

const multiLineStringToArray = (str: string): Array<string> =>
  R.pipe(
    R.defaultTo(''),
    x => x.split(EOL),
    removeNil,
    removeEmpty,
  )(str)

const prefixedMsg = (color: Chalk, prefix: string, msg: string): string => {
  const formattedPrefix = `${color(
    `${prefix.padEnd(config().terminalLabelMinLength + 1)}`,
  )}|`

  return `${formattedPrefix} ${(msg || '')
    .toString()
    .replace(/\n/gi, `\n${formattedPrefix} `)}`
}

const lernaColaMsg = (msg: string): string =>
  prefixedMsg(chalk.bgBlack.gray, 'lerna-cola', msg)

const packageMsg = (pkg: Package, msg: string): string =>
  prefixedMsg(pkg.color, pkg.name, msg)

module.exports = {
  lernaColaMsg,
  multiLineStringToArray,
  packageMsg,
}
