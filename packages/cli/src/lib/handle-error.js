// @flow

const { Errors, TerminalUtils } = require('@lerna-cola/lib')

const handleError = (err: Error) => {
  if (err instanceof Errors.PackageError) {
    TerminalUtils.errorPkg(err.pkg, err.message, err)
  } else {
    TerminalUtils.error(err.message, err)
  }

  process.exit(1)
}

module.exports = handleError
