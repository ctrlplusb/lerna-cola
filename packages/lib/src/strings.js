// @flow

import type { Package } from './types'

const { EOL } = require('os')
const R = require('ramda')
const { removeNil, removeEmpty } = require('./arrays')
const config = require('./config')

const multiLineStringToArray = (str: string): Array<string> =>
  R.pipe(
    R.defaultTo(''),
    x => x.split(EOL),
    removeNil,
    removeEmpty,
  )(str)

const packageMsg = (pkg: Package, msg: string) => {
  const formattedPrefix = pkg.color(
    `${pkg.name.padEnd(config().terminalLabelMinLength + 1)}|`,
  )
  return `${formattedPrefix} ${(msg || '')
    .toString()
    .replace(/\n/gi, `\n${formattedPrefix} `)}`
}

module.exports = {
  multiLineStringToArray,
  packageMsg,
}
