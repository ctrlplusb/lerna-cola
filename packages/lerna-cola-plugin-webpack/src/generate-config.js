// @flow

import type { Package } from 'lerna-cola-dev-utils/build/types'

const webpack = require('webpack')
const path = require('path')
const AssetsPlugin = require('assets-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const autoprefixer = require('autoprefixer')
const { ArrayUtils, LogicUtils } = require('lerna-cola-dev-utils')
const generateBabelConfig = require('./generate-babel-config')

type Options = {
  devServerPort?: number,
}

module.exports = function generateConfig(pkg: Package, options: Options = {}) {
  const { devServerPort } = options

  const env = process.env.NODE_ENV

  const webpackConfig = {
    // Keep quiet in dev mode.
    stats: LogicUtils.onlyIf(env === 'development', 'none'),

    target: 'web',

    entry: {
      // We name it "index" to make it easy to resolve the entry files within
      // the bundled output.
      index: [
        // The application source entry.
        pkg.paths.packageEntryFile,
      ],
    },

    output: {
      // The dir in which our bundle should be output.
      path: pkg.paths.packageBuildOutput,

      // The filename format for the entry chunk.
      // eslint-disable-next-line no-nested-ternary
      filename:
        env === 'production'
          ? // For a production build of a web target we want a cache busting
            // name format.
            '[name]-[chunkhash].js'
          : // Else we use a predictable name format.
            '[name].js',

      // The name format for any additional chunks produced for the bundle.
      chunkFilename:
        env === 'development' ? '[name]-[hash].js' : '[name]-[chunkhash].js',

      publicPath:
        env === 'development' && !!devServerPort
          ? // As we run a seperate webpack-dev-server in development we need an
            // absolute http path for the public path.
            `http://0.0.0.0:${devServerPort}/lerna-cola/${pkg.name}/`
          : `/lerna-cola/${pkg.name}/`,

      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: env === 'development',

      libraryTarget: 'var',
    },

    resolve: {
      extensions: ['.js', '.json', '.jsx'],
      modules: ['node_modules', pkg.paths.monoRepoRootNodeModules],
    },

    // Source map settings.
    devtool:
      env === 'development'
        ? // Produces an external source map (lives next to bundle output files).
          'source-map'
        : // Produces no source map.
          'hidden-source-map',
    // Only maps line numbers
    // 'cheap-eval-source-map',

    // https://webpack.js.org/configuration/performance/
    performance: {
      hints: env === 'development' ? false : 'warning',
    },

    plugins: ArrayUtils.removeNil([
      new webpack.EnvironmentPlugin({
        // It is really important to use NODE_ENV=production in order to use
        // optimised versions of some node_modules, such as React.
        NODE_ENV: env,
        // This may be handy for someone...
        CONSTELLATE_IS_WEBPACK: JSON.stringify(true),
      }),

      // Generates a JSON file containing a map of all the output files for
      // our webpack bundle.
      new AssetsPlugin({
        filename: 'webpack-manifest.json',
        path: pkg.paths.packageBuildOutput,
      }),

      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

      // This makes debugging much easier as webpack will add filenames to
      // modules
      LogicUtils.onlyIf(
        env === 'development',
        () => new webpack.NamedModulesPlugin(),
      ),

      // For our production web targets we need to make sure we pass the required
      // configuration to ensure that the output is minimized/optimized.
      LogicUtils.onlyIf(
        env === 'production',
        () =>
          new webpack.optimize.UglifyJsPlugin({
            // sourceMap: config('includeSourceMapsForOptimisedClientBundle'),
            compress: {
              screw_ie8: true,
              warnings: false,
            },
            mangle: {
              screw_ie8: true,
            },
            output: {
              comments: false,
              screw_ie8: true,
            },
          }),
      ),

      // For our production web targets we need to make sure we pass the required
      // configuration to ensure that the output is minimized/optimized.
      LogicUtils.onlyIf(
        env === 'production',
        () =>
          new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: process.env.DEBUG === 'true',
          }),
      ),

      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebookincubator/create-react-app/issues/240
      LogicUtils.onlyIf(
        env === 'development',
        () => new CaseSensitivePathsPlugin(),
      ),

      // TODO: Look at how this would work with yarn workspaces
      /*
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebookincubator/create-react-app/issues/186
      LogicUtils.onlyIf(
        env === 'development',
        () => new WatchMissingNodeModulesPlugin(package.paths.packageNodeModules),
      ),
      */

      // We don't want webpack errors to occur during development as it will
      // kill our dev servers.
      LogicUtils.onlyIf(
        env === 'development',
        () => new webpack.NoEmitOnErrorsPlugin(),
      ),

      // We need this plugin to enable hot reloading of our client.
      LogicUtils.onlyIf(
        env === 'development',
        () => new webpack.HotModuleReplacementPlugin(),
      ),

      // For a production build of a web target we need to extract the CSS into
      // CSS files.
      LogicUtils.onlyIf(
        env === 'production',
        () =>
          new ExtractTextPlugin({
            filename: '[name].[contenthash:8].css',
            allChunks: true,
          }),
      ),

      // This will inject the module.hot.accept code in the entry file for our
      // development build.
      LogicUtils.onlyIf(
        env === 'development',
        () =>
          // eslint-disable-next-line global-require
          new (require('./plugins/InjectHMRCodeForEntryModule.js'))({
            entryFile: pkg.paths.packageEntryFile,
          }),
      ),
    ]),

    module: {
      rules: ArrayUtils.removeNil([
        {
          test: /\.js$/,
          use: [
            {
              loader: require.resolve('cache-loader'),
              options: {
                cacheDirectory: pkg.paths.packageWebpackCache,
              },
            },
            {
              loader: require.resolve('babel-loader'),
              options: generateBabelConfig(pkg),
            },
          ],
          include: [pkg.paths.packageRoot],
          exclude: [pkg.paths.packageNodeModules, pkg.paths.packageBuildOutput],
        },

        {
          test: /\.(jpg|jpeg|png|gif|ico|eot|svg|ttf|woff|woff2|otf|mp4|mp3|ogg|swf|webp)$/,
          loader: require.resolve('url-loader'),
          options: {
            // We only emit files when building a web bundle, node bundles only
            // need the file paths.
            emitFile: true,
            // Any files under this size will be "inlined" as a base64 encoding.
            limit: 10000,
          },
        },

        // For development web targets we will use the style loader which will
        // allow hot reloading of the CSS.
        LogicUtils.onlyIf(env === 'development', () => ({
          test: /\.css$/,
          loader: [
            require.resolve('style-loader'),
            {
              loader: require.resolve('css-loader'),
              options: {
                importLoaders: 1,
                // Include sourcemaps for dev experience++.
                sourceMap: true,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                ident: 'postcss',
                plugins: () => [
                  autoprefixer({
                    browsers: [
                      '>1%',
                      'last 4 versions',
                      'Firefox ESR',
                      'not ie < 9',
                    ],
                  }),
                ],
              },
            },
          ],
          include: [pkg.paths.packageRoot, pkg.paths.monoRepoRootNodeModules],
          exclude: [pkg.paths.packageBuildOutput],
        })),

        // For a production web target we use the ExtractTextPlugin which
        // will extract our CSS into CSS files.
        // Note: The ExtractTextPlugin needs to be registered within the
        // plugins section too.
        LogicUtils.onlyIf(env === 'production', () => ({
          test: /\.css$/,
          loader: ExtractTextPlugin.extract({
            fallback: require.resolve('style-loader'),
            use: [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                },
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  ident: 'postcss',
                  plugins: () => [
                    autoprefixer({
                      browsers: [
                        '>1%',
                        'last 4 versions',
                        'Firefox ESR',
                        'not ie < 9',
                      ],
                    }),
                  ],
                },
              },
            ],
          }),
          include: [pkg.paths.packageRoot, pkg.paths.monoRepoRootNodeModules],
          exclude: [pkg.paths.packageBuildOutput],
        })),
      ]),
    },
  }

  if (env === 'development' && !!devServerPort) {
    webpackConfig.entry.index = [
      `${path.dirname(
        require.resolve('webpack-dev-server/package.json'),
      )}/client?http://0.0.0.0:${devServerPort}`,
      `${path.dirname(require.resolve('webpack/package.json'))}/hot/dev-server`,
      ...webpackConfig.entry.index,
    ]

    // For web target packages we rely on webpack-dev-server, but will provide
    // the configuration here to make our configuration more centralised.
    webpackConfig.devServer = {
      host: '0.0.0.0',
      port: devServerPort,
      disableHostCheck: true,
      contentBase: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      compress: true,
      publicPath: webpackConfig.output.publicPath,
      noInfo: true,
      quiet: true,
      historyApiFallback: true,
      hot: true,
      // Will show compile errors in browser.
      overlay: true,
      watchOptions: {
        // Watching too many files can result in high CPU/memory usage.
        // We will manually control reloads based on dependency changes.
        ignored: /node_modules/,
        // TODO: Allow watching of any dependencies that are lerna-cola packages.
      },
    }
  }

  return webpackConfig
}
