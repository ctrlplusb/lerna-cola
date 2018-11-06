// @flow

import type { Package } from '@lerna-cola/lib/build/types'

const semver = require('semver')
const { ArrayUtils, LogicUtils } = require('@lerna-cola/lib')

type Options = {
  nodeVersion?: string,
}

module.exports = function generateConfig(pkg: Package, options: Options = {}) {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV

  const targetNodeVersion = options.nodeVersion || process.versions.node

  return {
    babelrc: false,

    // Handy for sourcemaps generation.
    sourceRoot: pkg.paths.packageRoot,

    // Source maps will be useful for debugging errors in our node executions.
    sourceMaps: 'both',

    presets: ArrayUtils.removeNil<any>([
      [
        'env',
        {
          targets: {
            node: targetNodeVersion,
          },
        },
      ],

      // jsx && flow support
      'react',
    ]),

    plugins: ArrayUtils.removeNil<any>([
      // const { foo, ...others } = object
      // object = { foo, ...others }
      // This plugin uses Object.assign directly.
      [
        'transform-object-rest-spread',
        {
          // For node >= 6 we can rely on native Object.assign, else it will
          // need to be polyfilled.
          useBuiltIns: semver.major(targetNodeVersion) >= 6,
        },
      ],

      // function (
      //   arg1,
      //   arg2,
      // ) { }
      LogicUtils.onlyIf(
        semver.major(targetNodeVersion) < 8,
        'syntax-trailing-function-commas',
      ),

      // class { handleThing = () => { } }
      'transform-class-properties',

      // Compiles import() to a deferred require()
      'babel-plugin-dynamic-import-node',

      // Polyfills the runtime needed for async/await and generators.
      // async/await exists in Node 7.6.0 upwards
      LogicUtils.onlyIf(
        semver.lt(targetNodeVersion, '7.6.0'),
        'babel-plugin-transform-runtime',
      ),

      // Replaces the React.createElement function with one that is
      // more optimized for production.
      LogicUtils.onlyIf(
        env === 'production',
        'transform-react-inline-elements',
      ),

      // Hoists element creation to the top level for subtrees that
      // are fully static, which reduces call to React.createElement
      // and the resulting allocations. More importantly, it tells
      // React that the subtree hasn’t changed so React can completely
      // skip it when reconciling.
      LogicUtils.onlyIf(
        env === 'production',
        'transform-react-constant-elements',
      ),

      // Removes PropTypes code as it's just dead weight for a production build.
      LogicUtils.onlyIf(
        env === 'production',
        'babel-plugin-transform-react-remove-prop-types',
      ),

      // The following two plugins are currently necessary to make React warnings
      // include more valuable information. They are included here because they are
      // currently not enabled in babel-preset-react. See the below threads for more info:
      // https://github.com/babel/babel/issues/4702
      // https://github.com/babel/babel/pull/3540#issuecomment-228673661
      // https://github.com/facebookincubator/create-react-app/issues/989

      // Adds __self attribute to JSX which React will use for some warnings
      LogicUtils.onlyIf(
        env === 'development' || env === 'test',
        'transform-react-jsx-self',
      ),

      // Adds component stack to warning messages
      LogicUtils.onlyIf(
        env === 'development' || env === 'test',
        'transform-react-jsx-source',
      ),

      // If we are transpiling a node package then we inject some code to
      // include source maps support on the transpiled code.
      LogicUtils.onlyIf(env === 'development', 'inject-source-map-init'),
    ]),
  }
}
