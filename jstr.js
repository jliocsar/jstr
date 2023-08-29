#!/usr/bin/env node
const path = require('path')
const { stdin, stdout, stderr, exit, cwd } = require('process')
const readline = require('readline')

const fs = require('graceful-fs')
const ncp = require('copy-paste')
const safeEval = require('safe-eval')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { Notation } = require('notation')
const R = require('ramda')

const directory = cwd()
const context = { R }

const parseJSON = (value, reviver) => {
  try {
    return JSON.parse(value, reviver)
  } catch (error) {
    stderr.write(`Invalid JSON: '${error.message}'`)
    exit(1)
  }
}
const readFile = filePath =>
  new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, buffer) => {
      if (error) return reject(error)
      return resolve(buffer)
    })
  })
const readPipedValue = () => {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: false,
  })
  return new Promise(resolve => rl.on('line', resolve))
}

const handler = async ({
  file: fileOrParser,
  parser: parserstr,
  spaces,
  verbose,
  copy,
  suffix,
  prefix,
  input,
  map,
}) => {
  const logv = verbose ? stdout.write.bind(stdout) : () => void 0
  const buffer = input
    ? logv('reading from pipe...') || (await readPipedValue())
    : logv('reading from file...') ||
      (await readFile(path.resolve(directory, fileOrParser)))
  const manuallyRevive = Boolean(suffix || prefix || map)
  const data = parseJSON(
    buffer.toString(),
    manuallyRevive
      ? (key, value) => {
          logv('manually reviving...')
          if (key) return value
          // map can be a simple JSON or something like
          // { "name.otherThing": 'otherThingy } => { "name": { "otherThingy": "" } }
          let parsedValue = value
          const parsedMap = map ? parseJSON(map) : null
          if (parsedMap) {
            const notated = Notation.create(parsedValue)
            const parsedMapKeys = Object.entries(parsedMap)
            const parsedMapKeysLength = parsedMapKeys.length
            let mapKeyIndex = 0
            while (mapKeyIndex < parsedMapKeysLength) {
              const [accessKey, replacement] = parsedMapKeys[mapKeyIndex]
              notated.rename(accessKey, replacement)
              ++mapKeyIndex
            }
            parsedValue = notated.value
          }
          const keys = Object.keys(parsedValue)
          const keysLength = keys.length
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
      : null,
  )
  const parser = (input ? fileOrParser : parserstr)
    ? safeEval(parserstr, context)
    : null
  if (parser && typeof parser !== 'function') {
    stderr.write('Parser must be of type function')
    exit(1)
  }
  const output = JSON.stringify(
    data,
    parser ? (key, value) => (key ? value : parser(value)) : null,
    spaces,
  )
  if (output === null || output === undefined) {
    stderr.write(
      'Parser must return a value different to `null` and `undefined`',
    )
    exit(1)
  }
  if (copy) {
    logv('copying to clipboard')
    ncp.copy(output)
  } else {
    stdout.write(output)
  }
  exit()
}

yargs(hideBin(process.argv))
  .command(
    '$0 <file> [parser]',
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
  .strictCommands()
  .demandCommand(1)
  .option('spaces', {
    alias: 's',
    type: 'count',
    description: 'number of spaces to add in the JSON output',
    default: 0,
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
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
  .version()
  .parse()
