// @flow

import type {
  Package,
  PackageWatcher,
  DevelopInstance,
} from 'lerna-cola-dev-utils/build/types'

const webpack = require('webpack')
const getPort = require('get-port')
const WebpackDevServer = require('webpack-dev-server')
const { TerminalUtils } = require('lerna-cola-dev-utils')
const extractError = require('./extract-error')
const generateConfig = require('./generate-config')

const devInstanceMap = {}

const killDevServerFor = pkg => {
  const devInstance = devInstanceMap[pkg.name]
  if (!devInstance) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    devInstance.webpackDevServer.close(() => {
      delete devInstanceMap[pkg.name]
      resolve()
    })
  })
}

module.exports = function develop(
  pkg: Package,
  watcher: PackageWatcher,
): Promise<DevelopInstance> {
  const devInstance = devInstanceMap[pkg.name]
  if (devInstance) {
    return Promise.resolve(devInstance.api)
  }

  return getPort()
    .then(port => {
      TerminalUtils.verbosePkg(
        pkg,
        `Found free port ${port} for webpack dev server`,
      )
      return new Promise((resolve, reject) => {
        let hasResolved = false
        let showNextSuccess = false

        const config = generateConfig(pkg, { devServerPort: port })
        const compiler = webpack(config)

        const server = new WebpackDevServer(compiler, config.devServer)
        server.listen(port, '0.0.0.0', () => {
          TerminalUtils.verbosePkg(
            pkg,
            `Web dev server listening on http://0.0.0.0:${port}`,
          )
        })

        TerminalUtils.info(`Building ${pkg.name}`)

        compiler.plugin('done', doneStats => {
          const doneError = extractError(pkg, null, doneStats)
          if (doneError && hasResolved) {
            TerminalUtils.errorPkg(
              pkg,
              `Please fix the following issue:\n\n${doneError}`,
            )
            showNextSuccess = hasResolved && true
          } else {
            TerminalUtils[showNextSuccess ? 'success' : 'verbose'](
              `${pkg.name} is good again`,
            )
            showNextSuccess = false
          }
          if (!hasResolved) {
            // This can only be the first time the plugin has run, and therefore
            // represents the bootstrapping of the web-dev-server. If it failed
            // then we should kill any running web dev server and reject
            // the promise to ensure that no dependencies get run.
            hasResolved = true
            if (doneError) {
              if (server) {
                try {
                  server.close(() => {
                    reject(doneError)
                  })
                } catch (err) {
                  TerminalUtils.verbosePkg(
                    pkg,
                    'Could not close existing web-dev-server',
                  )
                  TerminalUtils.verbose(err)
                  reject(doneError)
                }
              } else {
                reject(doneError)
              }
            } else {
              resolve(server)
            }
          }
        })
      })
    })
    .then(webpackDevServer => {
      // No need for the watcher now as webpack-dev-server has an inbuilt
      // watcher.
      watcher.stop()
      return webpackDevServer
    })
    .catch(err => {
      // Ensure we fire up the watcher again so that we can track when the
      // issue is fixed.
      watcher.start()
      // Throw the error along
      throw err
    })
    .then(webpackDevServer => {
      const api = {
        kill: () => killDevServerFor(pkg),
      }
      devInstanceMap[pkg.name] = {
        api,
        webpackDevServer,
      }
      return api
    })
}
