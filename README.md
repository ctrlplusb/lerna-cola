> **Work in Progress** 👀
>
> lerna-cola is being built in parallel to a large scale production grade project, thereby getting some serious dogfooding in order to work out the kinks and settle on a useful API. Whilst we have made a lot of progress this is still very much an alpha version of the project.

---

# Lerna Cola 🥤

Superpowers for your [Lerna](https://lernajs.io/) monorepos.

Build, develop, and deploy your packages utilising a rich plugin ecosystem.

## TOC

- [Introduction](#introduction)
- [Requirements](#requirements)
- [(Not Really) Requirements](#not-really-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Example Configuration](#example-configuration)
  - [Configuration Schema](#configuration-schema)
- [CLI Commands](#cli-commands)
  - [build](#build)
  - [develop](#develop)
  - [deploy](#deploy)
- [Plugins](#plugins)
  - [Core Plugins](#core-plugins)
  - [Official Plugins](#official-plugins)
  - [3rd Party Plugins](#3rd-party-plugins)
- [Plugin Development](#plugin-development)

## Introduction

[Lerna](https://lernajs.io/) makes it crazy easy to manage cross package dependencies and provides sane methods to version them. It takes away the fear of creating and maintaining packages allowing us to fully embrace the Node.js module ethos of creating packages with isolated responsibilities.

Lerna Cola wants to build on top of these core principles by providing the following additional features:

- Easily **enrich your packages** with a **compilation/transpilation/bundling** step (babel/flow/typescript/reasonml/webpack/parcel/etc/etc/etc).
- Take away the fear of building a wide set of **microservices/lambda packages** by providing a **rich development service** that handles **hot/auto reloading** of your packages. This allows for a **fluid development experience** reminiscent of old school single package/repository based development.
- **Deploy** your packages with a simple command to a **cloud provider** of your choice.

You access the features via one of the 3 CLI commands that Lerna Cola provides: [`build`](#build), [`develop`](#develop), and [`deploy`](#deploy).

The commands utilise a rich plugin eco-system, allowing for 3rd party contributions.

Lift your build, development and deployment configurations to the root of your monorepo, keep your packages clean, and utilise the full benefits of a monorepo structure.

## Requirements

- **Node >= 8**

  Version 8 was LTS at the time of writing this so a decision was made to run with it. This of course is only a requirement for the `lerna-cola` CLI, your packages can have their own individual engine requirements.

## (Not Really) Requirements

- **[Lerna](https://lernajs.io/)**

  To tell you the truth, we don't strictly require that you use Lerna. You could very well use straight up Yarn workspaces, but in our opinion you would be missing out on some cool features. We very very very much recommend that you use this library in conjunction with Lerna.

## Installation

Simply add the Lerna Cola CLI package as a dev dependency to the root of your monorepo:

```bash
yarn add @lerna-cola/cli -DW
```

_or, via NPM_:

```bash
npm i @lerna-cola/cli -D
```

## Configuration

To fully utilise Lerna Cola you need to create a configuration file named `lerna-cola.json`, or `lerna-cola.js`, to the root of your project.

When creating a `.js` file ensure you export the configuration object via `module.exports`.

### Example Configuration

Before we describe the configuration schema, we'll introduce an example:

```json
{
  "packages": {
    // The following two packages are microservices where we are using the babel
    // plugin to transpile them to support our current node version, and the
    // server develop plugin which will take care of executing and restarting
    // our microservices for any changes up their dependency trees.
    "my-microservice-1": {
      "buildPlugin": {
        "name": "@lerna-cola/plugin-build-babel",
        "config": {
          "presets": ["babel-preset-env"]
        }
      },
      "developPlugin": "core-plugin-develop-server"
    },
    "my-microservice-1": {
      "buildPlugin": {
        "name": "@lerna-cola/plugin-build-babel",
        "config": {
          "presets": ["babel-preset-env"]
        }
      },
      "developPlugin": "core-plugin-develop-server"
    },
    // The following package is a "Create React App" package which comes with
    // it's own build and develop (start) scripts. We will therefore use the
    // Lerna Cola script plugin to delegate to the CRA scripts.
    "my-ui": {
      "buildPlugin": {
        "name": "core-plugin-script",
        "options": {
          "scriptName": "build"
        }
      },
      "developPlugin": {
        "name": "core-plugin-script",
        "options": {
          "scriptName": "start"
        }
      }
    }
  }
}
```

Within this example we are providing a Lerna Cola configuration for 3 of our packages within our monorepo. We need not provide a configuration for every package within our monorepo; only the ones that we wish to execute Lerna Cola plugins against. Lerna Cola will still be aware of the other packages within our repo, for example providing hot reloading on our servers/apps when a change occurs on our shared utils package.

In our example we have two microservices that will be Babel transpiled by the [`build`](#build) command, and will be treated as server process (with execution and hot reloading) by the [`develop`](#develop) command. The third package configuration utilities a special [Create React App](https://TODO) plugin that contains configuration for both the [`build`](#build) and [`develop`](#develop) commands.

This is a very basic example, however, it is illustrative of how quickly you can provide a centralised and coordinated configuration for your monorepo packages. Plugins can of course be customised via options. We recommend you read the [plugin](#plugins) docs for detailed information on them.

### Configuration Schema

The configuration is an Object/JSON structure that supports the following schema:

- `packages` (_Object_, **_optional_**)

  An object where each key is the name of a package within your repository (matching the name of the package within the package's `package.json` file). The value against each key is considered a package configuration object, supporting the following schema:

  - `buildPlugin` (_string_ || _Object_, **_optional_**)

    The plugin to use when building the package.

  - `developPlugin` (_string_ || _Object_, **_optional_**)

    The plugin to use when developing the package.

  - `deployPlugin` (_string_ || _Object_, **_optional_**)

    The plugin to use when deploying the package.

  Each plugin supports either a `string` value describing the plugin being used. For example:

  ```json
    "my-app": {
      "buildPlugin": "@lerna-cola/plugin-build-babel"
    }
  ```

  Or an `Object` value, where the `Object` contains the name and options for the respective plugin. For example:

  ```json
    "my-app": {
      "buildPlugin": {
        "name": "@lerna-cola/plugin-build-babel",
        "options": {
          "babelrc": false,
          "config": {
            "presets": ["babel-preset-env"]
          }
        }
      }
    }
  ```

  For a full list of options please see the documentation for the respective plugin that you are using.

- `packageSources` (_Array&lt;string&gt;_, **_optional_**)

  An array of globs, paths where your packages are contained. By default it uses the same configuration as Lerna, i.e.:

  ```json
    "packageSources": [
      "packages/*"
    ]
  ```

## CLI Commands

Below is an brief description of each command that the CLI provides. You can request for help via the CLI for all of the commands like so:

```bash
lerna-cola help
```

Or for an individual command like so:

```bash
lerna-cola build help
```

When executing commands all of the environment variables that are currently available (i.e. `process.env`) will be passed into the respective processes that are spawned for each package.

### build

Take advantage of one of the wide array of plugins to babel/flow/typescript/reasonml/etc/etc/etc transpile/build your packages with the ability to easily share and manage configuration at the root of your monorepo.

When executed it will run all of the configured plugins for all of your packages that have a `buildPlugin` configured within the `lerna-cola.json` [configuration](#configuration) file. The package build order is based upon on a topological sort against the dependency tree of your packages within the monorepo (i.e. they build in the correct order).

### develop

Run a full auto/hot reloading development environment in which any changes to one package cascade through your package dependency tree. No more need to manually rebuild/restart servers during development allow for a blazingly hot development experience.

For packages without a `developPlugin` configured, they will have their source or build output watched, with any changes causing notifications to be send down the dependency tree. Any packages running with a `developPlugin` can then respond to these and their own changes in order to auto/hot reload appropriately.

All of the logs/output from your packages will be managed and printed within the console window where you ran the `develop` command. The output contains a uniquely colored column to the left allowing you to easily identify the output for each respective package.

### deploy

Deploy your apps with a simple one line command to a cloud provider supported by the plugin system.

When executing this command your packages will be built in topological sort order (based on their dependency tree between each other) and then will subsequently be deployed via their configured plugins.

## Plugins

Lerna Cola is powered by a powerful plugin system that allows the build, develop, and deploy commands to support a multitude of targets. It is very easy to build your own plugin should you desire to so - please see the ["Plugin Development"](#plugin-development) section for more information.

Plugins are split by "core" plugins, which are bundled with the `@lerna-cola/core` package, and "package" plugins which could either be official Lerna Cola packages, 3rd party packages, or private packages of your own making.

### Core Plugins

#### `core-plugin-develop-server`

> TODO

#### `core-plugin-script`

> TODO

### Official Plugins

#### `@lerna-cola/plugin-build-babel`

> TODO

#### `@lerna-cola/plugin-build-flow`

> TODO

#### `@lerna-cola/plugin-deploy-now`

> TODO

### 3rd Party Plugins

Please feel free to create PR to add your plugin.

## Plugin Development

Developing plugins are very easy. You can develop 3 different types of plugins; one for each command type.

To create a plugin create a new NPM package, with the main file exporting a "plugin factory" function.

e.g.

```javascript
module.exports = function myPluginFactory(pkg, options) {
  // ...
}
```

Your plugin factory will receive two arguments:

- `pkg` (_Package_)

  The package for which the plugin is assigned. This contains lots of really useful information about the package, such as it's dependency tree, src and build output paths etc. Please see the full schema for the [Package Schema](#package-schema) to see what is available to you.

> TODO Plugin API etc

## Schemas

### `Package`

The holy grail of information for your plugins.
