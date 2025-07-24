# `args-typed` – Type-Safe CLI Argument Parser

A clean, dependency-free argument parser with full static typing in TypeScript.  
Define commands with options, positional arguments, extras, and subcommands—all checked at compile time.

## Why Use `args-typed`?

- **Fully Type-Safe:**
  Arguments, options, extras, and subcommands are all typed at definition.
- **No Dependencies:**
  Zero runtime dependencies. Lightweight and reliable.
- **Help Generation:**
  Automatically generates descriptions and help messages.
- **Controlled Execution:**
  No automatic `process.exit()` — you control behavior explicitly.
- **Extensible Context:**
  Access metadata like command name and help printer during execution.

## Example Usage

```ts
import { command } from "args-typed"; // args parser in pure ts
import { run } from "args-typed/node"; // nodejs-specific utils

const rm = command({
  description: "Remove files",
})
  .extra("files", "Files to remove")
  .option("h", "help", "Show help")
  .option("f", "force", "Force remove")
  .option("r", "recursive", "Remove recursively")
  .option("S", "skip", "Patterns to exclude", "list", parseGlob)
  .build(
    (
      [...files], // Typed positional arguments
      { help, force, recursive, skip }, // Typed options
      { fullName, printDescription } // Context
    ) => {
      handleHelp(help, printDescription, fullName);
      // Main logic here
    }
  );

run(rm, undefined, "rm");
```

## Key Features

- **Full Type Safety**
  - Positional arguments (required and optional)
  - Options (flags and values)
  - Extra arguments (optional)
  - Subcommands (nested)
- **Zero Dependencies**
- **Auto-Generated Help**
- **Controlled Execution**
  - No forced `process.exit()` on help or error unless explicitly coded
- **Extensible Context Handling**

### Full Type Safety

You can notice that your usage is incorrect before you even run the code.

For example:

```ts
const rm = command({ description: "Remove files" })
  .extra("files", "Files to remove")
  .extra("error", "extra cannot be used multiple times")
  // type error occurs here
  .option("h", "help", "Show help")
```

#### Positional Arguments

Arbitrary positional arguments are accepted unless required is after optional.

usage: `positional(name, description, parse?, required = true)`

```ts
const myRenderer = command({ description: "My own renderer" })
  .positional("scene", "The scene file to render")
  .positional("output", "The output file", /* you can pass a parse function */)
  .positional("cwd", "Change working directory", undefined, false) // optional
```

#### Options

Duplicate names are not allowed. All options are optional.

usage: `option(short?, long, description, type?, parse?)`

```ts
const exec = command({ description: "execute a command with env variables" })
  .option("h", "help", "Show help", "boolean") /* type: boolean/scalar/list */
  .option("v", "version", "Show version") /* type="boolean" can be omitted */
  .option(undefined, "dry-run", "Dry run") /* optional short form */
  .option("e", "env", "Environment variables", "list", parseEnv) /* parse fn */
```

#### Extra Arguments

Extra arguments are positional arguments after last named positional arguments.

usage: `extra(name, description, parse?)`

```ts
const myCommand = command({ description: "My own command" })
  .positional("required", "required positional argument")
  .positional("optional", "optional positional argument", () => 42, false)
  .extra("extra", "extra positional argument")
  .build(([required, optional, ...extra]) => { /* string, number, string[] */ })
```

#### Subcommands

Commands, and command groups can be nested in command groups.

```ts
const nested = command({ description: "Nested command" }).build(/* ... */);
const app = commandGroup({ description: "Main app" })
  .command("nested", nested)
  .option("h", "help", "Show help")
```

### Extensible Context Handling

You can set a context type on building a command group/command, or creating a command group.

It's useful when you want to pass a context to a subcommand.

```ts
interface GlobalContext {
  resolve: (value: number | undefined) => void;
  reject: (reason: unknown) => void;
}

interface AppContext extends GlobalContext {
  exit: number | undefined;
}

const app = commandGroup<AppContext>({
  description: "Main app",
})
  .option("h", "help", "Show help")
  .command("subcommand", subcommand) // subcommand's context must be AppContext
  .build<GlobalContext>(({ help }, { context, fullName, printDescription }) => {
    if (help) {
      printDescription(fullName);
    }
    return {
      ...context,
      exit: help ? 0 : undefined,
    };
  });

new Promise<number | undefined>((resolve, reject) =>
  run(app, process.argv.slice(2), { resolve, reject }, "app", (code) => {
    throw new Error(`Help with code ${code}.`);
  })
)
```

## Design Goals Recap

- Detect invalid usage at compile time
- Keep runtime simple and transparent
- Favor explicit control over hidden behavior

If you want a modern, predictable CLI parser for Node.js with zero runtime surprises, `args-typed` is designed for you.

## License

MIT
