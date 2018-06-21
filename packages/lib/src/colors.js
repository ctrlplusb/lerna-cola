// @flow

import type { Chalk } from 'chalk'

const chalk = require('chalk')

const background = [
  'bgGreen',
  'bgYellow',
  'bgBlue',
  'bgMagenta',
  'bgCyan',
  'bgWhite',
  'bgBlackBright',
  'bgRedBright',
  'bgGreenBright',
  'bgYellowBright',
  'bgBlueBright',
  'bgMagentaBright',
  'bgCyanBright',
  'bgWhiteBright',
  'bgBlack',
  'bgRed',
]

const foreground = [
  /*  0 */ 'green',
  /*  1 */ 'yellow',
  /*  2 */ 'blue',
  /*  3 */ 'magenta',
  /*  4 */ 'cyan',
  /*  5 */ 'white',
  /*  6 */ 'gray',
  /*  7 */ 'redBright',
  /*  8 */ 'greenBright',
  /*  9 */ 'yellowBright',
  /* 10 */ 'blueBright',
  /* 11 */ 'magentaBright',
  /* 12 */ 'cyanBright',
  /* 13 */ 'whiteBright',
  /* 14 */ 'black',
  /* 15 */ 'red',
]

const colorPairs = [
  [0, 2],
  [0, 3],
  [0, 9],
  [0, 13],
  [0, 14],
  [1, 2],
  [1, 3],
  [1, 11],
  [1, 14],
  [1, 15],
  [2, 0],
  [2, 1],
  [2, 8],
  [2, 11],
  [2, 12],
  [2, 13],
  [2, 15],
  [3, 5],
  [3, 8],
  [3, 9],
  [3, 12],
  [3, 13],
  [4, 2],
  [4, 3],
  [4, 6],
  [4, 13],
  [4, 14],
  [4, 15],
  [5, 2],
  [5, 3],
  [5, 6],
  [5, 7],
  [5, 10],
  [5, 14],
  [5, 15],
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 4],
  [6, 8],
  [6, 9],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 2],
  [7, 9],
  [7, 12],
  [7, 13],
  [7, 14],
  [8, 2],
  [8, 3],
  [8, 6],
  [8, 7],
  [8, 10],
  [8, 14],
  [8, 15],
  [9, 2],
  [9, 3],
  [9, 6],
  [9, 7],
  [9, 10],
  [9, 11],
  [9, 14],
  [9, 15],
  [10, 8],
  [10, 9],
  [10, 12],
  [10, 13],
  [10, 14],
  [11, 2],
  [11, 14],
  [12, 2],
  [12, 3],
  [12, 6],
  [12, 7],
  [12, 10],
  [12, 14],
  [12, 15],
  [13, 0],
  [13, 2],
  [13, 3],
  [13, 4],
  [13, 6],
  [13, 7],
  [13, 10],
  [13, 14],
  [13, 15],
]
  .reverse()
  .map(([b, f]) => [f, b])
  .sort(([fx], [fy]) => fy - fx)

let index = -1

const nextColorPair = (): Chalk => {
  index += 1
  if (index >= colorPairs.length) {
    index = 0
  }
  const [fgIndex, bgIndex] = colorPairs[index]
  const bg = background[bgIndex]
  const fg = foreground[fgIndex]
  // $FlowFixMe
  return chalk[bg][fg]
}

module.exports = {
  nextColorPair,
}
