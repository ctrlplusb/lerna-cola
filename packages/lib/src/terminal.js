// @flow

/* eslint-disable no-console */

import type { Package } from './types'

const StringUtils = require('./strings')

type MultiSelectChoice = {
  value: string,
  text: string,
}

type MultiSelectOptions = {
  choices: Array<MultiSelectChoice>,
  selected?: Array<string>,
  validate?: (Array<string>) => boolean | string,
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
const prettyFormat = require('pretty-format')

const format = data => (typeof data === 'string' ? data : prettyFormat(data))

const formatVerbose = data => chalk.dim(format(data))
const formatError = data => chalk.red.bold(format(data))
const formatWarning = data => chalk.yellow(format(data))
const formatTitle = data => chalk.bold(format(data))
const formatInfo = data => format(data)
const formatSuccess = data => chalk.green(format(data))
const formatHeader = data => chalk.bold(format(data))

function verbose(data: any): void {
  if (process.env.VERBOSE) {
    console.log(StringUtils.lernaColaMsg(formatVerbose(data)))
  }
}

function verbosePkg(pkg: Package, data: any): void {
  if (process.env.VERBOSE) {
    console.log(StringUtils.packageMsg(pkg, formatVerbose(data)))
  }
}

function error(data: string, err?: Error): void {
  console.log(StringUtils.lernaColaMsg(formatError(data)))
  if (err && err.stack) {
    console.log(StringUtils.lernaColaMsg(err.stack))
  }
}

function errorPkg(pkg: Package, data: any, err?: Error): void {
  console.log(StringUtils.packageMsg(pkg, formatError(data)))
  if (err && err.stack) {
    console.log(StringUtils.packageMsg(pkg, err.stack))
  }
}

function warning(data: any): void {
  console.log(StringUtils.lernaColaMsg(formatWarning(data)))
}

function warningPkg(pkg: Package, data: any): void {
  console.log(StringUtils.packageMsg(pkg, formatWarning(data)))
}

function title(data: any): void {
  console.log(StringUtils.lernaColaMsg(formatTitle(data)))
}

function titlePkg(pkg: Package, data: any): void {
  console.log(StringUtils.packageMsg(pkg, formatTitle(data)))
}

function info(data: any): void {
  console.log(StringUtils.lernaColaMsg(formatInfo(data)))
}

function infoPkg(pkg: Package, data: any): void {
  console.log(StringUtils.packageMsg(pkg, formatInfo(data)))
}

function success(data: any): void {
  console.log(StringUtils.lernaColaMsg(formatSuccess(data)))
}

function successPkg(pkg: Package, data: any): void {
  console.log(StringUtils.packageMsg(pkg, formatSuccess(data)))
}

function header(data: any): void {
  console.log(StringUtils.lernaColaMsg(formatHeader(data)))
}

function headerPkg(pkg: Package, data: any): void {
  console.log(StringUtils.packageMsg(pkg, formatHeader(data)))
}

function multiSelect(
  message: string,
  options: MultiSelectOptions,
): Promise<Array<string>> {
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
