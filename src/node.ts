import { CommandRegistration, run as runCommand } from ".";

export function run<Context, T>(
  cmd: CommandRegistration<Context, T>,
  context: Context,
  name: string
): T {
  return runCommand(cmd, process.argv.slice(2), context, name, process.exit);
}

export function handleHelp(
  help: true | undefined,
  printDescription: (fullName: string) => void,
  fullName: string
): void {
  if (help) {
    printDescription(fullName);
    process.exit(0);
  }
}
