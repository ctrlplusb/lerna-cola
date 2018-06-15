#!/usr/bin/env node

const os = require('os')
const path = require('path')
const pLimit = require('p-limit')
const R = require('ramda')
const fs = require('fs-extra')
const globby = require('globby')
const flowRemoveTypes = require('flow-remove-types')

const packages = [
  'lerna-cola',
  'lerna-cola-dev-utils',
  'lerna-cola-plugin-babel',
  'lerna-cola-plugin-flow',
  'lerna-cola-plugin-now',
].map(packageName => ({
  pkg: {
    paths: {
      root: path.resolve(process.cwd(), `./packages/${packageName}`),
    },
  },
  options: {
    outputDir: path.resolve(process.cwd(), `./packages/${packageName}/build`),
    sourceDir: 'src',
  },
}))

const maxConcurrentTranspiles = os.cpus().length

// :: string -> void
const ensureParentDirectoryExists = filePath => {
  const dir = path.dirname(filePath)
  fs.ensureDirSync(dir)
}

// :: Package, Options -> DevelopAPI
async function flowBuildPlugin(pkg, options) {
  const buildOutputRoot = path.resolve(
    pkg.paths.root,
    options.outputDir || './build',
  )
  const patterns = (
    options.inputs || ['**/*.js', '!__tests__', '!test.js']
  ).concat(['!node_modules/**/*', `!${path.basename(buildOutputRoot)}/**/*`])
  const sourceRoot =
    options.sourceDir != null
      ? path.resolve(pkg.paths.root, options.sourceDir)
      : pkg.paths.root

  // :: string -> Array<string>
  const getJsFilePaths = () =>
    globby(patterns, {
      cwd: sourceRoot,
    })

  const filePaths = await getJsFilePaths()

  // :: string -> Promise<void>
  const transpileFile = filePath =>
    new Promise(resolve => {
      const module = path.resolve(sourceRoot, filePath)
      const input = fs.readFileSync(module, 'utf8')
      const output = flowRemoveTypes(input)
      const outFile = path.resolve(buildOutputRoot, filePath)
      ensureParentDirectoryExists(outFile)
      fs.writeFileSync(outFile, output.toString(), { encoding: 'utf8' })
      fs.writeFileSync(`${outFile}.flow`, input, { encoding: 'utf8' })
      resolve()
    })

  const limit = pLimit(maxConcurrentTranspiles)
  const queueTranspile = filePath => limit(() => transpileFile(filePath))
  await Promise.all(R.map(queueTranspile, filePaths))
}

Promise.all(
  packages.map(({ pkg, options }) => flowBuildPlugin(pkg, options)),
).then(
  () => {
    console.log('Done')
    process.exit(0)
  },
  err => {
    console.error(err)
    process.exit(1)
  },
)

function preventScriptExit() {
  ;(function wait() {
    // eslint-disable-next-line no-constant-condition
    if (true) setTimeout(wait, 1000)
  })()
}

preventScriptExit()
