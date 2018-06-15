// @flow

function throttle(duration: number, fn: () => mixed) {
  let throttler = null
  return (...args: Array<mixed>) => {
    if (throttler) {
      clearTimeout(throttler)
    }
    throttler = setTimeout(() => fn(...args), duration)
  }
}

module.exports = {
  throttle,
}
