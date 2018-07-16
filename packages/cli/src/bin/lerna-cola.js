#!/usr/bin/env node

// @flow
/* eslint-disable no-console */

const yargs = require('yargs')
const { TerminalUtils } = require('@lerna-cola/lib')
const buildCommand = require('../commands/build')
const cleanCommand = require('../commands/clean')
const developCommand = require('../commands/develop')
const deployCommand = require('../commands/deploy')
const preventScriptExit = require('../lib/prevent-script-exit')
const handleError = require('../lib/handle-error')

const onComplete = output => {
  if (output) {
    console.log(output)
  }
  process.exit(0)
}

const args = process.argv.slice(2)

yargs
  .command(buildCommand)
  .command(cleanCommand)
  .command(developCommand)
  .command(deployCommand)
  .demandCommand()
  .help('h')
  .alias('h', 'help')

if (args.length > 0) {
  yargs.parse(args, (err, argv, output) => {
    TerminalUtils.verbose(argv)
    if (argv.promisedResult) {
      TerminalUtils.verbose('Waiting for async command to complete...')
      argv.promisedResult.catch(handleError).then(onComplete)
    } else {
      if (err) {
        handleError(err)
      }
      onComplete(output)
    }
  })
} else {
  yargs.parse()
}

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

preventScriptExit()
