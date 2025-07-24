import { run, command, commandGroup } from "args-typed";

interface GlobalContext {
  resolve: (value: number) => void;
  reject: (reason: unknown) => void;
}

interface MathContext extends GlobalContext {}

const add = command({
  description: "Add two numbers",
})
  .positional("a", "The first number", parseInt)
  .positional("b", "The second number", parseInt)
  .option("h", "help", "Show help")
  .build<MathContext>(
    ([a, b], { help }, { context, fullName, printDescription }) => {
      if (help) {
        printDescription(fullName);
        throw new Error("Should exit with code 0");
      }
      context.resolve(a + b);
    }
  );

const math = commandGroup<MathContext>({
  description: "Math",
})
  .option("h", "help", "Show help")
  .command("add", add)
  .build<GlobalContext>(({ help }, { context, fullName, printDescription }) => {
    if (help) {
      printDescription(fullName);
      throw new Error("Should exit with code 0");
    }
    return {
      ...context,
    };
  });

new Promise<number | undefined>((resolve, reject) =>
  run(math, process.argv.slice(2), { resolve, reject }, "math", (code) => {
    throw new Error(`Should exit with code ${code}`);
  })
)
  .then((result) => {
    if (result === undefined) {
      console.log("No result");
    } else {
      console.error(result);
    }
  })
  .catch((e) => {
    if (e.message === "Should exit with code 0") {
      process.exit(0);
    }
    console.error(e);
    process.exit(1);
  });
