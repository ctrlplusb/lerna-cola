// @flow

module.exports = function asyncCommandHandler(fn: (...any) => mixed) {
  return (...args: Array<any>) => {
    const [yargv] = args
    yargv.promisedResult = fn(...args)
    return yargv.promisedResult
  }
}
