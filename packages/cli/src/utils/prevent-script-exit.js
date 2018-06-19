// Prevent node process from exiting. (until CTRL + C or process.exit is called)
// We do this to allow our scripts to respont to process exit events and do
// cleaning up etc.
module.exports = function preventScriptExit() {
  ;(function wait() {
    // eslint-disable-next-line no-constant-condition
    if (true) setTimeout(wait, 1000)
  })()
}
