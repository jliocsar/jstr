const path = require('node:path')
const { stdin, stdout, stderr, exit, argv } = require('node:process')
const fs = require('node:fs/promises')

const minimist = require('minimist')
const color = require('colorette')
const Belt = require('@mobily/ts-belt')

const { jstr } = require('./api')

const { pipe } = Belt
const isBun = /\/bun$/.test(argv[1])

const CommandOptionsMap = {
  Help: 'help',
  Copy: 'copy',
  Input: 'input',
  CSV: 'csv',
  Spaces: 'spaces',
  Map: 'map',
  Omit: 'omit',
  Prefix: 'prefix',
  Suffix: 'suffix',
  Version: 'version',
}
const CommandOptionsAlias = {
  [CommandOptionsMap.Help]: 'h',
  [CommandOptionsMap.Copy]: 'c',
  [CommandOptionsMap.Input]: 'i',
  [CommandOptionsMap.Spaces]: 's',
  [CommandOptionsMap.Omit]: 'o',
  [CommandOptionsMap.Map]: 'm',
}

const printVersion = async () => {
  const packageJson = await fs.readFile(
    path.resolve(__dirname, 'package.json'),
    { encoding: 'utf-8' },
  )
  const { version } = JSON.parse(packageJson)
  stdout.write(version)
  exit()
}

const printHelp = (exitCode = 0) => {
  const bin = isBun ? 'jstr.bun' : 'jstr'
  const option = value => color.blue(`--${value}`)
  const alias = value => color.blue(`-${CommandOptionsAlias[value]}`)
  const helpMessage = `
${color.magenta('@jliocsar/jstr')}

${pipe(
  'Simple JavaScript CLI tool to read and parse JSON files',
  color.dim,
  color.italic,
)}

${color.underline(color.bold('Usage'))}
${bin} [options] <file|parser> [parser]

${color.bold('Options')}
- ${color.cyan('Help')}   (${option(CommandOptionsMap.Help)} or ${alias(
    CommandOptionsMap.Help,
  )}): Prints the help message ${color.dim('[Boolean]')}
- ${color.cyan('Copy')}   (${option(CommandOptionsMap.Copy)} or ${alias(
    CommandOptionsMap.Copy,
  )}): Copy the output to the clipboard ${color.dim('[Boolean]')}
- ${color.cyan('Input')}  (${option(CommandOptionsMap.Input)} or ${alias(
    CommandOptionsMap.Input,
  )}): Reads the JSON string from stdin ${color.dim('[Boolean]')}
- ${color.cyan('CSV')}    (${option(
    CommandOptionsMap.CSV,
  )}): Reads the JSON string from stdin ${color.dim('[Boolean]')}
- ${color.cyan('Spaces')} (${option(CommandOptionsMap.Spaces)} or ${alias(
    CommandOptionsMap.Spaces,
  )}): Number of spaces to add in the JSON output ${color.dim('[Integer]')}
- ${color.cyan('Map')}    (${option(CommandOptionsMap.Map)} or ${alias(
    CommandOptionsMap.Map,
  )}): Map of keys to rename ${color.dim('[String, JSON format]')}
- ${color.cyan('Omit')}   (${option(CommandOptionsMap.Omit)} or ${alias(
    CommandOptionsMap.Omit,
  )}): Keys to omit from the output ${color.dim(
    '[String, comma separated format]',
  )}
- ${color.cyan('Prefix')} (${option(
    CommandOptionsMap.Prefix,
  )}): Adds a prefix to every key (first-level) of the output ${color.dim(
    '[String]',
  )}
- ${color.cyan('Suffix')} (${option(
    CommandOptionsMap.Suffix,
  )}): Adds a suffix to every key (first-level) of the output ${color.dim(
    '[String]',
  )}

${color.bold('Examples')}
${bin} package.json ${color.dim('# prints the package.json file content')}
${bin} myjsonfile.json "x => x.myKey" ${color.dim(
    '# prints `myKey` from the JSON file',
  )}
cat package.json | ${bin} -i -s 2 ${color.dim(
    '# prints with 2 spaces while reading from stdin',
  )}
`
  stdout.write(helpMessage)
  exit(exitCode)
}

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
  _: [fileOrParser, parser],
  input,
}) => (input ? [readPipedValue(), fileOrParser] : [fileOrParser, parser])

const handler = async args => {
  if (args.help) {
    return printHelp()
  }
  if (args.version) {
    return printVersion()
  }
  const [bufferPromise, parserstr] = generateBufferPromiseWithHandler(args)
  const buffer = (await bufferPromise)?.toString()
  const output = await jstr(buffer, parserstr, args)
  if (args.copy) {
    // TODO: Make this faster
    const { default: cp } = await import('clipboardy')
    await cp.write(output)
  } else {
    stdout.write(output)
  }
  return exit()
}

;(async function main() {
  try {
    await handler(
      minimist(argv.slice(2), {
        alias: {
          [CommandOptionsMap.Help]: CommandOptionsAlias[CommandOptionsMap.Help],
          [CommandOptionsMap.Copy]: CommandOptionsAlias[CommandOptionsMap.Copy],
          [CommandOptionsMap.Input]:
            CommandOptionsAlias[CommandOptionsMap.Input],
          [CommandOptionsMap.Map]: CommandOptionsAlias[CommandOptionsMap.Map],
          [CommandOptionsMap.Spaces]:
            CommandOptionsAlias[CommandOptionsMap.Spaces],
        },
        string: [
          CommandOptionsMap.Spaces,
          CommandOptionsMap.Prefix,
          CommandOptionsMap.Suffix,
          CommandOptionsMap.Map,
          CommandOptionsMap.Omit,
        ],
        boolean: [
          CommandOptionsMap.Copy,
          CommandOptionsMap.Help,
          CommandOptionsMap.Input,
          CommandOptionsMap.Version,
        ],
      }),
    )
  } catch (error) {
    stderr.write(error.message)
    exit(1)
  }
})()
