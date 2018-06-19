/* eslint-disable camelcase */

const path = require('path')
const fs = require('fs-extra')

const requireFn =
  typeof __non_webpack_require__ !== 'undefined'
    ? // eslint-disable-next-line no-undef
      __non_webpack_require__
    : require

const cache = {}

/**
 * Gets the manifest for the lerna-cola web package by the given name.
 *
 * @param  {string} packageName The package's name
 * @return {Object}             The manifest
 */
module.exports = function getWebPackageManifest(
  packageName,
  basePath = './dist',
) {
  if (cache[packageName]) {
    return cache[packageName]
  }
  let distPath = path.resolve(
    process.cwd(),
    `./node_modules/${packageName}/${basePath}`,
  )
  let manifestFile = path.resolve(distPath, `./webpack-manifest.json`)
  if (!fs.existsSync(manifestFile)) {
    // lerna-cola app packageRoot path
    distPath = path.resolve(
      process.cwd(),
      `../../node_modules/${packageName}/${basePath}`,
    )
    manifestFile = path.resolve(distPath, `./webpack-manifest.json`)
    if (!fs.existsSync(manifestFile)) {
      throw new Error(`No manifest found at ${manifestFile}`)
    }
  }
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const manifest = requireFn(manifestFile)
  if (!manifest.index) {
    throw new Error(
      `Invalid lerna-cola web package manifest found at ${manifestFile}`,
    )
  }

  const jsParts = manifest.index.js
    .substr(manifest.index.js.indexOf('/lerna-cola/'))
    .split('/')
  const rootHttpPath = jsParts.slice(0, jsParts.length - 1).join('/')

  cache[packageName] = {
    serverPaths: {
      packageRoot: distPath,
    },
    httpPaths: {
      packageRoot: rootHttpPath,
      js: manifest.index.js,
      css: manifest.index.css,
    },
    manifest,
  }

  return cache[packageName]
}
