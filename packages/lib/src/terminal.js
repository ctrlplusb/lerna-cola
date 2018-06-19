// @flow

/* eslint-disable no-console */

import type { Package } from './types'

const StringUtils = require('./strings')

type MultiSelectOptions = {
  choices: Array<string>,
  selected?: Array<string>,
  validate?: (Array<string>) => boolean | string,
}

type MultiValueAnswer = {
  type: string,
  value: Array<string>,
}

type SelectOptions = {
  choices: Array<string>,
  selected?: string,
  validate?: string => boolean | string,
}

type InputOptions = {
  validate?: string => boolean | string,
}

type SingleValueAnswer = {
  type: string,
  value: string,
}

type ConfirmAnswer = {
  key: string,
  value: boolean,
}

const chalk = require('chalk')
const inquirer = require('inquirer')

const formatVerbose = msg => chalk.dim(msg)
const formatError = msg => chalk.red.bold(msg)
const formatWarning = msg => chalk.yellow(msg)
const formatTitle = msg => chalk.bold.magenta(msg)
const formatInfo = msg => chalk.blue(msg)
const formatSuccess = msg => chalk.green(msg)
const formatHeader = msg => chalk.bold(msg)

function verbose(msg: string): void {
  if (process.env.VERBOSE) {
    console.log(formatVerbose(msg))
  }
}

function verbosePkg(pkg: Package, msg: string): void {
  if (process.env.VERBOSE) {
    console.log(StringUtils.packageMsg(pkg, formatVerbose(msg)))
  }
}

function error(msg: string, err?: Error): void {
  console.log(formatError(msg))
  if (err && err.stack) {
    console.log(err.stack)
  }
}

function errorPkg(pkg: Package, msg: string, err?: Error): void {
  console.log(StringUtils.packageMsg(pkg, formatError(msg)))
  if (err && err.stack) {
    console.log(StringUtils.packageMsg(pkg, err.stack))
  }
}

function warning(msg: string): void {
  console.log(formatWarning(msg))
}

function warningPkg(pkg: Package, msg: string): void {
  console.log(StringUtils.packageMsg(pkg, formatWarning(msg)))
}

function title(msg: string): void {
  console.log(formatTitle(msg))
}

function titlePkg(pkg: Package, msg: string): void {
  console.log(StringUtils.packageMsg(pkg, formatTitle(msg)))
}

function info(msg: string): void {
  console.log(formatInfo(msg))
}

function infoPkg(pkg: Package, msg: string): void {
  console.log(StringUtils.packageMsg(pkg, formatInfo(msg)))
}

function success(msg: string): void {
  console.log(formatSuccess(msg))
}

function successPkg(pkg: Package, msg: string): void {
  console.log(StringUtils.packageMsg(pkg, formatSuccess(msg)))
}

function header(msg: string): void {
  console.log(formatHeader(msg))
}

function headerPkg(pkg: Package, msg: string): void {
  console.log(StringUtils.packageMsg(pkg, formatHeader(msg)))
}

function multiSelect(
  message: string,
  options: MultiSelectOptions,
): Promise<MultiValueAnswer> {
  const { choices, selected, validate } = options
  return inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'prompt',
        message,
        choices,
        pageSize: choices.length,
        validate,
        default: selected,
      },
    ])
    .then(answers => answers.prompt)
}

function select(
  message: string,
  options: SelectOptions,
): Promise<SingleValueAnswer> {
  const { choices, validate } = options
  return inquirer
    .prompt([
      {
        type: 'list',
        name: 'prompt',
        message,
        choices,
        pageSize: choices.length,
        validate,
      },
    ])
    .then(answers => answers.prompt)
}

function input(
  message: string,
  options?: InputOptions = {},
): Promise<SingleValueAnswer> {
  const { validate } = options
  return inquirer
    .prompt([
      {
        type: 'input',
        name: 'input',
        message,
        validate,
      },
    ])
    .then(answers => answers.input)
}

function confirm(message: string): Promise<ConfirmAnswer> {
  return inquirer
    .prompt([
      {
        type: 'expand',
        name: 'confirm',
        message,
        default: 2, // default to help in order to avoid clicking straight through
        choices: [
          { key: 'y', name: 'Yes', value: true },
          { key: 'n', name: 'No', value: false },
        ],
      },
    ])
    .then(answers => answers.confirm)
}

module.exports = {
  confirm,
  error,
  errorPkg,
  header,
  headerPkg,
  info,
  infoPkg,
  input,
  multiSelect,
  select,
  success,
  successPkg,
  title,
  titlePkg,
  verbose,
  verbosePkg,
  warning,
  warningPkg,
}
