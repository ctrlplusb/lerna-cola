// @flow

const buildPackage = require('./build-package')
const cleanPackages = require('./clean-packages')
const cleanPackage = require('./clean-package')
const getAllPackages = require('./get-all-packages')
const resolvePackages = require('./resolve-packages')

/**
 * The PackageUtils API
 */
const PackageUtils = {
  buildPackage,
  cleanPackages,
  cleanPackage,
  getAllPackages,
  resolvePackages,
}

module.exports = PackageUtils
