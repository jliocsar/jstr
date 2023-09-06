#!/usr/bin/env node
const path = require('path')
const { stdin, stdout, stderr, env, exit, cwd } = require('process')
const { promisify } = require('util')

const fs = require('graceful-fs')
const Belt = require('@mobily/ts-belt')
const safeEval = require('safe-eval')
const { Notation } = require('notation')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))

const { pipe, flow, F, B, D, A } = Belt
const DEBUG = !!env.DEBUG
const directory = cwd()
const context = Object.assign({ fetch }, Belt)

const logErrorMessage = flow(stderr.write.bind(stderr), () => exit(1))
const logOutputOrCtc = B.ifElse(
  F.always(require('copy-paste').copy),
  F.always(stdout.write.bind(stdout)),
)
const dlog = console.log.bind(console)

const outputWithCsvFormat = data => {
  const isArray = Array.isArray(data)
  if (B.nor(isArray, typeof data === 'object')) {
    return logErrorMessage(
      'The CSV data type has to be either an object or an array',
    )
  }
  const csv = require('@fast-csv/format')
  const stream = csv.format({ headers: true })
  stream.pipe(stdout)
  try {
    // TODO: Use `Notation` across with `set`/`get`
    const flattened = value => Notation.create(value).flatten().value
    const write = stream.write.bind(stream)
    if (isArray) {
      A.forEach(A.map(data, flattened), write)
    } else {
      pipe(data, flattened, write)
    }
  } catch (error) {
    return logErrorMessage('Error formatting CSV: ' + error.message)
  } finally {
    stream.end()
  }
}

const asyncReadFile = promisify(fs.readFile)
const readJSONFile = filePath =>
  asyncReadFile(path.resolve(directory, filePath))
const readPipedValue = (lines = '') =>
  new Promise(resolve =>
    require('readline')
      .createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
      })
      .on('line', line => (lines += line + '\n'))
      .on('close', () => resolve(lines)),
  )
const generateBufferPromiseWithHandler = function* ({
  file: fileOrParser,
  parser,
  input,
}) {
  if (input) {
    yield fileOrParser
    return readPipedValue()
  }
  yield parser
  return readJSONFile(fileOrParser)
}

const stringifyJSON = (data, { spaces }) => JSON.stringify(data, null, spaces)
const parseJSON = (identifier, value, reviver) => {
  if (B.not(value)) return null
  try {
    return JSON.parse(value, reviver)
  } catch (error) {
    DEBUG && dlog(error.message)
    return logErrorMessage(
      `Failed to parse JSON "${identifier}":\n` + error.message,
    )
  }
}

const hasRevivingOptions = F.anyPass([
  D.get('suffix'),
  D.get('prefix'),
  D.get('omit'),
  D.get('map'),
])
const createMapReplacer =
  notated =>
  ([accessKey, replacement]) =>
    notated.rename(accessKey, replacement)
const createRevivedKeysReducer = ({ suffix, prefix, omit }, parsedValue) => {
  const parsedOmit = omit?.split(',')
  return (revived, key) => {
    if (parsedOmit && A.includes(parsedOmit, key)) return revived
    let revivedKey = key
    if (suffix) revivedKey = revivedKey + suffix
    if (prefix) revivedKey = prefix + revivedKey
    revived[revivedKey] = parsedValue[key]
    return revived
  }
}
const reduceWithReviver = args => original =>
  pipe(original, D.keys, A.reduce({}, createRevivedKeysReducer(args, original)))
const revive = args => (key, value) => {
  if (key) return value
  let parsedValue = value
  const map = args.map
  const parsedMap = parseJSON('map', map)
  if (parsedMap) {
    const notated = Notation.create(parsedValue)
    pipe(parsedMap, D.toPairs, A.forEach(createMapReplacer(notated)))
    parsedValue = notated.value
  }
  const reducer = reduceWithReviver(args)
  const revived = Array.isArray(parsedValue)
    ? A.map(parsedValue, reducer)
    : reducer(parsedValue)
  return revived
}

const handler = async args => {
  const bufferGen = generateBufferPromiseWithHandler(args)
  const { value: parserstr } = bufferGen.next()
  const parser = parserstr ? safeEval(parserstr, context) : null
  if (parser && B.not(typeof parser === 'function')) {
    return logErrorMessage('Parser must be of type function')
  }
  const { value: bufferPromise } = bufferGen.next()
  const buffer = (await bufferPromise).toString()
  const reviver = B.or(parser, hasRevivingOptions(args))
    ? revive(args, parser)
    : null
  const data = parseJSON('data', buffer, reviver)
  const handled = (await parser?.(data)) ?? data
  if (args.csv) {
    return outputWithCsvFormat(handled)
  }
  await pipe(stringifyJSON(handled, args), logOutputOrCtc(args.copy))
  exit()
}

yargs
  .command(
    '$0 [file] [parser]',
    'Parses and prints a JSON file in string version',
    yargs =>
      yargs
        .positional('file', {
          type: 'string',
          describe: 'The file to read from',
        })
        .positional('parser', {
          type: 'string',
          describe: 'Parser function to use',
          default: null,
        }),
    handler,
  )
  .option('spaces', {
    alias: 's',
    type: 'number',
    description: 'Number of spaces to add in the JSON output',
    default: 0,
  })
  .option('copy', {
    alias: 'c',
    type: 'boolean',
    description: 'Copy the output to the clipboard',
  })
  .option('csv', {
    type: 'boolean',
    description: 'Prints the output in CSV format',
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
  .option('omit', {
    alias: 'o',
    type: 'string',
    description: 'Array of keys to omit',
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
