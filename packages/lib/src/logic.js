// @flow

const R = require('ramda')

function execIfFunc<T>(x: T | (() => T)): ?T {
  return typeof x === 'function' ? x() : x
}

const onlyIf = R.curry(function onlyIfUncurried<T>(
  condition: boolean | (() => boolean),
  value: T | (() => T),
): ?T {
  return execIfFunc(condition) ? execIfFunc<T>(value) : undefined
})

module.exports = {
  onlyIf,
}
