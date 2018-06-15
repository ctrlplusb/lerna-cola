// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'

const { ArrayUtils, LogicUtils } = require('lerna-cola-dev-utils')

// :: Options -> BabelConfig
module.exports = function generateConfig(pkg: Package) {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV
  return {
    babelrc: false,

    // Handy for sourcemaps generation.
    sourceRoot: pkg.paths.packageRoot,

    presets: ArrayUtils.removeNil([
      [
        'env',
        {
          targets: {
            // React parses on ie 9, so we should too
            ie: 9,
            // We currently minify with uglify
            // Remove after https://github.com/mishoo/UglifyJS2/issues/448
            uglify: true,
          },
          // Disable polyfill transforms
          // useBuiltIns: false,
          // Do not transform modules to CJS
          modules: false,
        },
      ],

      // jsx && flow support
      'react',
    ]),

    plugins: ArrayUtils.removeNil([
      // const { foo, ...others } = object
      // object = { foo, ...others }
      // This plugin uses Object.assign directly.
      ['transform-object-rest-spread'],

      // function (
      //   arg1,
      //   arg2,
      // ) { }
      'syntax-trailing-function-commas',

      // class { handleThing = () => { } }
      'transform-class-properties',

      // Adds syntax support for import(), which webpack can handle
      'babel-plugin-syntax-dynamic-import',

      // Polyfills the runtime needed for async/await and generators.
      'babel-plugin-transform-runtime',

      // Replaces the React.createElement function with one that is
      // more optimized for production.
      // NOTE: Relies on Symbol being available.
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
    ]),
  }
}
