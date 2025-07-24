import { run, command, commandGroup } from "args-typed";

interface GlobalContext {
  resolve: (value: number) => void;
  reject: (reason: unknown) => void;
}

interface MathContext extends GlobalContext {}

const add = command({
  description: "Add two numbers",
  enableHelp: true,
})
  .positional("a", "The first number", parseInt)
  .positional("b", "The second number", parseInt)
  .build<MathContext>(([a, b], _, { context }) => {
    context.resolve(a + b);
  });

const math = commandGroup<MathContext>({
  description: "Math",
  enableHelp: true,
})
  .command("add", add)
  .build<GlobalContext>((_, { context }) => context);

new Promise<number | undefined>((resolve, reject) => {
  function onError(message: string): never {
    console.log(message);
    throw new Error("Should exit with code 1");
  }

  function onHelpOrVersion(message: string | undefined): never {
    if (message !== undefined) {
      console.log(message);
    }
    throw new Error("Should exit with code 0");
  }

  return run(
    math,
    process.argv.slice(2),
    { resolve, reject },
    "math",
    onError,
    onHelpOrVersion,
    onHelpOrVersion
  );
})
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
    } else {
      process.exit(1);
    }
  });
