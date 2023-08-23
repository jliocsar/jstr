# jstr 🪴

Simple JavaScript CLI tool to read and parse JSON files.
It also allows you to manipulate the output itself by using JS syntax.

TL;DR This is a `JSON.parse`/`JSON.stringify` wrapper, used to facilitate interactions with JSON files.

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
```
