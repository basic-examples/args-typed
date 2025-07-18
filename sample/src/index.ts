import { run, command, commandGroup } from "args-typed";

interface OuterContext {
  ft: number;
}

interface AppContext {
  cwd?: string;
}

const copy = command({
  description: "Copy a file",
})
  .positional("source", "The source file")
  .positional("destination", "The destination file")
  .option("h", "help", "Show help", "boolean")
  .option("f", "force", "Force overwrite", "boolean")
  .option("r", "recursive", "Copy recursively", "boolean")
  .build<AppContext, number>(
    (
      [source, destination],
      { help, force, recursive },
      { fullName, printDescription }
    ) => {
      if (help) {
        printDescription(fullName);
        process.exit(0);
      }
      console.log(
        `Copying ${source} to ${destination}${
          force || recursive
            ? `,${force ? " force" : ""}${recursive ? " recursive" : ""}`
            : ""
        }`
      );
      return 42;
    }
  );

const echoTest = command({
  description: "Shell echo replacement",
})
  .extra("messages", "messages to print")
  .option("h", "help", "Show help", "boolean")
  .option(
    "n",
    "no-trailing-newline",
    "Do not print a trailing newline",
    "boolean"
  )
  .option("e", "escape", "Escape special characters", "boolean")
  .option("E", "no-escape", "Do not escape special characters", "boolean")
  .option(undefined, "dump", "Dump parsed arguments", "boolean")
  .option("C", "cwd", "cwd list for expansion for -e", "list")
  .option("d", "dummy", "Dummy option", "boolean")
  .option("b", "bool", "Dummy boolean option", "boolean")
  .build<AppContext, number>(
    (
      [...messages],
      {
        help,
        "no-trailing-newline": n,
        escape,
        "no-escape": E,
        dump,
        cwd,
        dummy,
        bool,
      },
      { fullName, printDescription }
    ) => {
      if (help) {
        printDescription(fullName);
        process.exit(0);
      }
      if (escape && E) {
        console.error("Cannot use both -e and -E");
        process.exit(1);
      }
      if (escape || n) {
        console.error("-e and -n are not implemented");
        process.exit(1);
      }
      if (dump) {
        console.log({ messages, n, escape, E, dump, cwd, dummy, bool });
        process.exit(0);
      }
      console.log(messages.join(" "));
      return 0;
    }
  );

const app = commandGroup<AppContext>({
  description: "Sample app",
})
  .command("copy", copy)
  .command("cp", copy)
  .command("echo", echoTest)
  .option("v", "version", "Show version", "boolean")
  .option("h", "help", "Show help", "boolean")
  .option("C", "cwd", "change directory", "scalar")
  .build<OuterContext>(
    ({ version, help, cwd }, { name, fullName, printDescription, context }) => {
      if (help) {
        console.log(`${name} version 0.0.0\n`);
        printDescription(fullName);
        process.exit(0);
      }
      if (version) {
        console.log(`${name} version 0.0.0`);
        process.exit(0);
      }
      return { ...context, cwd };
    }
  );

const givenArgs = process.argv.slice(2);
const sampleArgs = ["-C", "my_cwd", "copy", "-h", "a", "b"];
const args = givenArgs.length > 0 ? givenArgs : sampleArgs;

run(app, args, { ft: 42 }, "app");
