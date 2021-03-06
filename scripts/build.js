const { cleanAsync, buildAsync } = require('./utils')

cleanAsync()
  .then(buildAsync)
  .then(() => process.exit(0))

function preventScriptExit() {
  ;(function wait() {
    // eslint-disable-next-line no-constant-condition
    if (true) setTimeout(wait, 1000)
  })()
}

preventScriptExit()
