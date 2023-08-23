# jstr 🪅

Simple JavaScript CLI tool to read, parse and manipulate JSON files.

## Usage

```sh
# Copies the content in `package.json` to the clipboard
jstr -c package.json

# Prints the content from `package.json` in a single line
jstr package.json

# Prints the content from `package.json` with 2 spaces
jstr -s=2 package.json

# Prints the value of the key `"private"` in the `package.json` file
jstr package.json "x => x.private"
```
