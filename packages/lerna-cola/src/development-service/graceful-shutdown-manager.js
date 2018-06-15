// @flow

const R = require('ramda')
const { TerminalUtils, AppUtils } = require('lerna-cola-dev-utils')

module.exports = function gracefulShutdownManager(
  packageDevelopConductors,
  packageWatchers,
) {
  let shuttingDown = false
  let postDevelopRun = false

  const appConfig = AppUtils.getConfig()
  const postDevelopHook = R.path(['commands', 'develop', 'pre'], appConfig)

  const ensurePostDevelopHookRun = async () => {
    if (postDevelopHook && !postDevelopRun) {
      TerminalUtils.info('Running post develop hook')
      await postDevelopHook()
    }
    postDevelopRun = true
  }

  async function performGracefulShutdown(exitCode) {
    // Avoid multiple calls (e.g. if ctrl+c pressed multiple times)
    if (shuttingDown) return
    shuttingDown = true
    try {
      TerminalUtils.info('Shutting down development service...')

      // This will ensure that the process exits after a 10 second grace period.
      // Hopefully all the dispose functions below would have completed
      setTimeout(async () => {
        TerminalUtils.verbose('Forcing shutdown after grace period')
        setTimeout(() => {
          TerminalUtils.warning(
            'Your post develop hook seems to be taking a long time to complete.  10 seconds have passed so we are now forcing an exit on the develop process.',
          )
          process.exit(1)
        }, 10 * 1000)
        // Even if we are forcing an exit we should wait for pross develop
        // hook to execute
        await ensurePostDevelopHookRun()
        process.exit(1)
      }, 10 * 1000)

      // Firstly kill all our packageWatchers.
      Object.keys(packageWatchers).forEach(packageName =>
        packageWatchers[packageName].stop(),
      )

      // Then call off the `.stop()` against all our package conductors.
      await Promise.all(
        R.values(packageDevelopConductors).map(packageDevelopConductor =>
          packageDevelopConductor.stop(),
        ),
      )

      // Then call the post develop hook
      await ensurePostDevelopHookRun()
    } catch (err) {
      TerminalUtils.error(
        'An error occurred whilst shutting down the development service',
        err,
      )
      process.exit(1)
    }
    process.exit(exitCode)
  }

  // Ensure that we perform a graceful shutdown when any of the following
  // signals are sent to our process.
  ;['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      TerminalUtils.verbose(`Received ${signal} termination signal`)
      performGracefulShutdown(0)
    })
  })

  process.on('unhandledRejection', err => {
    TerminalUtils.error('Unhandled error.', err)
    performGracefulShutdown(1)
  })

  process.on('exit', () => {
    performGracefulShutdown(0)
    TerminalUtils.info('Till next time. *kiss*')
  })
}
