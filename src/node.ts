import { CommandRegistration, run as runCommand } from ".";

export function run<Context, T>(
  cmd: CommandRegistration<Context, T>,
  context: Context,
  name: string
): T {
  function onError(message: string): never {
    console.log(message);
    process.exit(1);
  }

  function onHelpOrVersion(message: string | undefined): never {
    if (message !== undefined) {
      console.log(message);
    }
    process.exit(0);
  }

  return runCommand(
    cmd,
    process.argv.slice(2),
    context,
    name,
    onError,
    onHelpOrVersion,
    onHelpOrVersion
  );
}
