

// gaze -r -c "node {{file}}" docs_generator.js

// import arg processor
const {parseArgs} = require('node:util')
const path = require('path')
const fs = require('fs');

const print = console.log

// ------------------------------

/// # How it works

/// This program takes an input directory (default `./` -- the directory), a filename pattern (default `.*\\..*` -- matches everything), an output directory (default: `./docs_output/`), and a line pattern (default: `\\s*\\/\\/\\/\\s?(.*)` -- matches /// lines), and generates a documentation file in the output directory for each input file. It does this by evaluating the found documentation lines as javascript backtick strings (which support expression interpolation) and adding the resulting strings into the output files

/// The documentation for this program was produced using this program applied to itself. See `docs_generator.js` and look for the `///` line comments

/// # Command line argument processing

const parseArgsResults = parseArgs({
  options: {
    'dir':          { type: 'string' , default: "./"                          , short: 'd' },
    'out':          { type: 'string' , default: "./docs_output/"              , short: 'o' },
    'files':        { type: 'string' , default: String.raw`.*\..*`            , short: 'f' },
    'lines':        { type: 'string' , default: String.raw`\s*\/\/\/\s?(.*)`  , short: 'l' },
    'test':         { type: 'string'                                          , short: 't' },
    'list':         { type: 'boolean', default: false                         , short: 'L' },
    'combined':     { type: 'boolean', default: false                         , short: 'c' },
    'verbose':      { type: 'boolean', default: false                         , short: 'v' },
    'extranewline': { type: 'boolean', default: true                          , short: 'n' },
    'prefix':       { type: 'string' , default: ""                            , short: 'p' },
    'prelude':      { type: 'string' , default: "./docs_prelude.js"           , short: 'P' },
    'help':         { type: 'boolean'                                         , short: 'h' },
  },
  allowPositionals: true,
  tokens: true
});

const argValues = parseArgsResults.values
const argPositions = parseArgsResults.positionals
const tokens = parseArgsResults.tokens.map(x => x.rawName)

if(tokens.indexOf('--list') != -1 || tokens.indexOf('-L') != -1)
  argValues.list = true
if(tokens.indexOf('--combined') != -1 || tokens.indexOf('-c') != -1)
  argValues.combined = true
if(tokens.indexOf('--verbose') != -1 || tokens.indexOf('-v') != -1)
  argValues.verbose = true

if(tokens.indexOf('--help') != -1 || tokens.indexOf('-h') != -1) {
/// @recstart
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
/// @recend
process.exit(0)
}


/// # Helper functions

/// The functions are available for prelude files

/// @lineblock{ts} function eachFileFrom(dirPath: string, fileRegex: RegExp) -> list(string)
/// Yields each non-directory file matching the `fileRegex` pattern in the given `dirPath` (recursively)
function* eachFileFrom(dirPath, fileRegex) {
  for(const file of fs.readdirSync(dirPath, {recursive: true})) {
    const baseName = path.basename(file)
    if(fs.lstatSync(file).isDirectory())
    continue
  if(fileRegex.test(baseName))
      yield file
  }
}


/// @lineblock{ts} function echo(x: any) -> any
/// Prints `x`. For debugging
function echo(x) { print(x); return x }

/// @lineblock{ts} function nextLineStartingWith(fromIndex: int, lines: string[], pattern: string) -> int
/// Returns the index of the next line that starts with `pattern`
function nextLineStartingWith(fromIndex, lines, pattern) {
  const patRegex = new RegExp("^" + pattern)
  for(let i = fromIndex + 1; i < lines.length; i++) {
    if(patRegex.test(lines[i]))
      return i
  }
}

/// @lineblock{ts} function splitArgStringIntoList(argString: string) -> list(string)
/// This returns the `argString` split by `,`
function splitArgStringIntoList(argString) {
  return argString.split(/\s*,\s/)
}

/// @lineblock{ts} function sliceOfStart(argString: string, pattern: string | RegExp) -> list(string)
/// Slice off the match `pattern` from start of the given string `str`
function sliceOffStart(str, pattern) {
  const [wholeMatch] = str.match(pattern)
  const patternRegex = new RegExp(pattern)
  if(wholeMatch == null)
    return str
  else
    return str.slice(wholeMatch.length)
}

