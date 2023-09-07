const path = require('path')
const { stdin, stdout, exit, cwd } = require('process')
const { promisify } = require('util')

const fs = require('graceful-fs')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))

const { jstr } = require('./api')

const directory = cwd()

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
const generateBufferPromiseWithHandler = ({
  file: fileOrParser,
  parser,
  input,
}) =>
  input
    ? [readPipedValue(), fileOrParser]
    : [readJSONFile(fileOrParser), parser]

const handler = async args => {
  const [bufferPromise, parserstr] = generateBufferPromiseWithHandler(args)
  const buffer = (await bufferPromise).toString()
  const output = await jstr(buffer, parserstr, args)
  if (args.copy) {
    require('copy-paste').copy(output)
  } else {
    stdout.write(output)
  }
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
