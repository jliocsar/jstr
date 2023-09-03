#!/usr/bin/env node
const path = require('path')
const { stdin, stdout, stderr, exit, cwd } = require('process')
const readline = require('readline')

const fs = require('graceful-fs')
const ncp = require('copy-paste')
const safeEval = require('safe-eval')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))
const { Notation } = require('notation')
const R = require('ramda')

const directory = cwd()
const context = { R }

const uncurryToBinary = R.uncurryN(2)

// #region log
let logv
const logMessage = message => stdout.write(message + '\n')
const logErrorMessage = R.curry((message, error) => {
  stderr.write(error ? `${message}: ${error.message}` : message)
  exit(1)
})
const createLogger = verbose =>
  (logv = R.ifElse(R.always(verbose), logMessage, R.always(void 0)))
// #endregion
// #region files
const readFile = filePath =>
  new Promise((resolve, reject) =>
    fs.readFile(filePath, (error, buffer) =>
      error ? reject(error) : resolve(buffer),
    ),
  )
const readPipedValue = () => {
  let lines = ''
  return new Promise(resolve =>
    readline
      .createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
        historySize: 0,
      })
      .on('close', () => resolve(lines))
      .on('line', line => (lines += line + '\n')),
  )
}
// #endregion
// #region output
const copyToClipboard = R.ifElse(
  R.isNotNil,
  output => {
    logv('copying to clipboard')
    ncp.copy(output)
  },
  logErrorMessage("Can't copy `null` or `undefined` to clipboard"),
)
const printOrCopyOutput = uncurryToBinary(copy =>
  R.ifElse(R.always(R.isNil(copy)), logMessage, copyToClipboard),
)
// #endregion
// #region json parsing
const parseJSON = R.binary(
  R.ifElse(
    R.isNotNil,
    R.tryCatch(JSON.parse, logErrorMessage('Invalid JSON')),
    R.always(null),
  ),
)
const cachedToString = R.memoizeWith(R.identity, R.identity)
const parseBufferToJSON = uncurryToBinary(handlerArgs =>
  R.pipe(cachedToString, parseJSON(R.__, revive(handlerArgs))),
)

const parseMap = R.unless(R.isNil, parseJSON)
const renameFromMapNotation = uncurryToBinary(notated =>
  R.forEachObjIndexed((replacement, accessKey) =>
    notated.rename(accessKey, replacement),
  ),
)

const createJstrReviver = R.curry(({ suffix, prefix, map }, key, value) => {
  if (key) return value
  logv('manually reviving...')
  // map can be a simple JSON or something like
  // { "name.otherThing": 'otherThingy } => { "name": { "otherThingy": "" } }
  let parsedValue = value
  const parsedMap = parseMap(map)
  if (parsedMap) {
    const notated = Notation.create(parsedValue)
    renameFromMapNotation(notated, parsedMap)
    parsedValue = notated.value
  }
  return R.reduce(
    (revived, key) => {
      let revivedKey = key
      if (suffix) revivedKey = revivedKey + suffix
      if (prefix) revivedKey = prefix + revivedKey
      revived[revivedKey] = parsedValue[key]
      return revived
    },
    {},
    R.keys(parsedValue),
  )
})

const hasToManuallyRevive = R.anyPass([
  R.has('prefix'),
  R.has('suffix'),
  R.has('map'),
])
const revive = R.when(hasToManuallyRevive, createJstrReviver)
const evalParser = uncurryToBinary(parser => safeEval(parser, context))
const reviveFromParser = R.curry((parser, key, value) =>
  key ? value : evalParser(parser, value),
)
const replace = R.unless(R.isNil, reviveFromParser)
// #endregion
/** main command handler */
const handler = async handlerArgs => {
  const {
    spaces,
    verbose,
    copy,
    input,
    file: fileOrParser,
    parser: parserstr,
  } = handlerArgs
  if (R.not(R.or(fileOrParser, input))) {
    logErrorMessage('File or input argument must be provided')()
  }
  createLogger(verbose)
  logv(`reading from ${input ? 'pipe' : 'file'}...`)
  const buffer = await (input
    ? readPipedValue()
    : R.andThen(R.toString, readFile(path.resolve(directory, fileOrParser))))
  const data = parseBufferToJSON(handlerArgs, buffer)
  const parserToEval = R.isNil(input) ? parserstr : fileOrParser
  printOrCopyOutput(
    copy,
    // output
    JSON.stringify(data, replace(parserToEval), spaces),
  )
  exit()
}

yargs
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
  .version().argv
