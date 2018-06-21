/* eslint-disable no-console */

const os = require('os')
const path = require('path')
const pLimit = require('p-limit')
const R = require('ramda')
const fs = require('fs-extra')
const globby = require('globby')
const flowRemoveTypes = require('flow-remove-types')
const rimraf = require('rimraf')
const pify = require('pify')

const rimrafAsync = pify(rimraf)

const flowPackages = [
  'babel-config',
  'cli',
  'lib',
  'plugin-build-babel',
  'plugin-build-flow',
  'plugin-deploy-now',
]

const maxConcurrentTranspiles = os.cpus().length

const ensureParentDirectoryExists = filePath => {
  const dir = path.dirname(filePath)
  fs.ensureDirSync(dir)
}

async function cleanFlowPackage(packageName) {
  const outputDir = path.resolve(
    process.cwd(),
    `./packages/${packageName}/build`,
  )
  return rimrafAsync(outputDir)
}

async function buildFlowPackage(packageName) {
  const outputDir = path.resolve(
    process.cwd(),
    `./packages/${packageName}/build`,
  )
  const sourceDir = path.resolve(process.cwd(), `./packages/${packageName}/src`)

  const patterns = ['**/*.js', '!__tests__', '!test.js'].concat([
    '!node_modules/**/*',
    `!${path.basename(outputDir)}/**/*`,
  ])

  // :: string -> Array<string>
  const getJsFilePaths = () =>
    globby(patterns, {
      cwd: sourceDir,
    })

  const filePaths = await getJsFilePaths()

  const transpileFile = filePath =>
    new Promise(resolve => {
      const module = path.resolve(sourceDir, filePath)
      const input = fs.readFileSync(module, 'utf8')
      const output = flowRemoveTypes(input)
      const outFile = path.resolve(outputDir, filePath)
      ensureParentDirectoryExists(outFile)
      fs.writeFileSync(outFile, output.toString(), { encoding: 'utf8' })
      fs.writeFileSync(`${outFile}.flow`, input, { encoding: 'utf8' })
      resolve()
    })

  const limit = pLimit(maxConcurrentTranspiles)
  const queueTranspile = filePath => limit(() => transpileFile(filePath))
  await Promise.all(R.map(queueTranspile, filePaths))
}

module.exports = {
  buildAsync: () => {
    console.log('Building...')
    return Promise.all(flowPackages.map(buildFlowPackage)).then(
      () => {
        console.log('Build complete')
      },
      err => {
        console.error('Build failed')
        console.error(err)
        process.exit(1)
      },
    )
  },
  cleanAsync: () => {
    console.log('Cleaning...')
    Promise.all(flowPackages.map(cleanFlowPackage)).then(
      () => {
        console.log('Clean complete')
      },
      err => {
        console.error('Clean failed')
        console.error(err)
        process.exit(1)
      },
    )
  },
}
