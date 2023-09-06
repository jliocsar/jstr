<div align=center>

<img src=https://i.imgur.com/mB9u0ys.png width=140 />

# jstr

![CLI](https://img.shields.io/badge/cli-333?logo=gnubash&logoColor=fff)
![JavaScript](https://img.shields.io/badge/javascript-100%25-333?logo=javascript)
![Package size](https://img.shields.io/bundlejs/size/%40jliocsar/jstr?logo=npm)

_Simple JavaScript CLI tool to read and parse JSON files_

</div>

- 🪶 **Lightweight**: Tiny as f*ck, keeping it simple & straightforward;
- ⚡ **Fast**: Get parsed results or new JSON files in milliseconds;
- 🦣 **Functional**: Have the benefits of functional programming in your JSON parsing tool (see [ts-belt](https://mobily.github.io/ts-belt/));
- 🙅 **No BS**: Manipulate results with good ole' JavaScript, no need to learn cryptic languages/libraries -- use what fits you best.

## Description

`jstr` (**JS**ON S**tr**ingifier -- pronounced as _jester_) is a CLI tool built with JavaScript & [`ts-belt`](https://mobily.github.io/ts-belt/) to easily parse and manipulate JSON strings or files.

It was built when I first had the necessity of `JSON` methods from JavaScript without creating a script file, so I could copy & paste those JSON values one file to another. I coded the first POC in ~1 hour without any library and it already had its main premise: using pure JS to interact with JSON files, rather than having to learn new languages or library-specific BS to use such a simple concept.

This means that the command accepts a JavaScript callback function to parse/select/modify data structures within your JSON if necessary: follow the examples below, write JS and have fun!

_TL;DR This is a `JSON.parse`/`stringify` wrapper focused in CLI commands rather than JS scripts._

## Installation

```sh
npm i -g @jliocsar/jstr
```

To make sure it installed successfully:

```sh
jstr --version
```

## Usage

> **Note**
> `ts-belt` is exposed inside your parser function, you can use it to manipulate your JSON output, just call your usual namespaces, such as `D` or `A`.
> 
> You can also call `fetch` if your Node.js version supports it.

```sh
# Prints the help message w/ all available options
jstr --help

# Copies the content in `package.json` to the clipboard
jstr -c package.json

# Prints the content from `package.json` in a single line
jstr package.json

# Prints the content from `package.json` with 2 spaces
jstr -s=2 package.json

# Omit fields from the output
jstr -o=name,version package.json

# Prints the value of the key `"name"` in the `package.json` file
jstr package.json 'x => x.name'

# In case you need to use more lines for the snippet
jstr package.json \
"({ name }) => {
  const capitalized = name[0].toUpperCase() + name.slice(1)
  return capitalized
}"

# Fetching information with an async handler
jstr package.json \
"async x => {
  const packageJsonPath = x.homepage.replace('https://github.com', '') + '/main/package.json'
  const response = await fetch('https://raw.githubusercontent.com' + packageJsonPath)
  const data = await response.json()
  return { status: response.status, data }
}"

# Using ts-belt
jstr package.json "D.get('name')"

# Receiving input from a piped command
echo '{"name":"foo"}' | jstr -i 'x => x.name'
```

---

## Advanced Usage

### Map field names

The `-m`/`--map` option will rename fields using dot notation (see [Notation.js](https://www.npmjs.com/package/notation))

**Example:**

Input (`./package.json` file):

```json
{ "name": "Test", "devDependencies": { "pkg": "1.0.0" } }
```

```sh
jstr -s=2 -m='{"devDependencies.pkg":"devDependencies.foo"}' --prefix="bar:" package.json
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
node my-fetch-script.js | jstr -s=2 -i \
  -m='{"coordinates.longitude":"longitude","coordinates.latitude":"latitude"}' \
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
jstr -s=2 -m='{"devDependencies.pkg":"bar"}' --prefix="foo:" package.json \
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
jstr users.json "flow(A.map(D.get('friends')), A.flat)" --csv > users.csv
```

Output (`./users.csv` file):

```csv
name
Other
Some
Friend
```

## Benchmark

Simple operations are currently ~1.3x faster in `jstr` than in similar tools such as [`jq.node`](https://github.com/FGRibreau/jq.node):

![Benchmark results](https://i.imgur.com/ZJYD32m.png)

> **Important**
> 
> Keep in mind that `jstr` is a simpler tool right now, as it's still missing some core features like CSV outputs etc, so this might change a lot in the near future.

## To do

- [ ] Re-think on how [`Notation`](https://www.npmjs.com/package/notation#usage:~:text=To%20modify%20or%20build%20a%20data%20object%3A) is used and apply a good logic for all `set`/`get` (including arrays);
- [ ] Support require of user-defined modules?;
- [ ] Write docs;
- [ ] Get more coffee.

## Credits

[Logo icon by Flaticon](https://www.flaticon.com/free-icons/jester)
