// @flow

const { EOL } = require('os')
const path = require('path')
const fs = require('fs-extra')
const ObjectUtils = require('../objects')
const TerminalUtils = require('../terminal')

const defaultAppConfig = {
  packages: ['packages/*'],
  publishing: {
    gitBranchName: 'master',
    gitRemoteName: 'origin',
    enableGitRemotePush: true,
    customRegistry: null,
  },
}

let cache

module.exports = function getConfig() {
  if (cache) {
    return cache
  }

  const configPath = path.resolve(process.cwd(), './lerna-cola.js')

  const configExists = fs.existsSync(configPath)

  if (!configExists) {
    TerminalUtils.info('No lerna-cola.js config was found. Using defaults.')
  }

  cache = ObjectUtils.mergeDeep(
    defaultAppConfig,
    configExists
      ? // $FlowFixMe
        require(configPath) // eslint-disable-line global-require,import/no-dynamic-require
      : {},
  )

  TerminalUtils.verbose(
    `Using app config:${EOL}${JSON.stringify(cache, null, 2)}`,
  )

  return cache
}
