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

const parseJSON = R.binary(
  R.ifElse(
    R.isNotNil,
    R.tryCatch(JSON.parse, error => {
      stderr.write(`Invalid JSON: '${error.message}'`)
      exit(1)
    }),
    R.always(null),
  ),
)

const readFile = filePath =>
  new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, buffer) => {
      if (error) return reject(error)
      return resolve(buffer)
    })
  })
const readPipedValue = () => {
  let lines = ''
  return new Promise(resolve => {
    readline
      .createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
      })
      .on('line', line => (lines += line + '\n'))
    setTimeout(() => resolve(lines), 100)
  })
}

const renameFromMapNotation = notated => (replacement, accessKey) =>
  notated.rename(accessKey, replacement)

const hasToManuallyRevive = R.anyPass([
  R.has('prefix'),
  R.has('suffix'),
  R.has('map'),
])

const parseMap = R.unless(R.isNil, parseJSON)

const buildJSONReviver =
  (logv, { suffix, prefix, map }) =>
  (key, value) => {
    if (key) return value
    logv('manually reviving...')
    // map can be a simple JSON or something like
    // { "name.otherThing": 'otherThingy } => { "name": { "otherThingy": "" } }
    let parsedValue = value
    const parsedMap = parseMap(map)
    if (parsedMap) {
      const notated = Notation.create(parsedValue)
      R.forEachObjIndexed(renameFromMapNotation(notated), parsedMap)
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
  }

const reviveFromParser = parser => (key, value) => key ? value : parser(value)

const copyToClipboard = (logv, output) => () => {
  if (R.isNil(output)) {
    stderr.write("Can't copy `null` or `undefined` to clipboard")
    exit(1)
  }
  logv('copying to clipboard')
  ncp.copy(output)
}

const logOutput = output => () => {
  stdout.write(
    {
      [null]: 'null',
      [undefined]: 'undefined',
    }[output] ?? output.toString(),
  )
}

const handler = async handlerArgs => {
  const {
    file: fileOrParser,
    parser: parserstr,
    spaces,
    verbose,
    copy,
    input,
  } = handlerArgs
  const logv = verbose ? message => stdout.write(message + '\n') : () => void 0
  logv(`reading from ${input ? 'pipe' : 'file'}...`)
  const buffer = input
    ? await readPipedValue()
    : await readFile(path.resolve(directory, fileOrParser))
  const data = parseJSON(
    buffer.toString(),
    R.cond([
      [hasToManuallyRevive, R.curry(buildJSONReviver)(logv)],
      [R.T, R.always(null)],
    ])(handlerArgs),
  )
  const parserToEval = R.isNil(input) ? parserstr : fileOrParser
  const parser = parserToEval ? safeEval(parserToEval, context) : null
  if (R.and(parser, R.not(R.type(parser) === 'Function'))) {
    stderr.write('Parser must be of type function')
    exit(1)
  }
  const output = JSON.stringify(
    data,
    R.cond([
      [R.isNotNil, reviveFromParser],
      [R.T, R.always(null)],
    ])(parser),
    spaces,
  )
  R.ifElse(R.isNotNil, copyToClipboard(logv, output), logOutput(output))(copy)
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
