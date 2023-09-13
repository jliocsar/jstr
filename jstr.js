const { stdin, stdout, exit } = require('node:process')

const { hideBin } = require('yargs/helpers')
const yargs = require('yargs')(hideBin(process.argv))

const { jstr } = require('./api')

const readPipedValue = (lines = '') =>
  new Promise(resolve =>
    require('node:readline')
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
}) => (input ? [readPipedValue(), fileOrParser] : [fileOrParser, parser])

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
  .version()
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
  .option('csv', {
    type: 'boolean',
    description: 'Prints the output in CSV format',
  })
  .option('spaces', {
    alias: 's',
    type: 'number',
    description: 'Number of spaces to add in the JSON output',
  })
  .option('map', {
    alias: 'm',
    type: 'string',
    description: 'Map of keys to replace',
  })
  .option('omit', {
    alias: 'o',
    type: 'string',
    description: 'Keys to omit (comma separated)',
  })
  .option('suffix', {
    type: 'string',
    description: 'Adds a suffix to every key of the JSON file',
  })
  .option('prefix', {
    type: 'string',
    description: 'Adds a prefix to every key of the JSON file',
  })
  .example('$0 package.json', 'prints the package.json file content')
  .example(
    '$0 myjsonfile.json "x => x.myKey"',
    'prints `myKey` from the JSON file',
  )
  .example('$0 -s=2 myjsonfile.json', 'prints with 2 spaces')
  .parse()
