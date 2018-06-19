// @flow

import type { Package } from '../types'

const pSeries = require('p-series')
const cleanPackage = require('./clean-package')

module.exports = async function cleanPackages(
  packages: Array<Package>,
): Promise<void> {
  await pSeries(packages.map(p => () => cleanPackage(p)))
}
