<div align="center">

# jstr 🍂

_Simple JavaScript CLI tool to read and parse JSON files_

</div>

Description says it all.

The CLI script file has ~2Kb when minified, so it's quite lightweight. It tries to use the least amount of dependencies possible to keep it as fast as possible too.

The JSON output can be manipulated using pure JS syntax by providing a parser handler in the format of a stringified JS function.

The parser handler also exposes [Ramda](https://ramdajs.com/) to easily parse strings/arrays if necessary (just use `R`).

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
