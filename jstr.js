#!/usr/bin/env node
const path = require('path')
const { stdin, stdout, stderr, exit, cwd, env } = require('process')
const readline = require('readline')
const { promisify } = require('util')

const fs = require('graceful-fs')
const ncp = require('copy-paste')
const safeEval = require('safe-eval')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { Notation } = require('notation')
const Belt = require('@mobily/ts-belt')

const { pipe, flow, F, B, D, A } = Belt
const DEBUG = !!env.DEBUG
const directory = cwd()
const context = Object.assign({}, Belt)

const asyncReadFile = promisify(fs.readFile)

const logErrorMessage = flow(stderr.write.bind(stderr), () => exit(1))
const logOutputOrCtc = B.ifElse(
  F.always(ncp.copy.bind(ncp)),
  F.always(stdout.write.bind(stdout)),
)
const dlog = console.log.bind(console)

const readJSONFile = filePath =>
  asyncReadFile(path.resolve(directory, filePath))
const readPipedValue = (lines = '') =>
  new Promise(resolve =>
    readline
      .createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
      })
      .on('line', line => (lines += line + '\n'))
      .on('close', () => resolve(lines)),
  )
const getBufferPromiseWithHandler = ({ file: fileOrParser, parser, input }) =>
  input
    ? [readPipedValue(), fileOrParser]
    : [readJSONFile(fileOrParser), parser]

const parseJSON = (value, reviver) => {
  try {
    return JSON.parse(value, reviver)
  } catch (error) {
    DEBUG && dlog(error.message)
    return logErrorMessage('Failed to parse JSON: ' + value)
  }
}
const hasToManuallyRevive = F.anyPass([
  D.get('suffix'),
  D.get('prefix'),
  D.get('map'),
])
const revive =
  ({ suffix, prefix, map }) =>
  (key, value) => {
    if (key) return value
    let parsedValue = value
    const parsedMap = parseJSON(map)
    if (parsedMap) {
      const notated = Notation.create(parsedValue)
      const parsedMapKeys = D.toPairs(parsedMap)
      const parsedMapKeysLength = A.length(parsedMapKeys)
      let mapKeyIndex = 0
      while (mapKeyIndex < parsedMapKeysLength) {
        const [accessKey, replacement] = parsedMapKeys[mapKeyIndex]
        notated.rename(accessKey, replacement)
        ++mapKeyIndex
      }
      parsedValue = notated.value
    }
    const keys = D.keys(parsedValue)
    const keysLength = A.length(keys)
    const revived = {}
    let index = 0
    while (index < keysLength) {
      const key = keys[index]
      let revivedKey = key
      if (suffix) revivedKey = revivedKey + suffix
      if (prefix) revivedKey = prefix + revivedKey
      revived[revivedKey] = parsedValue[key]
      ++index
    }
    return revived
  }
const replace = parser =>
  parser ? (key, value) => (key ? value : parser(value)) : null

const handler = async handlerArgs => {
  const { spaces, copy } = handlerArgs
  const [bufferPromise, parserstr] = getBufferPromiseWithHandler(handlerArgs)
  const buffer = (await bufferPromise).toString()
  const data = parseJSON(
    buffer,
    hasToManuallyRevive(handlerArgs) ? revive(handlerArgs) : null,
  )
  const parser = parserstr ? safeEval(parserstr, context) : null
  if (B.and(parser, typeof parser !== 'function')) {
    return logErrorMessage('Parser must be of type function')
  }
  const output = JSON.stringify(data, replace(parser), spaces)
  pipe(output, logOutputOrCtc(copy))
  exit()
}

yargs(hideBin(process.argv))
  .command(
    '$0 [file] [parser]',
    'parses and prints a JSON file in string version',
    yargs =>
      yargs
        .positional('file', {
          type: 'string',
          describe: 'the file to read from',
        })
        .positional('parser', {
          type: 'string',
          describe: 'parser function to use',
          default: null,
        }),
    handler,
  )
  .option('spaces', {
    alias: 's',
    type: 'count',
    description: 'number of spaces to add in the JSON output',
    default: 0,
  })
  .option('copy', {
    alias: 'c',
    type: 'boolean',
    description: 'Copy the output to the clipboard',
  })
  .option('input', {
    alias: 'i',
    type: 'boolean',
    description: 'Reads the JSON string from stdin',
  })
  .option('map', {
    alias: 'm',
    type: 'string',
    description: 'Map of keys to replace',
  })
  .option('suffix', {
    type: 'string',
    description: 'Adds a suffix to every key of the JSON file (first level)',
  })
  .option('prefix', {
    type: 'string',
    description: 'Adds a prefix to every key of the JSON file (first level)',
  })
  .example('$0 package.json', 'prints the package.json file content')
  .example(
    '$0 myjsonfile.json "x => x.myKey"',
    'prints `myKey` from the JSON file',
  )
  .example('$0 -s=2 myjsonfile.json', 'prints with 2 spaces')
  .example(
    '$0 --prefix=foo --suffix=bar file.json',
    'adds a prefix and suffix to every key on the 1st level',
  )
  .version().argv
