import {
  CommandContext,
  CommandGroupContext,
  CommandRegistration,
  run as runCommand,
} from ".";

export function run<Context, T>(
  cmd: CommandRegistration<Context, T>,
  context: Context,
  name: string
): T {
  return runCommand(cmd, process.argv.slice(2), context, name, process.exit);
}

export function handleVersion(
  version: true | undefined,
  getVersion: (name: string) => string | undefined,
  name: string
): void {
  if (version) {
    console.log(getVersion(name));
  }
}

export function handleHelp(
  help: true | undefined,
  getHelp: (name: string, fullName: string) => string,
  name: string,
  fullName: string
): void {
  if (help) {
    console.log(getHelp(name, fullName));
    process.exit(0);
  }
}

export function handleVersionAndHelp(
  { version, help }: { version: true | undefined; help: true | undefined },
  {
    getVersion,
    getHelp,
    name,
    fullName,
  }: CommandContext<any, unknown> | CommandGroupContext<any, unknown>
): void {
  handleVersion(version, getVersion, name);
  handleHelp(help, getHelp, name, fullName);
}
