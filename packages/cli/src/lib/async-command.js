// @flow

const handleError = require('./handle-error')

module.exports = function asyncCommand(fn: (...any) => mixed) {
  return (...args: Array<any>) => {
    const [yargv] = args
    try {
      yargv.promisedResult = Promise.resolve(fn(...args)).catch(handleError)
      return yargv.promisedResult
    } catch (err) {
      handleError(err)
    }
    throw new Error(
      'Invalid state. Should not have reached this branch of code.',
    )
  }
}
