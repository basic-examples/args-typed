import test from "node:test";
import assert from "node:assert/strict";
import util from "node:util";
import { command, commandGroup, run } from "../src/index";

interface OuterContext {
  ft: number;
}
interface AppContext {
  cwd?: string;
}

// Build copy command similar to sample, without exiting on --help
function makeCopy() {
  return command({ description: "Copy a file" })
    .positional("source", "The source file")
    .positional("destination", "The destination file")
    .option("h", "help", "Show help", "boolean")
    .option("f", "force", "Force overwrite", "boolean")
    .option("r", "recursive", "Copy recursively", "boolean")
    .build<AppContext, number>(
      (
        [source, destination],
        { help, force, recursive },
        { fullName, printDescription, context }
      ) => {
        if (help) {
          // In tests just print description instead of exiting
          printDescription(fullName);
          return 0;
        }
        console.log(
          `Copying ${source} to ${destination}${
            force || recursive
              ? `,${force ? " force" : ""}${recursive ? " recursive" : ""}`
              : ""
          }`
        );
        // return fixed number so we can assert on it
        return 42;
      }
    );
}

test("sample usage parses arguments and maps context", () => {
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...args: any[]) => {
    logs.push(util.format(...args));
  };
  let received: (OuterContext & AppContext) | undefined;

  const copy = makeCopy();
  const app = commandGroup<AppContext>({ description: "Sample app" })
    .command("copy", copy)
    .command("cp", copy)
    .option("C", "cwd", "change directory", "scalar")
    .build<OuterContext>(({ cwd }, { args, context }) => {
      received = { ...context, cwd };
      console.log("args:", args);
      return { ...context, cwd };
    });

  const result = run(app, ["-C", "dir", "copy", "a", "b"], { ft: 7 }, "app");

  console.log = orig;

  assert.equal(result, 42);
  assert.deepStrictEqual(received, { ft: 7, cwd: "dir" });
  assert.deepStrictEqual(logs, ["args: [ 'a', 'b' ]", "Copying a to b"]);
});
