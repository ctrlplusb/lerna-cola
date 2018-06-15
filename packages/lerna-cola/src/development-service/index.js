// @flow

/* eslint-disable no-use-before-define */

import type { Package } from 'lerna-cola-dev-utils/build/types'

const R = require('ramda')
const {
  TerminalUtils,
  AppUtils,
  PackageUtils,
} = require('lerna-cola-dev-utils')
const createPackageConductor = require('./create-package-conductor')
const createPackageWatcher = require('./create-package-watcher')
const gracefulShutdownManager = require('./graceful-shutdown-manager')

module.exports = async function developmentService() {
  // Keep this message up here so it always comes before any others
  TerminalUtils.info('Press CTRL + C to exit')

  const appConfig = AppUtils.getConfig()
  const preDevelopHook = R.path(['commands', 'develop', 'pre'], appConfig)

  if (preDevelopHook) {
    TerminalUtils.info('Running the pre develop hook')
    await preDevelopHook()
  }

  const packages = await PackageUtils.getAllPackages()
  const packagesArray = R.values(packages)

  // Firstly clean build for all packages
  await PackageUtils.cleanPackages(packagesArray)

  // Represents the current package being built
  let currentlyProcessing = null

  // Represents the build backlog queue. FIFO.
  let toProcessQueue: Array<Package> = []

  // :: Package -> Package -> bool
  const packageHasDependant = R.curry(
    (dependant: Package, pkg: Package): boolean =>
      R.contains(dependant.name, pkg.dependants),
  )

  // :: Package -> Array<Package>
  const getPackageDependants = pkg => pkg.dependants.map(name => packages[name])

  // :: Package -> void -> void
  const onChange = pkg => () => {
    queuePackageForProcessing(pkg)
    // If no active build running then we will call off to run next item in
    // the queue.
    if (!currentlyProcessing) {
      processNextInTheQueue()
    }
  }

  // :: Object<string, PackageWatcher>
  const packageWatchers = packagesArray.reduce(
    (acc, pkg) =>
      Object.assign(acc, {
        [pkg.name]: createPackageWatcher(onChange(pkg), pkg),
      }),
    {},
  )

  // :: Object<string, PackageDevelopConductor>
  const packageDevelopConductors = packagesArray.reduce(
    (acc, pkg) =>
      Object.assign(acc, {
        [pkg.name]: createPackageConductor(pkg, packageWatchers[pkg.name]),
      }),
    {},
  )

  const queuePackageForProcessing = packageToQueue => {
    TerminalUtils.verbose(`Attempting to queue ${packageToQueue.name}`)
    if (
      currentlyProcessing !== null &&
      packageHasDependant(packageToQueue, currentlyProcessing)
    ) {
      // Do nothing as the package currently being built will result in this
      // package being built via it's dependancy chain.
      TerminalUtils.verbosePkg(
        packageToQueue,
        `Skipping development service queue as represented by a queued package`,
      )
    } else if (R.any(packageHasDependant(packageToQueue), toProcessQueue)) {
      // Do nothing as one of the queued packagesToDevelop will result in this package
      // getting built via it's dependancy chain.
      TerminalUtils.verbosePkg(
        packageToQueue,
        `Skipping development service queue as represented by a queued package`,
      )
    } else {
      // Queue the package for building.
      TerminalUtils.verbose(`Queuing ${packageToQueue.name}`)
      const packageDependants = getPackageDependants(packageToQueue)
      // We'll assign the package to the build queue, removing any of the
      // package's dependants as they will be represented by the package being
      // added.
      toProcessQueue = R.without(packageDependants, toProcessQueue).concat([
        packageToQueue,
      ])
      TerminalUtils.verbose(
        `Queue: [${toProcessQueue.map(x => x.name).join(',')}]`,
      )
    }
  }

  const processPackage = pkg => {
    currentlyProcessing = pkg
    const packageDevelopConductor = packageDevelopConductors[pkg.name]
    if (!packageDevelopConductor) {
      TerminalUtils.error(
        `Did not run develop process for ${
          pkg.name
        } as there is no package develop conductor registered for it`,
      )
      return
    }
    packageDevelopConductor
      // Kick off the develop of the package
      .start()
      // Develop kickstart succeeded 🎉
      .then(() => ({ success: true }))
      // Or, failed 😭
      .catch(err => {
        TerminalUtils.errorPkg(
          pkg,
          `An error occurred whilst trying to start development instance.`,
          err,
        )
        return { success: false }
      })
      // Finally...
      .then(({ success }) => {
        // Ensure any current is removed
        currentlyProcessing = null

        // If the build succeeded we will queue dependants
        if (success) {
          TerminalUtils.verbosePkg(
            pkg,
            `Develop process ran successfully, queueing dependants...`,
          )
          const packageDependants = getPackageDependants(pkg)
          packageDependants.forEach(queuePackageForProcessing)
        }

        // We will call off the next item to be processe even if a failure
        // occurred. This is because any items in the queue likely are not
        // dependants of this failed package (due to the logic contained within
        // the queueing function).
        processNextInTheQueue()
      })
  }

  const processNextInTheQueue = () => {
    if (currentlyProcessing) {
      TerminalUtils.error(
        `Tried to process the next Package in the queue even though there is a Package being processed: ${currentlyProcessing}`,
      )
      return
    }
    TerminalUtils.verbose('Popping the queue')
    if (toProcessQueue.length > 0) {
      // Pop the queue.
      const nextToProcess = toProcessQueue[0]
      toProcessQueue = toProcessQueue.slice(1)
      TerminalUtils.verbose(`Popped ${nextToProcess.name}`)
      processPackage(nextToProcess)
    } else {
      TerminalUtils.verbose('Nothing to pop')
    }
  }

  // READY...
  packagesArray.forEach(queuePackageForProcessing)

  // SET...
  Object.keys(packageWatchers).forEach(packageName =>
    packageWatchers[packageName].start(),
  )

  // GO! 🚀
  processNextInTheQueue()

  // Ensure graceful shutting down:
  gracefulShutdownManager(packageDevelopConductors, packageWatchers)

  return new Promise(() => {
    // Never resolve as we are going to wait to CTRL + C to exit.
  })
}
