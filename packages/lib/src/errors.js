// @flow

import type { Package } from './types'

function LernaColaError(message: string) {
  this.name = 'LernaColaError'
  this.message = message
  this.stack = Error().stack
}

LernaColaError.prototype = Object.create(Error.prototype)
LernaColaError.prototype.name = 'LernaColaError'
LernaColaError.prototype.constructor = LernaColaError

function PackageError(pkg: Package, message: string, err: ?Error) {
  this.name = 'PackageError'
  this.message = message
  this.stack = err ? err.stack : Error().stack
}

PackageError.prototype = Object.create(Error.prototype)
PackageError.prototype.name = 'PackageError'
PackageError.prototype.constructor = PackageError

module.exports = {
  LernaColaError,
  PackageError,
}