/// @lineblock{ts} function escapeSingleQuotes(text: string) -> string
/// Escapes single quotes in `text`
function escapeSingleQuotes(text) {
  return text.replaceAll(/(?<!\\)'/g, "\\'")
}

/// @lineblock{ts} function escapeBacktickQuotes(text: string) -> string
/// Escapes backtick quotes in `text`
function escapeBacktickQuotes(text) {
  return text.replaceAll(/(?<!\\)`/g, "\\`")
}

/// # Prelude execution

/// Given a prelude file (via the `--prelude` / `-P` option, or the default `docs_prelude.js`), the program evaluates the prelude file in the global scope. It can be used to set options and define new functions and shorthand forms
/// See the default `docs_prelude.md` for documentation for prelude files

/// The `opts` variable is the prelude options and is available in a given prelude file. The `opts` object allows using prelude files to set options instead of on the command line
const opts = {} // prelude options

/// The `shorthandFormFuncs` object is used to define shorthand forms. It maps shorthand names (eg: `recnext`) to the actual function names to call (eg: `recnext`, which has the same name as its shorthand name)
shorthandFormFuncs = Object.assign(globalThis.shorthandFormFuncs ?? {}, {
  recnext: "recnext",
  recstart: "recstart",
  recend: "recend",
  loclink: "loclink",
  lineblock: "lineblock",
})

// prelude file exists?
if(fs.existsSync(argValues.prelude)) {
  const prelude = fs.readFileSync(argValues.prelude, 'utf8')
  eval(prelude)
}

for(const key in opts)
  argValues[key] = opts[key]

const inputDir       = argPositions[0] ?? argValues.dir
const filePattern    = argPositions[1] ?? argValues.files
const outputDir      = argPositions[2] ?? argValues.out
const fileRegex      = new RegExp(filePattern)
const docLinePattern = argValues.lines
const docLineRegex   = new RegExp(docLinePattern)
const verbose        = argValues.verbose
const lineJoiner     = argValues.extranewline ? "\n\n" : "\n"

if(argValues.list) {
  for(const file of eachFileFrom(inputDir, fileRegex))
    print(file)
  process.exit(0)
}

// check if output dir exists
if (!fs.existsSync(outputDir))
  fs.mkdirSync(outputDir)

const test = argValues.test
if(test != undefined && test != "") {
  print(docLineRegex.exec(argValues.test))
  process.exit(0)
}

/// # Shorthand expansion
/// Shorthand expansions are patterns like `@recstart` that expand to a function call like: 
/// @lineblock \${patternHead(lineText, lineIndex, sourceLines, argString, restOfLine) ?? ""}
/// Patterns of the form `@head{arg1, arg2, ...}` are shorthand forms that take arguments

/// New shorthand forms can be defined in a prelude file (see [here](./docs_prelude.md#shorthand-forms))

/// ## @recnext
/// The pattern `@recnext` records the line immediately following in a code block
/// The pattern `@recnext{name}` records the line immediately following in a code block with language `name`
/// The pattern `@recnext{name, lineStart}` searches for the next line that starts with `lineStart`, and records that
/// It looks like this: (the following line uses `@recnext{js, function}`)
/// @recnext{js, function}
function recnext(line, lineIndex, sourceLines, argString) {
  const [blockLang = "", lineStartArg = undefined] = splitArgStringIntoList(argString)
  let lineToRecordIndex = lineIndex+1
  if(lineStartArg != undefined)
    lineToRecordIndex = nextLineStartingWith(lineIndex, sourceLines, lineStartArg)
  return `\`\`\`${blockLang}\n${sourceLines[lineToRecordIndex]}\n\`\`\``
}

/// ## @recstart, @recend
/// The pattern `@recstart` is to start a verbatum copy of a source code block into a markdown code block. The end of a block started with `@recstart` is marked with `@recend`
/// The pattern `@recstart{name}` records using a block name `name`
/// The pattern `@recstart{name, lineStart}` searches for the next line that starts with `lineStart`, and records from there
/// @recstart{js, function}
let blockRecStartIndex = undefined
let blockRecName = ""
function recstart(line, lineIndex, sourceLines, argString) {
  const [blockLang = "", lineStartArg = undefined] = splitArgStringIntoList(argString)
  if(lineStartArg != undefined)
    blockRecStartIndex = nextLineStartingWith(lineIndex, sourceLines, lineStartArg)
  else
    blockRecStartIndex = lineIndex+1
  blockRecName = blockLang
  return undefined
}
/// @recend

/// The pattern `@recend` ends a block started with `@recstart` on the previous line
function recend(line, lineIndex, sourceLines) {
  return `\`\`\`${blockRecName}\n${sourceLines.slice(blockRecStartIndex, lineIndex).join("\n")}\n\`\`\``
}

// #TODO:
// function loclink(line, lineIndex, sourceLines) {
//   return "[link](...)"
// }

/// The pattern `#lineblock xyz...` is like `xyz...` but in a code block
/// ie: `#lineblock xyz...` turns into `\\\`\\\`\\\`\\nxyz...\\n\\\`\\\`\\\``
/// Eg, the following line `@lineblock xyz abc` turns into:
/// @lineblock xyz abc
function lineblock(line, lineIndex, sourceLines, argString="", restOfLine="") {
  // return ```${argString}\n${1}\n```
  return `\`\`\`${argString}\n${restOfLine.trim()}\n\`\`\``
}

function replaceShorthandForms(text, lineIndex) {
  // return text.replaceAll(/^\s*@(\w+)(?:{(.*)}|)/g, function(wholeMatch, headGroup, argString = "") {
  return text.replaceAll(/^\s*@(?<head>\w+)(?:{(?<args>.*)}|)(?<rest>.*)$/g, function(wholeMatch, /*...*/) {
    const groups = arguments[arguments.length-1] // last argument is the capture group object
    const {head, args = "", rest = ""} = groups
    const funcName = shorthandFormFuncs[head]
    if(funcName == undefined)
      return `ERROR: Unrecognized special form: ${head} on line ${lineIndex+1}`
    else
      return `\${${funcName}(lineText, lineIndex, sourceLines, \'${escapeSingleQuotes(args)}\', \'${escapeSingleQuotes(rest ?? "")}\') ?? ""}`
  })
}

function normalizeLine(text, lineIndex) {
  return escapeBacktickQuotes(replaceShorthandForms(text, lineIndex))
}

/// # Text processing

/// @lineblock{ts} function processText(text: string) -> string
///   * Finds doc lines using the doc line pattern, then for each:
///     + Converts shorthand forms `@abc{...}` and `@abc` into interpolated function calls
///     + `eval`s the resulting line
///   * Joins all the lines and returns the result
function processText(text) {
  const sourceLines = text.split("\n")
  const docLines = []
  for(const [lineIndex, lineText] of sourceLines.entries()) {
    const lineNumber = lineIndex + 1
    const lineMatch =  docLineRegex.exec(lineText)
    if(lineMatch == undefined)
      continue
    const docPart = lineMatch[1]
    if(verbose)
      print(lineNumber, `"${docPart}"`)
    try {
      const evalResult = eval(`\`${normalizeLine(docPart, lineIndex)}\``)
      if(evalResult != undefined)
        docLines.push(evalResult)
    } catch(exc) {
      print("Error in line \"", docPart, "\", line number ", lineNumber," :", exc)
    }
  }
  return docLines.join(lineJoiner)
}

if(argValues.combined) { // all output combined into one file (argValues.out + ".md")
  let segs = []
  for(const file of eachFileFrom(inputDir, fileRegex))
    segs.push(processText(fs.readFileSync(file).toString('utf8')))
  fs.writeFileSync(argValues.out + ".md", segs.join('\n'))
} else { // each input file gets its own output file in given output directory
  for(const file of eachFileFrom(inputDir, fileRegex)) {
    const payload = processText(fs.readFileSync(file).toString('utf8'))
    const basename = path.basename(file, path.extname(file))
    fs.writeFileSync(path.join(outputDir, basename + ".md"), payload)
  }
}
