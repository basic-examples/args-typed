import { run, command, commandGroup } from "args-typed";
import { exit } from "process";

interface GlobalContext {
  resolve: (value: number | undefined) => void;
  reject: (reason: unknown) => void;
}

interface MathContext extends GlobalContext {
  exit: number | undefined;
}

const add = command({
  description: "Add two numbers",
})
  .positional("a", "The first number", parseInt)
  .positional("b", "The second number", parseInt)
  .option("h", "help", "Show help", "boolean")
  .build<MathContext>(
    ([a, b], { help }, { context, fullName, printDescription }) => {
      if (context.exit !== undefined) {
        context.resolve(undefined);
      }
      if (help) {
        printDescription(fullName);
        context.resolve(undefined);
      }
      context.resolve(a + b);
    }
  );

const math = commandGroup<MathContext>({
  description: "Math",
})
  .option("h", "help", "Show help", "boolean")
  .command("add", add)
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
  run(math, process.argv.slice(2), { resolve, reject }, "math")
)
  .then((result) => {
    if (result === undefined) {
      console.log("No result");
    } else {
      console.log(result);
    }
  })
  .catch((e) => {
    console.error(e);
    exit(1);
  });
