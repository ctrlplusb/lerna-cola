// @flow

const R = require('ramda')

/**
 * Filters out all null/undefined items from the given array.
 *
 * @param  {Array} as - the target array
 *
 * @return {Array} The filtered array.
 */
function removeNil<T>(as: Array<T>): Array<T> {
  return as.filter(a => a != null)
}

function removeEmpty(as: Array<string>): Array<string> {
  return as.filter(a => R.not(R.isEmpty(a)))
}

module.exports = {
  removeNil,
  removeEmpty,
}
