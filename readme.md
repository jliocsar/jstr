<div align=center>

<img src=https://i.imgur.com/LIN9cMA.png width=140 />

# jstr

[![Documentation](https://img.shields.io/badge/docs-fff?logo=gitbook&logoColor=black&style=flat-square)](https://jliocsar.gitbook.io/jstr)
[![JavaScript](https://img.shields.io/badge/javascript-100%25-fff?logo=javascript&style=flat-square&labelColor=black)](#)
[![Package size](https://img.shields.io/npm/v/%40jliocsar/jstr?logo=npm&style=flat-square&color=fff&labelColor=black)](https://www.npmjs.com/package/@jliocsar/jstr)

_Simple JavaScript CLI tool to read and parse JSON files_

</div>

- 🪶 **Lightweight**: Tiny as f*ck, keeping it simple & straightforward;
- ⚡ **Fast**: Get parsed results or new JSON files in milliseconds;
- 🦣 **Functional**: Have the benefits of functional programming in your JSON parsing tool (see [`ts-belt`](https://mobily.github.io/ts-belt/));
- 🙅 **No BS**: Manipulate results with good ole' JavaScript, no need to learn cryptic languages/libraries -- use what fits you best.

## Description

**JS**ON S**tr**ingifier (`jstr`, pronounced as _jester_) is a CLI tool built with JavaScript & [`ts-belt`](https://mobily.github.io/ts-belt/) to easily parse and manipulate JSON strings or files.

It is a `JSON.parse`/`stringify` wrapper focused in CLI commands rather than JS scripts.

## Requirements

To run `jstr`, you must have either [Node.js](https://nodejs.org/en/blog/release/v18.0.0) or [Bun](https://bun.sh/blog/bun-v1.0) ^v1.0.0 installed.

## Installation

```sh
npm i -g @jliocsar/jstr
```

To make sure it installed successfully:

```sh
jstr --version
```

### Bun version

`jstr` also exposes a version to run with [`Bun`](https://github.com/oven-sh/bun):

```sh
jstr.bun --version
```

---

## Usage

### [Documentation](https://jliocsar.gitbook.io/jstr/)

Make sure you read the docs! It has all the details about each command option and such.

### Map field names

The `-m`/`--map` option will rename fields using dot notation (see [Notation.js](https://www.npmjs.com/package/notation))

**Example:**

Input (`./package.json` file):

```json
{ "name": "Test", "devDependencies": { "pkg": "1.0.0" } }
```

```sh
jstr -s 2 -m '{"devDependencies.pkg":"devDependencies.foo"}' --prefix "bar:" package.json
```

Output:

```json
{
  "abc:name": "Test",
  "abc:devDependencies": { "foo": "1.0.0" }
}
```

### Read from `stdin` (pipe commands)

The `-i`/`--input` option will read the JSON data from `stdin` rather than the file provided:

**Example:**

Input (Output from running `my-fetch-script.js`):

```json
{
  "coordinates": {
    "latitude": 20,
    "longitude": 20
  }
}
```

```sh
node my-fetch-script.js | jstr -s 2 -i \
  -m '{"coordinates.longitude":"longitude","coordinates.latitude":"latitude"}' \
  '({ latitude, longitude }) => [latitude, longitude]'
```

If you don't want to mess around with the mapping of fields,
you can just use pure JS instead and skip the `-m` option`:

```js
({ coordinates: { latitude, longitude } }) => [latitude, longitude]
```

**Output:**

```json
[20, 20]
```

### Evolve JSON files

You can also use `jstr` to remake JSON files:

**Example:**

Input (`./package.json` file):

```json
{ "name": "Test", "devDependencies": { "pkg": "1.0.0" } }
```

```sh
jstr -s 2 -m '{"devDependencies.pkg":"bar"}' --prefix "foo:" package.json \
  "x => {
    x['foo:name'] = x['foo:name'].toUpperCase()
    return x
  }" > my-new-file.json
```

Output (`./my-new-file.json` file):

```json
{
  "foo:name": "TEST",
  "foo:bar": "1.0.0"
}
```

### CSV Output

You can provide the `--csv` flag to format the output to CSV:

**Example:**

Input (`./users.json` file):

```json
[
  {
    "name": "Tiny",
    "age": 27,
    "friends": [{ "name": "Other" }]
  },
  {
    "name": "Tim",
    "age": 28,
    "friends": [
      { "name": "Some" },
      { "name": "Friend" }
    ]
  }
]
```

```sh
jstr users.json --csv "flow(A.map(D.get('friends')), A.flat)" > users.csv
```

Output (`./users.csv` file):

```csv
name
Other
Some
Friend
```

### API Usage

You can call `jstr` from your Node.js script through its API:

**Example:**

```js
const { jstr } = require('@jliocsar/jstr/api')

;(async () => {
  console.log(await jstr(
    './my-file.json',
    "x => x['foo:name']",
    { prefix: 'foo:' }
  ))
})()
```

## To do

- [ ] Support require of user-defined modules?;
- [ ] Get more coffee.

## Credits

[Logo icon from Freepik](https://www.freepik.com/)
