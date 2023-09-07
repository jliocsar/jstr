const { stdout, stderr, env, exit } = require('process')

const Belt = require('@mobily/ts-belt')
const safeEval = require('safe-eval')
const { Notation } = require('notation')

const { pipe, flow, F, B, D, A } = Belt
const DEBUG = !!env.DEBUG
const context = Object.assign({ fetch }, Belt)

const logErrorMessage = flow(stderr.write.bind(stderr), () => exit(1))
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

/**
 *
 * @param {string} input A JSON in string format to parse
 * @param {string} [parser] An optional parser function to run through the output
 * @param {{
 *  csv: boolean;
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
  const reviver = B.or(parser, hasRevivingOptions(options))
    ? revive(options, parser)
    : null
  const data = parseJSON('data', input, reviver)
  const handled = (await parser?.(data)) ?? data
  return options.csv
    ? outputWithCsvFormat(handled)
    : stringifyJSON(handled, options)
}
