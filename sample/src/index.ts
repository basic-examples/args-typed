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

const app = commandGroup<AppContext>({
  description: "Sample app",
})
  .command("copy", copy)
  .command("cp", copy)
  .option("v", "version", "Show version", "boolean")
  .option("h", "help", "Show help", "boolean")
  .option("C", "cwd", "change directory", "scalar")
  .build<OuterContext>(
    (
      args,
      { version, help, cwd },
      { name, fullName, printDescription, context }
    ) => {
      console.log("args:", args);
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
