
/// # Options setting

/// `opts` is an object that can be used to set the same options as from the command line. See `docs_generator.md` for a list of possible command line options
/// Note: you should use the long options names as keys in the `opts` object. So, like
/// @lineblock{js} opts.verbose = true
/// *Not* like:
/// @lineblock{js} opts.v = true
/// See the `--help` option, and the [Command line argument processing](./docs_generator.md#command-line-argument-processing) section in `./docs_generator.md` for a list of all the option long names

// Here are (maybe) some helpful opts settings:
// opts.verbose = true
// opts.combined = true
// opts.extranewline = false
// opts.prefix = 'someprefix_'

/// # Function definitions

/// Prelude files like this can be used to define new functions to be used in interpolated forms like `\${foo(2, 3)}` (note, that form turns into `${foo(2, 3)}` when processed unescaped) defined like:
/// @recnext{js, function}
function foo(x, y) { return x * y }

/// # Shorthand forms

/// You can also define shorthand forms. For example, the above `foo` function can be called using a short-hand form shunt like:
/// @recstart{js, function}
function foo_sh(line, lineIndex, sourceLines, argString="", restOfLine="") {
  const args = argString.split(",").map(s=>eval(s))
  return foo(...args)
}
/// @recend

/// Note the signature for a shorthand form function is:
/// @lineblock{ts} function function(line: string, lineIndex: int, sourceLines: list(string), argString: string, restOfLine: string) -> any

/// Then we can define the shorthand form like:
/// @recnext{js}
shorthandFormFuncs.foo = 'foo_sh'
/// And then use it like `@foo{1, 2}` on a new line, which produces:
/// @foo{1, 2}
/// Note that shorthand forms must always appear at the start of a doc line, they can't be in the middle of one. Use interpolation like `\${foo(1, 2)}` to interpolate arbitrarily into a line