// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'

type WebpackStats = {
  hasErrors: () => boolean,
  toString: Object => string,
}

/**
 * Extracts the webpack callback error.
 */
module.exports = function extractError(
  pkg: Package,
  err: ?Error,
  stats: WebpackStats,
) {
  if (err) {
    return `Fatal error attempting to bundle ${pkg.name}\n\n${err.toString()}`
  }
  if (stats.hasErrors()) {
    return stats.toString({ colors: true, chunks: false })
  }
  return undefined
}
