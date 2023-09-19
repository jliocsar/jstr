const path = require('node:path')
const { stderr, env, exit, cwd } = require('node:process')
const fs = require('node:fs/promises')

const Belt = require('@mobily/ts-belt')
const safeEval = require('safe-eval')
const { Notation } = require('notation')

const { pipe, flow, F, B, D, A } = Belt
const DEBUG = !!env.DEBUG
const context = Object.assign({}, Belt)
const directory = cwd()

const logErrorMessage = flow(stderr.write.bind(stderr), () => exit(1))
const dlog = console.log.bind(console)

const readJSONFile = filePath => fs.readFile(path.resolve(directory, filePath))

const convertToCsv = data => {
  const isArray = Array.isArray(data)
  if (B.nor(isArray, typeof data === 'object')) {
    return logErrorMessage(
      'The CSV data type has to be either an object or an array',
    )
  }
  const flattened = value => Notation.create(value).flatten().value
  const csv = require('@fast-csv/format')
  try {
    return csv.writeToString(
      isArray ? A.map(data, flattened) : [flattened(data)],
      { headers: true },
    )
  } catch (error) {
    return logErrorMessage('Error formatting CSV: ' + error.message)
  }
}

const stringifyToJson = (data, { spaces }) => JSON.stringify(data, null, spaces)
const parseJson = (identifier, value, reviver) => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value, reviver)
  } catch (error) {
    DEBUG && dlog(error.message)
    return logErrorMessage(
      `Failed to parse JSON "${identifier}":\n` + error.message,
    )
  }
}

const createMapReplacer =
  notated =>
  ([accessKey, replacement]) =>
    notated.rename(accessKey, replacement)

const createRevivedKeysReducer = ({ suffix, prefix, omit }, parsedValue) => {
  const parsedOmit = omit?.split(',')
  return (revived, key) => {
    if (parsedOmit && A.includes(parsedOmit, key)) {
      return revived
    }
    let revivedKey = key
    if (suffix) {
      revivedKey = revivedKey + suffix
    }
    if (prefix) {
      revivedKey = prefix + revivedKey
    }
    revived[revivedKey] = parsedValue[key]
    return revived
  }
}
const reduceWithReviver = args => original =>
  pipe(original, D.keys, A.reduce({}, createRevivedKeysReducer(args, original)))

const revive = args => (key, value) => {
  if (key) {
    return value
  }
  const notated = Notation.create(value)
  const map = args.map
  const parsedMap = parseJson('map', map)
  if (parsedMap) {
    pipe(parsedMap, D.toPairs, A.forEach(createMapReplacer(notated)))
  }
  const parsedValue = notated.value
  const reducer = reduceWithReviver(args)
  const revived = Array.isArray(parsedValue)
    ? A.map(parsedValue, reducer)
    : reducer(parsedValue)
  return revived
}

const hasRevivingOptions = F.anyPass([
  D.get('suffix'),
  D.get('prefix'),
  D.get('omit'),
  D.get('map'),
])

/**
 *
 * @param {string} input A JSON in string format to parse
 * @param {string} [parser] An optional parser function to run through the output
 * @param {{
 *  csv: boolean;
 *  input: boolean;
 *  spaces: number;
 *  map: string;
 *  prefix: string;
 *  suffix: string;
 *  omit: string;
 * }} [options] Options used in the formatting
 */
module.exports.jstr = async (input, parserstr, options = {}) => {
  const parser = parserstr ? safeEval(parserstr, context) : null
  if (parser && B.not(typeof parser === 'function')) {
    return logErrorMessage('Parser must be of type function')
  }
  const reviver = hasRevivingOptions(options) ? revive(options) : null
  const json = options.input ? input : await readJSONFile(input)
  const parsed = parseJson('data', json, reviver)
  const handled = (await parser?.(parsed)) ?? parsed
  return options.csv ? convertToCsv(handled) : stringifyToJson(handled, options)
}
