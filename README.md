> **Work in Progress** 👀
>
> lerna-cola is being built in parallel to a large scale production grade project, thereby getting some serious dogfooding in order to work out the kinks and settle on a useful API. Whilst we have made a lot of progress this is still very much an alpha version of the project, so we definitely would not recommend you use it.
>
> Do feel free to play though, and contributions are welcome to the moon and back. 😘

---

# lerna-cola

Superpowers for your Lerna repos. New commands to build, develop, and deploy your packages via a rich plugin system.

## TOC

- [Introduction](#introduction)
- [Requirements](#requirements)
- [Installation](#installation)
- [Features](#features)
- [Plugins](#plugins)
- [Plugin Development](#plugin-development)
- [Templates](#templates)

## Introduction

`lerna-cola` exposes an additional set of commands for your `lerna` repositories. Specifically it allows you to perform 3 additional actions against your packages: `build`, `develop`, and `deploy`.

We built the `lerna-cola` commands with the intension to theoretically support any type of package (e.g. library/server/microservice/lamda-fn) via its flexible plugin system. For example yout could utilise `lerna-cola` to easily build/transpile your packages prior to deployment, run a full hot reloading development environment in which you develop a series of microservices in parallel, or publish your packages to a cloud provider of your choice.

## Requirements

- **Node >= 8**

  Version8 was LTS at the time of writing this. Use it 😀. That being said if you wish to create "server" packages that target lower versions you could restrict your JS API usage appropriately or use the Babel plugin to transpile to your target version.

- **[Lerna](https://lernajs.io/)**

  Otherwise we ain't got anyone drink to the cola.

## Installation

> TODO

## Features

> TODO

## Plugins

lerna-cola allows for a powerful plugin based system that allows you to enrich the build, develop, and deploy commands to support any target type.

If you are interested in developing your own plugins please see the ["Plugin Development"](#plugin-development) docs for more information.

> TODO: Overview of how plugins integrate

> TODO: built in plugins

### lerna-cola-plugin-babel

> TODO

### lerna-cola-plugin-flow

> TODO

### lerna-cola-plugin-now

> TODO

### lerna-cola-plugin-webpack

> TODO

### lerna-cola-plugin-webpack-node

> TODO

## Plugin Development

> TODO Plugin API etc
