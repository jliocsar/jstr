<div align=center>

<img src=.github/static/jester.png width=140 />

# jstr

_Simple JavaScript CLI tool to read and parse JSON files_

</div>

- 🪶 **Lightweight**: ~3.5kb when minified, keeping it simple & straightforward;
- ⚡ **Fast**: Get parsed results or new JSON files in milliseconds;
- 🦣 **Functional**: Have the benefits of functional programming in your JSON parsing tool (see [Ramda](https://ramdajs.com/));
- 🙅 **No BS**: Manipulate results with good ole' JavaScript, no need to learn cryptic languages/libraries -- use what fits you.

## Description

`jstr` (**JS**ON S**tr**ingifier -- pronounced as _jester_) is a CLI tool built with JavaScript & [Ramda](https://github.com/ramda/ramda) to easily parse and manipulate JSON strings or files.

It was built when I first had the necessity of `JSON` methods from JavaScript without creating a script file, so I could copy & paste those JSON values one file to another. I coded the first POC in ~1 hour and it already had its main premise: using pure JS to interact with JSON files, rather than having to learn new languages or library-specific BS to use such a simple concept.

This means that the command accepts a JavaScript callback function to parse/select/modify data structures within your JSON if necessary: follow the examples below, write JS and have fun!

_TL;DR This is a `JSON.parse`/`stringify` wrapper focused in CLI commands rather than JS scripts._

## Usage

> **Note**
> Ramda is exposed as `R` inside your parser function, you can use it to manipulate your JSON output.

```sh
# Copies the content in `package.json` to the clipboard
jstr -c package.json

# Prints the content from `package.json` in a single line
jstr package.json

# Prints the content from `package.json` with 2 spaces
jstr -s=2 package.json

# Prints the value of the key `"name"` in the `package.json` file
jstr package.json 'x => x.name'

# In case you need to use more lines for the snippet
jstr package.json \
"({ name }) => {
  const capitalized = name[0].toUpperCase() + name.slice(1)
  return capitalized
}"

# Using Ramda to manipulate the output
jstr package.json \
"x => {
  const withNewPrefix = R.replace('{name}', R.__, 'new-{name}')
  return withNewPrefix(x.name)
}"

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
node my-fetch-script.js | jstr -i \
  -s=2 \
  -m='{"coordinates.longitude":"longitude","coordinates.latitude":"latitude"}' \
  '({ latitude, longitude }) => [latitude, longitude]'
  # If you don't want to mess around with the mapping of fields,
  # you can just use pure JS instead and skip the `-m` option`:
  # ({ coordinates: { latitude, longitude } }) => [latitude, longitude]
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

## Benchmarks

Currently basic operations are ~2.5x faster in `jstr` vs [`jq.node`](https://github.com/FGRibreau/jq.node).

Keep in mind `jstr` is still a relatively simpler tool, so this benchmark might change in the future.

![Benchmark](/.github/static/benchmark.png)

## To do

- [ ] Release as a binary on `npm`
- [ ] Try to make the `bin` smaller in size
- [ ] Release macOS & Linux builds
- [ ] Make this thing run faster
- [ ] Support require of user-defined modules?
- [ ] Get more coffee

## Credits

[Logo icon by Flaticon](https://www.flaticon.com/free-icons/jester)
