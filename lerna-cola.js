const flowProjectConfig = {
  buildPlugin: 'flow',
}

const packagesConfig = {
  'lerna-cola': flowProjectConfig,
  '@lerna-cola/lib': flowProjectConfig,
  '@lerna-cola/plugin-babel': flowProjectConfig,
  '@lerna-cola/plugin-flow': flowProjectConfig,
  '@lerna-cola/plugin-now': flowProjectConfig,
  '@lerna-cola/plugin-webpack': flowProjectConfig,
  '@lerna-cola/plugin-webpack-node': flowProjectConfig,
  '@lerna-cola/utils': {
    buildPlugin: [
      'babel',
      {
        nodeVersion: '4.8.3',
      },
    ],
  },
}

module.exports = {
  packageSources: ['packages/*'],
  packages: packagesConfig,
}
