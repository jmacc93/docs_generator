# How it works

This program takes an input directory (default `./` -- the directory), a filename pattern (default `.*\..*` -- matches everything), an output directory (default: `./docs_output/`), and a line pattern (default: `\s*\/\/\/\s?(.*)` -- matches /// lines), and generates a documentation file in the output directory for each input file. It does this by evaluating the found documentation lines as javascript backtick strings (which support expression interpolation) and adding the resulting strings into the output files

The documentation for this program was produced using this program applied to itself. See `docs_generator.js` and look for the `///` line comments

# Command line argument processing



```
print(`docs_generator.js [--dir / -d string] [--out / -o string] [--files / -f string] [--lines / -l string] [--test / -t string] [--list / -L boolean] [--combined / -c] [--verbose / -v] [--extranewline / -n] [--prefix / -p string] [--help / -h]

Note: these options can also be set in a prelude file given with \`--prelude\` or in the default \`docs_prelude.js\` file if no \`--prelude\` file is given

-l
--lines string
Required
line comment regex pattern

-d
--dir string
      default: "./
      directory to scan

-o
--out string
      default: "./docs_output/"
      output directory

-f
--files string
      default: ".*\\..*"
      file regex pattern

-t
--test string
      test line. If given the program tests the given \`--lines\` pattern against it

-L
--list boolean
      default: false
      Only list files matched by the given \`--files\` pattern

-c
--combined boolean
      default: false
      Generate combined documentation. ie: Don't make doc files for each input file

-v
--verbose boolean
      default: false
      Verbose mode
      This prints each found doc line along with its line number

-n
--extranewline boolean
      default: true
      Add an extra newline after each doc line

-p
--prefix string
      Add a prefix to each output doc file name

-P
--prelude string
      default: "./docs_prelude.js"
      Should be a path to prelude file
      This file is executed in the global scope before the rest of the program

-h
--help boolean
      default: false
      Show this help
`)
```

# Helper functions

The functions are available for prelude files

```ts
function eachFileFrom(dirPath: string, fileRegex: RegExp) -> list(string)
```

Yields each non-directory file matching the `fileRegex` pattern in the given `dirPath` (recursively)

```ts
function echo(x: any) -> any
```

Prints `x`. For debugging

```ts
function nextLineStartingWith(fromIndex: int, lines: string[], pattern: string) -> int
```

Returns the index of the next line that starts with `pattern`

```ts
function splitArgStringIntoList(argString: string) -> list(string)
```

This returns the `argString` split by `,`

```ts
function sliceOfStart(argString: string, pattern: string | RegExp) -> list(string)
```

Slice off the match `pattern` from start of the given string `str`

```ts
function escapeSingleQuotes(text: string) -> string
```

Escapes single quotes in `text`

```ts
function escapeBacktickQuotes(text: string) -> string
```

Escapes backtick quotes in `text`

# Prelude execution

Given a prelude file (via the `--prelude` / `-P` option, or the default `docs_prelude.js`), the program evaluates the prelude file in the global scope. It can be used to set options and define new functions and shorthand forms

See the default `docs_prelude.md` for documentation for prelude files

The `opts` variable is the prelude options and is available in a given prelude file. The `opts` object allows using prelude files to set options instead of on the command line

The `shorthandFormFuncs` object is used to define shorthand forms. It maps shorthand names (eg: `recnext`) to the actual function names to call (eg: `recnext`, which has the same name as its shorthand name)

# Shorthand expansion

Shorthand expansions are patterns like `@recstart` that expand to a function call like: 

```
${patternHead(lineText, lineIndex, sourceLines, argString, restOfLine) ?? ""}
```

Patterns of the form `@head{arg1, arg2, ...}` are shorthand forms that take arguments

New shorthand forms can be defined in a prelude file (see [here](./docs_prelude.md#shorthand-forms))

## @recnext

The pattern `@recnext` records the line immediately following in a code block

The pattern `@recnext{name}` records the line immediately following in a code block with language `name`

The pattern `@recnext{name, lineStart}` searches for the next line that starts with `lineStart`, and records that

It looks like this: (the following line uses `@recnext{js, function}`)

```js
function recnext(line, lineIndex, sourceLines, argString) {
```

## @recstart, @recend

The pattern `@recstart` is to start a verbatum copy of a source code block into a markdown code block. The end of a block started with `@recstart` is marked with `@recend`

The pattern `@recstart{name}` records using a block name `name`

The pattern `@recstart{name, lineStart}` searches for the next line that starts with `lineStart`, and records from there



```js
function recstart(line, lineIndex, sourceLines, argString) {
  const [blockLang = "", lineStartArg = undefined] = splitArgStringIntoList(argString)
  if(lineStartArg != undefined)
    blockRecStartIndex = nextLineStartingWith(lineIndex, sourceLines, lineStartArg)
  else
    blockRecStartIndex = lineIndex+1
  blockRecName = blockLang
  return undefined
}
```

The pattern `@recend` ends a block started with `@recstart` on the previous line

The pattern `#lineblock xyz...` is like `xyz...` but in a code block

ie: `#lineblock xyz...` turns into `\`\`\`\nxyz...\n\`\`\``

Eg, the following line `@lineblock xyz abc` turns into:

```
xyz abc
```

# Text processing

```ts
function processText(text: string) -> string
```

  * Finds doc lines using the doc line pattern, then for each:

    + Converts shorthand forms `@abc{...}` and `@abc` into interpolated function calls

    + `eval`s the resulting line

  * Joins all the lines and returns the result