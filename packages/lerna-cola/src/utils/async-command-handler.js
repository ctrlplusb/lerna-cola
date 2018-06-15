module.exports = function asyncCommandHandler(fn) {
  return (...args) => {
    const [yargv] = args
    yargv.promisedResult = fn(...args)
    return yargv.promisedResult
  }
}
