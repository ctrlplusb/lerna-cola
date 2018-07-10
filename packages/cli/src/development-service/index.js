// @flow

/* eslint-disable no-use-before-define */

import type {
  RunType,
  Package,
  PackageConductor,
  PackageWatcher,
} from '@lerna-cola/lib/build/types'

const { config, TerminalUtils, PackageUtils } = require('@lerna-cola/lib')
const createPackageConductor = require('./create-package-conductor')
const createPackageWatcher = require('./create-package-watcher')
const gracefulShutdownManager = require('./graceful-shutdown-manager')

type QueueItem = {
  package: Package,
  runType: RunType,
  changedDependency?: Package,
}

type Options = {
  packagesFilter?: Array<string>,
  selectPackages?: boolean,
}

module.exports = async function developmentService({
  packagesFilter,
  selectPackages,
}: Options) {
  // Keep this message up here so it always comes before any others
  TerminalUtils.info('Press CTRL + C to exit')

  const preDevelopHook = config().commandHooks.develop.pre

  TerminalUtils.info('Running the pre develop hook')
  await preDevelopHook()

  const filteredPackages = PackageUtils.filterPackages(packagesFilter)

  TerminalUtils.verbose(`Developing packages:`)
  TerminalUtils.verbose(filteredPackages.map(x => x.name))

  const packages = selectPackages
    ? // Ask which packages to develop if the select option was enabled
      (await TerminalUtils.multiSelect(
        'Which packages would you like to deploy?',
        {
          choices: filteredPackages.map(x => ({
            value: x.name,
            text: `${x.name} (${x.version})`,
          })),
        },
      )).map(x => config().packageMap[x])
    : // Else use the filtered packages
      filteredPackages

  // Firstly clean build for all packages
  await PackageUtils.cleanPackages(packages)

  // Represents the current package being built
  let currentlyProcessing = null

  // Represents the build backlog queue. FIFO.
  // We will queue all the packages for the first run
  let toProcessQueue: Array<QueueItem> = packages.map(pkg => ({
    package: pkg,
    runType: 'FIRST_RUN',
  }))

  const packageHasDependant = (dependant: Package, pkg: Package): boolean =>
    pkg.dependants.includes(dependant.name)

  const getPackageDependants = (pkg: Package): Array<Package> =>
    pkg.dependants.map(name => config().packageMap[name])

  const onChange = (pkg: Package) => (): void => {
    queuePackageForProcessing(pkg, 'SELF_CHANGED')
    // If no active build running then we will call off to run next item in
    // the queue.
    if (!currentlyProcessing) {
      processNextInTheQueue()
    }
  }

  /**
   * Package watches are responsible for watching the source of the packages
   * and then notifying of changes so that packages can be queued to be
   * processed.
   */
  const packageWatchers: {
    [key: string]: PackageWatcher,
  } = packages.reduce(
    (acc, pkg) =>
      Object.assign(acc, {
        [pkg.name]: createPackageWatcher(onChange(pkg), pkg),
      }),
    {},
  )

  /**
   * Package develop conductors are responsible for calling the respective
   * develop plugins for packages when changes occur. They manage any
   * child processes that are spawned, ensuring there is only a single
   * child process per package.
   */
  const packageDevelopConductors: {
    [key: string]: PackageConductor,
  } = packages.reduce(
    (acc, pkg) =>
      Object.assign(acc, {
        [pkg.name]: createPackageConductor(pkg, packageWatchers[pkg.name]),
      }),
    {},
  )

  /**
   * Queues an item of processing. This will be sensitive to items already
   * in the queue.
   *
   * @param {*} packageToQueue
   *   The package to queue
   * @param {*} runType
   *   The change that cause the queueing of the item.
   * @param {*} changedDependency
   *   If it was caused by a dependency changing then this is the dependency
   *   that changed.
   */
  const queuePackageForProcessing = (
    packageToQueue: Package,
    runType: RunType,
    changedDependency?: Package,
  ): void => {
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
    } else if (
      toProcessQueue.some(queueItem =>
        packageHasDependant(packageToQueue, queueItem.package),
      )
    ) {
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
      toProcessQueue = toProcessQueue
        .filter(
          queueItem =>
            !packageDependants.find(pkg => pkg.name === queueItem.package.name),
        )
        .concat([{ package: packageToQueue, runType, changedDependency }])
      TerminalUtils.verbose(
        `Queue: [${toProcessQueue.map(x => x.package.name).join(',')}]`,
      )
    }
  }

  /**
   * Processes a package in the queue, and if successfully processed it will
   * queue the packages dependencies.
   */
  const processQueueItem = (queueItem: QueueItem): void => {
    currentlyProcessing = queueItem.package
    const packageDevelopConductor =
      packageDevelopConductors[queueItem.package.name]
    if (!packageDevelopConductor) {
      TerminalUtils.error(
        `Did not run develop process for ${
          queueItem.package.name
        } as there is no package develop conductor registered for it`,
      )
      return
    }
    packageDevelopConductor
      // Kick off the develop of the package
      .run(queueItem.runType, queueItem.changedDependency)
      // Develop kickstart succeeded 🎉
      .then(() => ({ success: true }))
      // Or, failed 😭
      .catch(err => {
        TerminalUtils.errorPkg(
          queueItem.package,
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
            queueItem.package,
            `Develop process ran successfully, queueing dependants...`,
          )
          const packageDependants = getPackageDependants(
            queueItem.package,
          ).filter(
            dependant =>
              !toProcessQueue.some(
                queued => queued.package.name === dependant.name,
              ),
          )
          packageDependants.forEach(dep =>
            queuePackageForProcessing(
              dep,
              'DEPENDENCY_CHANGED',
              queueItem.package,
            ),
          )
        }

        // We will call off the next item to be processe even if a failure
        // occurred. This is because any items in the queue likely are not
        // dependants of this failed package (due to the logic contained within
        // the queueing function).
        processNextInTheQueue()
      })
  }

  const processNextInTheQueue = (): void => {
    if (currentlyProcessing) {
      TerminalUtils.error(
        `Tried to process the next Package in the queue even though there is a Package being processed: ${
          currentlyProcessing.name
        }`,
      )
      return
    }
    TerminalUtils.verbose('Popping the queue')
    if (toProcessQueue.length > 0) {
      // Pop the queue.
      const nextToProcess = toProcessQueue[0]
      toProcessQueue = toProcessQueue.slice(1)
      TerminalUtils.verbose(`Popped ${nextToProcess.package.name}`)
      processQueueItem(nextToProcess)
    } else {
      TerminalUtils.verbose('Nothing to pop')
    }
  }

  // READY, SET...
  Object.keys(packageWatchers).forEach(packageName =>
    packageWatchers[packageName].start(),
  )

  // GO! 🚀
  processNextInTheQueue()

  // Ensure graceful shutting down
  gracefulShutdownManager(packageDevelopConductors, packageWatchers)

  return new Promise(() => {
    // Never resolve as we are going to wait to CTRL + C to exit.
  })
}
