import { command, commandGroup } from "args-typed";
import { run } from "args-typed/node";

interface OuterContext {
  ft: number;
}

interface AppContext {
  cwd?: string;
}

const copy = command({
  description: "Copy a file",
  enableHelp: true,
})
  .positional("source", "The source file")
  .positional("destination", "The destination file", undefined, false)
  .extra("more-destinations", "The destination files")
  .option("f", "force", "Force overwrite")
  .option("r", "recursive", "Copy recursively")
  .option(undefined, "dry-run", "Dry run")
  .build<AppContext, number>(
    ([source, destination], { force, recursive, "dry-run": dryRun }) => {
      console.log(
        `Copying ${source} to ${destination}${
          force || recursive
            ? `,${force ? " force" : ""}${recursive ? " recursive" : ""}`
            : ""
        }`
      );
      if (!dryRun) {
        console.log("without dry-run is not implemented");
        process.exit(1);
      }
      return 42;
    }
  );

const echo = command({
  description: "Shell echo replacement",
  enableHelp: true,
})
  .extra("messages", "messages to print")
  .option(
    "n",
    "no-trailing-newline",
    "Do not print a trailing newline",
    "boolean"
  )
  .option("e", "escape", "Escape special characters")
  .option("E", "no-escape", "Do not escape special characters")
  .option(undefined, "dump", "Dump parsed arguments")
  .option("C", "cwd", "cwd list for expansion for -e", "list")
  .option("d", "dummy", "Dummy option")
  .option("b", "bool", "Dummy boolean option")
  .option("j", "join-with", "Join with", "scalar")
  .build<AppContext, number>(
    (
      [...messages],
      {
        "no-trailing-newline": n,
        escape,
        "no-escape": E,
        dump,
        cwd,
        dummy,
        bool,
        "join-with": j,
      }
    ) => {
      if (escape && E) {
        console.error("Cannot use both -e and -E");
        process.exit(1);
      } else if (escape || n) {
        console.error("-e and -n are not implemented");
        process.exit(1);
      } else if (dump) {
        console.log({ messages, n, escape, E, dump, cwd, dummy, bool, j });
        process.exit(0);
      } else {
        console.log(messages.join(j ?? " "));
        return 0;
      }
    }
  );

const app = commandGroup<AppContext>({
  version: "0.0.0",
  description: "Sample app",
  enableHelp: true,
  enableVersion: true,
})
  .command("echo", echo)
  .command("copy", copy)
  .command("cp", copy)
  .option("C", "cwd", "change directory", "scalar")
  .build<OuterContext>(({ cwd }, { context }) => {
    return { ...context, cwd };
  });

run(app, { ft: 42 }, "app");
