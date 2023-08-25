<div align="center">

# jstr 🧵

_Simple JavaScript CLI tool to read and parse JSON files_

</div>

Description says it all.

The CLI script file has ~2Kb when minified, so it's quite lightweight. It tries to use the least amount of dependencies possible to keep it as fast as possible too.
The JSON output can be manipulated using pure JS syntax. The parser handler also exposes [Ramda](https://ramdajs.com/) to easily parse strings/arrays if necessary (just use `R`).

TL;DR This is a `JSON.parse`/`stringify` wrapper focused in files rather than pure strings.

## Usage

```sh
# Copies the content in `package.json` to the clipboard
jstr -c package.json

# Prints the content from `package.json` in a single line
jstr package.json

# Prints the content from `package.json` with 2 spaces
jstr -s=2 package.json

# Prints the value of the key `"name"` in the `package.json` file
jstr package.json "x => x.name"

# In case you need to use more lines for the snippet
jstr package.json \
'({ name }) => {
  const capitalized = name[0].toUpperCase() + name.slice(1)
  return capitalized
}'

# Using Ramda to manipulate the output
jstr package.json \
"x => R.replace(
  '{packageName}',
  R.__,
  'new-{packageName}'
)(x.name)"
```
