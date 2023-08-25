const { platform } = require('os')
const { stdout, stderr } = require('process')
const { exec } = require('child_process')

const pkg = require('pkg')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const copyUnixBinary = () => {
  exec('sudo cp dist/jstr /usr/local/bin/jstr', error => {
    if (error) {
      stderr.write(error.message)
      return
    }
  })
}

const copyWindowsBinary = () => {
  exec('copy dist\\jstr.exe C:\\Windows\\System32\\jstr.exe', error => {
    if (error) {
      stderr.write(error.message)
      return
    }
  })
}

const map = {
  linux: copyUnixBinary,
  freebsd: copyUnixBinary,
  darwin: copyUnixBinary,
  win32: copyWindowsBinary,
}
const handler = () => {
  pkg.exec(['--compress GZip', '-o', 'dist/jstr', '.'])
  const copyFile = map[platform()]
  if (!copyFile) {
    stderr.write('Unsupported platform type')
  }
  process.nextTick(copyFile)
}

yargs(hideBin(process.argv))
  .command('$0', 'builds the binary', handler)
  .strictCommands()
  .demandCommand(1)
  .version()
  .parse()
