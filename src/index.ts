interface PositionalData {
  name: string;
  description: string;
  parse: (value: string) => unknown;
}

type ExtraPositionalData<T> = {
  parse: (value: string) => T;
  name: string;
  description: string;
};

interface OptionData {
  type: OptionType;
  short: ShortAllowed | undefined;
  description: string;
}

type OptionType =
  | { type: "boolean" }
  | { type: "scalar"; parse: (value: string) => unknown }
  | { type: "list"; parse: (value: string) => unknown };

type Options<T extends Partial<Record<string, OptionType>>> = {
  [K in keyof T]: T[K] extends { type: "boolean" }
    ? true | undefined
    : T[K] extends { type: "scalar" }
    ? ReturnType<T[K]["parse"]>
    : T[K] extends { type: "list" }
    ? ReturnType<T[K]["parse"]>[]
    : never;
};

export interface CommandContext<Context, T> {
  name: string;
  fullName: string;
  args: string[];
  context: Context;
  self: (args: string[], context: Context, name: string, fullName: string) => T;
  help: (name: string, fullName: string) => void;
}

type CommandRegistration<Context, T> = (
  args: string[],
  context: Context,
  name: string,
  fullName: string
) => T;

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class Command<
  const RequiredPositionalCount extends number,
  const Positional extends unknown[],
  const LongOptions extends Partial<Record<string, OptionType>>,
  const ShortOptions extends Partial<Record<string, string>>,
  const ExtraPositional extends unknown
> {
  private constructor(
    private readonly version: string | undefined,
    private readonly description: string,
    private readonly requiredPositionalCount: RequiredPositionalCount,
    private readonly positionalData: PositionalData[],
    private readonly optionsData: Partial<Record<string, OptionData>>,
    private readonly shortOptions: ShortOptions,
    private readonly extraPositional: [ExtraPositional] extends [never]
      ? undefined
      : ExtraPositionalData<ExtraPositional>,
    private readonly parseOptions: {
      allowOptionAfterPositional?: boolean;
      allowDuplicateOptions?: boolean;
    }
  ) {}

  public static command({
    version,
    description,
    ...options
  }: {
    version?: string;
    description: string;
    allowOptionAfterPositional?: boolean;
  }): Command<0, [], {}, {}, never> {
    return new Command(version, description, 0, [], {}, {}, undefined, options);
  }

  public positional<T>(
    name: string,
    description: string,
    parse: (value: string) => T
  ): RequiredPositionalCount extends Positional["length"]
    ? Command<
        [...Positional, T]["length"],
        [...Positional, T],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
  public positional<T>(
    name: string,
    description: string,
    parse: (value: string) => T,
    required: true
  ): RequiredPositionalCount extends Positional["length"]
    ? Command<
        [...Positional, T]["length"],
        [...Positional, T],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
  public positional<T>(
    name: string,
    description: string,
    parse: (value: string) => T,
    required: false
  ): [ExtraPositional] extends [never]
    ? Command<
        RequiredPositionalCount,
        [...Positional, T],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
  public positional(
    name: string,
    description: string,
    parse: (value: string) => unknown,
    required = true
  ): unknown {
    if (required) {
      if (this.positionalData.length !== this.requiredPositionalCount) {
        throw new ParseError(
          `[args-typed] required positional parameter ${name} cannot be after optional positional parameters`
        );
      }
    } else {
      if (this.extraPositional) {
        throw new ParseError(
          `[args-typed] optional positional parameter ${name} and extra positional parameters cannot be used together`
        );
      }
    }
    return new Command(
      this.version,
      this.description,
      this.requiredPositionalCount + (required ? 1 : 0),
      [...this.positionalData, { name, description, parse }],
      this.optionsData,
      this.shortOptions,
      this.extraPositional,
      this.parseOptions
    );
  }

  public option<const NewLong extends string, T>(
    short: undefined,
    long: NewLong,
    description: string,
    type: "boolean"
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions & Record<NewLong, { type: "boolean" }>,
        ShortOptions,
        ExtraPositional
      >;
  public option<
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">,
    T
  >(
    short: undefined,
    long: NewLong,
    description: string,
    type: Type,
    parse: (value: string) => T
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => T }>,
        ShortOptions,
        ExtraPositional
      >;
  public option<
    const NewShort extends ShortAllowed,
    const NewLong extends string,
    T
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: "boolean"
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewShort extends keyof ShortOptions ? true : false,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions & Record<NewLong, { type: "boolean" }>,
        ShortOptions & Record<NewShort, NewLong>,
        ExtraPositional
      >;
  public option<
    const NewShort extends ShortAllowed,
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">,
    T
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: Type,
    parse: (value: string) => T
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewShort extends keyof ShortOptions ? true : false,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => T }>,
        ShortOptions & Record<NewShort, NewLong>,
        ExtraPositional
      >;
  public option(
    short: ShortAllowed | undefined,
    long: string,
    description: string,
    type: OptionType["type"],
    parse?: (value: string) => unknown
  ): unknown {
    if (short) {
      if (short.length !== 1) {
        throw new ParseError(
          `[args-typed] short option ${short} must be a single letter`
        );
      }
      if (!(SHORT_ALLOWED as readonly string[]).includes(short)) {
        throw new ParseError(
          `[args-typed] short option ${short} must be a single letter from ${SHORT_ALLOWED.join(
            ", "
          )}`
        );
      }
      if (short in this.shortOptions) {
        throw new ParseError(
          `[args-typed] short option ${short} is already defined`
        );
      }
    }
    if (long.length === 0) {
      throw new ParseError(
        `[args-typed] long option must be a non-empty string`
      );
    }
    if (
      long
        .split("")
        .find((c) => !(LONG_ALLOWED as readonly string[]).includes(c))
    ) {
      throw new ParseError(
        `[args-typed] long option ${long} must be a string of letters from ${LONG_ALLOWED.join(
          ", "
        )}`
      );
    }
    if (long in this.optionsData) {
      throw new ParseError(
        `[args-typed] long option ${long} is already defined`
      );
    }
    return new Command(
      this.version,
      this.description,
      this.requiredPositionalCount,
      this.positionalData,
      {
        ...this.optionsData,
        [long]: {
          type: type === "boolean" ? { type } : { type, parse: parse! },
          description,
          short,
        },
      },
      short ? { ...this.shortOptions, [short]: long } : this.shortOptions,
      this.extraPositional,
      this.parseOptions
    );
  }

  public extra<T>(
    parse: (value: string) => T,
    name: string,
    description: string
  ): Or<
    [
      ExtraPositional extends never ? false : true,
      RequiredPositionalCount extends Positional["length"] ? false : true
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions,
        ShortOptions,
        T
      >;
  public extra(
    parse: (value: string) => unknown,
    name: string,
    description: string
  ): unknown {
    if (this.extraPositional) {
      throw new ParseError(
        `[args-typed] extra positional parameters already registered`
      );
    }
    if (this.positionalData.length !== this.requiredPositionalCount) {
      throw new ParseError(
        `[args-typed] extra positional parameters cannot be used with required positional parameters`
      );
    }
    return new Command(
      this.version,
      this.description,
      this.requiredPositionalCount,
      this.positionalData,
      this.optionsData,
      this.shortOptions,
      { parse, name, description },
      this.parseOptions
    );
  }

  public build<Context, T>(
    action: (
      positional: Positional,
      options: Options<LongOptions>,
      context: CommandContext<Context, T>
    ) => T
  ): CommandRegistration<Context, T> {
    const self = this;

    function help(name: string, fullName: string) {
      console.log(
        `${name}${typeof self.version === "string" ? ` ${self.version}` : ""}\n`
      );
      console.log(`${self.description}\n`);
      console.log(
        `Usage: ${fullName} [options]${self.positionalData
          .map(
            ({ name }, i) =>
              ` ${i < self.requiredPositionalCount ? "<" : "["}${name}${
                i < self.requiredPositionalCount ? ">" : "]"
              }${
                self.extraPositional ? ` [...${self.extraPositional.name}]` : ""
              }`
          )
          .join("")}\n`
      );
      if (self.positionalData.length > 0) {
        console.log(
          `Positional parameters:\n${self.positionalData
            .map(
              ({ name, description }, i) =>
                `  ${i < self.requiredPositionalCount ? "<" : "["}${name}${
                  i < self.requiredPositionalCount ? ">" : "]"
                } - ${description}`
            )
            .join("\n")}\n`
        );
      }
      if (Object.keys(self.optionsData).length > 0) {
        console.log(
          `Options:\n${Object.entries(
            self.optionsData as Record<string, OptionData>
          )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([long, { type, description, short }]) => {
              return `  ${short ? `-${short}, ` : "    "}--${long}${
                type.type === "boolean" ? "" : ` <value>`
              } ${description}`;
            })
            .join("\n")}\n`
        );
      }
    }

    function result(
      args: string[],
      context: Context,
      name: string,
      fullName: string
    ): T {
      const positional: any[] = [];
      const options: any = {};
      const extra: any[] = [];

      let posIndex = 0;
      let parsingFlag = true;

      for (let i = 0; i < args.length; i++) {
        const current = args[i];
        if (parsingFlag && current === "--") {
          parsingFlag = false;
        } else if (!parsingFlag) {
          if (posIndex < self.positionalData.length) {
            positional.push(self.positionalData[posIndex].parse(current));
            posIndex++;
          } else {
            if (!self.extraPositional) {
              throw new ParseError("Extra positional argument given");
            }
            extra.push(self.extraPositional.parse(current));
          }
          continue;
        } else if (current === "-") {
          throw new ParseError("Single dash '-' is invalid unless after `--`.");
        } else if (current.startsWith("--")) {
          const eqIndex = current.indexOf("=");
          let longFlag = "";
          let potentialValue: string | undefined;
          if (eqIndex >= 0) {
            longFlag = current.slice(2, eqIndex);
            potentialValue = current.slice(eqIndex + 1);
          } else {
            longFlag = current.slice(2);
          }
          if (!(longFlag in self.optionsData)) {
            throw new ParseError(
              `[args-typed] unknown option --${longFlag} given`
            );
          }
          const option = self.optionsData[longFlag]!;
          if (option.type.type === "boolean") {
            if (typeof potentialValue === "string") {
              throw new ParseError(
                `[args-typed] boolean option --${longFlag} does not take a value`
              );
            }
            if (options[longFlag]) {
              throw new ParseError(
                `[args-typed] option --${longFlag}${
                  option.short ? ` (-${option.short})` : ""
                } given multiple times`
              );
            }
            options[longFlag] = true;
            continue;
          } else {
            i++;
            if (i >= args.length) {
              throw new ParseError(
                `[args-typed] option --${longFlag} requires a value`
              );
            }
            if (option.type.type === "list") {
              options[longFlag] = [
                ...(options[longFlag] || []),
                option.type.parse(args[i]),
              ];
            } else {
              if (typeof options[longFlag] !== "undefined") {
                throw new ParseError(
                  `[args-typed] option --${longFlag}${
                    option.short ? ` (-${option.short})` : ""
                  } given multiple times`
                );
              }
              options[longFlag] = option.type.parse(args[i]);
            }
          }
        } else if (current.startsWith("-")) {
          if (current.length === 2) {
            const shortFlags = current.slice(1);
            let sfIndex = 0;
            while (sfIndex < shortFlags.length) {
              const shortFlag = shortFlags[sfIndex];
              if (!(shortFlag in self.shortOptions)) {
                throw new ParseError(
                  `[args-typed] unknown short option -${shortFlag} given`
                );
              }
              const longFlag = self.shortOptions[shortFlag]!;
              const option = self.optionsData[longFlag]!;
              if (option.type.type === "boolean") {
                if (options[longFlag]) {
                  throw new ParseError(
                    `[args-typed] option --${longFlag} (-${shortFlag}) given multiple times`
                  );
                }
                options[longFlag] = true;
                sfIndex++;
              } else {
                const remainingShortFlags = shortFlags.slice(sfIndex + 1);
                if (remainingShortFlags) {
                  if (option.type.type === "list") {
                    options[longFlag] = [
                      ...(options[longFlag] || []),
                      option.type.parse(args[i]),
                    ];
                  } else {
                    if (typeof options[longFlag] !== "undefined") {
                      throw new ParseError(
                        `[args-typed] option --${longFlag}${
                          option.short ? ` (-${option.short})` : ""
                        } given multiple times`
                      );
                    }
                    options[longFlag] = option.type.parse(args[i]);
                  }
                } else {
                  i++;
                  if (i >= args.length) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag} (-${shortFlag}) requires a value`
                    );
                  }
                  if (option.type.type === "list") {
                    options[longFlag] = [
                      ...(options[longFlag] || []),
                      option.type.parse(args[i]),
                    ];
                  } else {
                    if (typeof options[longFlag] !== "undefined") {
                      throw new ParseError(
                        `[args-typed] option --${longFlag}${
                          option.short ? ` (-${option.short})` : ""
                        } given multiple times`
                      );
                    }
                    options[longFlag] = option.type.parse(args[i]);
                  }
                }
              }
            }
          }
        } else {
          parsingFlag = false;
          if (posIndex < self.positionalData.length) {
            positional.push(self.positionalData[posIndex].parse(current));
            posIndex++;
          } else {
            if (!self.extraPositional) {
              throw new ParseError("Extra positional argument given");
            }
            extra.push(self.extraPositional.parse(current));
          }
        }
      }

      if (posIndex <= self.requiredPositionalCount) {
        throw new ParseError(
          `[args-typed] required positional parameters not given`
        );
      }

      return action(positional as any, options, {
        name,
        fullName,
        args,
        context,
        help,
        self: result,
      });
    }

    return result;
  }
}

export class CommandGroup<
  const Commands extends Partial<Record<string, never>>,
  const LongOptions extends Partial<Record<string, OptionType>>,
  const ShortOptions extends Partial<Record<string, string>>,
  const InnerContext,
  const T
> {
  private constructor(
    private readonly description: string,
    private readonly commands: Partial<
      Record<string, CommandRegistration<InnerContext, T>>
    >,
    private readonly optionsData: Partial<Record<string, OptionData>>,
    private readonly shortOptions: ShortOptions,
    private readonly parseOptions: {
      allowOptionAfterPositional?: boolean;
      allowDuplicateOptions?: boolean;
    }
  ) {}

  public static commandGroup<InnerContext, T>({
    description,
    ...options
  }: {
    description: string;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
  }): CommandGroup<{}, {}, {}, InnerContext, T> {
    return new CommandGroup(description, {}, {}, {}, options);
  }

  public command<const Name extends string, T2>(
    name: Name,
    command: CommandRegistration<InnerContext, T2>
  ): CommandGroup<Commands & Record<Name, never>, {}, {}, InnerContext, T | T2>;
  public command<const Name extends string>(
    name: Name,
    command: CommandRegistration<InnerContext, T>
  ): CommandGroup<Commands & Record<Name, never>, {}, {}, InnerContext, T>;
  public command<const Name extends string, T2>(
    name: Name,
    command: CommandRegistration<InnerContext, T2>
  ) {
    return new CommandGroup<
      Commands & Record<Name, never>,
      {},
      {},
      InnerContext,
      T | T2
    >(
      this.description,
      {
        ...this.commands,
        [name]: command,
      },
      this.optionsData,
      this.shortOptions,
      this.parseOptions
    );
  }

  public option<const NewLong extends string, T>(
    short: undefined,
    long: NewLong,
    description: string,
    type: "boolean"
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions & Record<NewLong, { type: "boolean" }>,
        ShortOptions,
        InnerContext,
        T
      >;
  public option<
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">,
    T
  >(
    short: undefined,
    long: NewLong,
    description: string,
    type: Type,
    parse: (value: string) => T
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => T }>,
        ShortOptions,
        InnerContext,
        T
      >;
  public option<
    const NewShort extends ShortAllowed,
    const NewLong extends string,
    T
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: "boolean"
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewShort extends keyof ShortOptions ? true : false,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions & Record<NewLong, { type: "boolean" }>,
        ShortOptions & Record<NewShort, NewLong>,
        InnerContext,
        T
      >;
  public option<
    const NewShort extends ShortAllowed,
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">,
    T
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: Type,
    parse: (value: string) => T
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      "" extends NewLong ? true : false,
      NewLong extends FirstLetter<NewLong> ? false : true,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewShort extends keyof ShortOptions ? true : false,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => T }>,
        ShortOptions & Record<NewShort, NewLong>,
        InnerContext,
        T
      >;
  public option(
    short: ShortAllowed | undefined,
    long: string,
    description: string,
    type: OptionType["type"],
    parse?: (value: string) => unknown
  ): unknown {
    if (short) {
      if (short.length !== 1) {
        throw new ParseError(
          `[args-typed] short option ${short} must be a single letter`
        );
      }
      if (!(SHORT_ALLOWED as readonly string[]).includes(short)) {
        throw new ParseError(
          `[args-typed] short option ${short} must be a single letter from ${SHORT_ALLOWED.join(
            ", "
          )}`
        );
      }
      if (short in this.shortOptions) {
        throw new ParseError(
          `[args-typed] short option ${short} is already defined`
        );
      }
    }
    if (long.length === 0) {
      throw new ParseError(
        `[args-typed] long option must be a non-empty string`
      );
    }
    if (
      long
        .split("")
        .find((c) => !(LONG_ALLOWED as readonly string[]).includes(c))
    ) {
      throw new ParseError(
        `[args-typed] long option ${long} must be a string of letters from ${LONG_ALLOWED.join(
          ", "
        )}`
      );
    }
    if (long in this.optionsData) {
      throw new ParseError(
        `[args-typed] long option ${long} is already defined`
      );
    }
    return new CommandGroup(
      this.description,
      this.commands,
      {
        ...this.optionsData,
        [long]: {
          type: type === "boolean" ? { type } : { type, parse: parse! },
          description,
          short,
        },
      },
      short ? { ...this.shortOptions, [short]: long } : this.shortOptions,
      this.parseOptions
    );
  }

  public build<OuterContext>(
    mapContext: (context: OuterContext) => InnerContext
  ): CommandRegistration<OuterContext, T> {
    return (args, context, name, fullName) => {
      const innerContext = mapContext(context);
      const options: any = {};
      let command: string | undefined;
      let i = 0;

      for (; i < args.length; i++) {
        const current = args[i];
        if (current === "--") {
          i++;
          if (i >= args.length) {
            throw new ParseError(
              `[args-typed] could not find subcommand after --`
            );
          }
          command = args[i];
          i++;
          break;
        } else if (current == "-") {
          throw new ParseError("Single dash '-' is invalid unless after `--`.");
        } else if (current.startsWith("--")) {
          const eqIndex = current.indexOf("=");
          let longFlag = "";
          let potentialValue: string | undefined;
          if (eqIndex >= 0) {
            longFlag = current.slice(2, eqIndex);
            potentialValue = current.slice(eqIndex + 1);
          } else {
            longFlag = current.slice(2);
          }
          if (!(longFlag in this.optionsData)) {
            throw new ParseError(
              `[args-typed] unknown option --${longFlag} given`
            );
          }
          const option = this.optionsData[longFlag]!;
          if (option.type.type === "boolean") {
            if (typeof potentialValue === "string") {
              throw new ParseError(
                `[args-typed] boolean option --${longFlag} does not take a value`
              );
            }
            if (options[longFlag]) {
              throw new ParseError(
                `[args-typed] option --${longFlag}${
                  option.short ? ` (-${option.short})` : ""
                } given multiple times`
              );
            }
            options[longFlag] = true;
            continue;
          } else {
            i++;
            if (i >= args.length) {
              throw new ParseError(
                `[args-typed] option --${longFlag} requires a value`
              );
            }
            if (option.type.type === "list") {
              options[longFlag] = [
                ...(options[longFlag] || []),
                option.type.parse(args[i]),
              ];
            } else {
              if (typeof options[longFlag] !== "undefined") {
                throw new ParseError(
                  `[args-typed] option --${longFlag}${
                    option.short ? ` (-${option.short})` : ""
                  } given multiple times`
                );
              }
              options[longFlag] = option.type.parse(args[i]);
            }
          }
        } else if (current.startsWith("-")) {
          if (current.length === 2) {
            const shortFlags = current.slice(1);
            let sfIndex = 0;
            while (sfIndex < shortFlags.length) {
              const shortFlag = shortFlags[sfIndex];
              if (!(shortFlag in this.shortOptions)) {
                throw new ParseError(
                  `[args-typed] unknown short option -${shortFlag} given`
                );
              }
              const longFlag = this.shortOptions[shortFlag]!;
              const option = this.optionsData[longFlag]!;
              if (option.type.type === "boolean") {
                if (options[longFlag]) {
                  throw new ParseError(
                    `[args-typed] option --${longFlag} (-${shortFlag}) given multiple times`
                  );
                }
                options[longFlag] = true;
                sfIndex++;
              } else {
                const remainingShortFlags = shortFlags.slice(sfIndex + 1);
                if (remainingShortFlags) {
                  if (option.type.type === "list") {
                    options[longFlag] = [
                      ...(options[longFlag] || []),
                      option.type.parse(args[i]),
                    ];
                  } else {
                    if (typeof options[longFlag] !== "undefined") {
                      throw new ParseError(
                        `[args-typed] option --${longFlag}${
                          option.short ? ` (-${option.short})` : ""
                        } given multiple times`
                      );
                    }
                    options[longFlag] = option.type.parse(args[i]);
                  }
                } else {
                  i++;
                  if (i >= args.length) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag} (-${shortFlag}) requires a value`
                    );
                  }
                  if (option.type.type === "list") {
                    options[longFlag] = [
                      ...(options[longFlag] || []),
                      option.type.parse(args[i]),
                    ];
                  } else {
                    if (typeof options[longFlag] !== "undefined") {
                      throw new ParseError(
                        `[args-typed] option --${longFlag}${
                          option.short ? ` (-${option.short})` : ""
                        } given multiple times`
                      );
                    }
                    options[longFlag] = option.type.parse(args[i]);
                  }
                }
              }
            }
          }
        } else {
          command = args[i];
          i++;
          break;
        }
      }

      if (!command) {
        throw new ParseError(
          `[args-typed] no subcommand given in group ${fullName}`
        );
      }
      if (!(command in this.commands)) {
        throw new ParseError(
          `[args-typed] subcommand ${command} not found in group ${fullName}`
        );
      }

      return this.commands[command]!(
        args,
        innerContext,
        command,
        `${fullName} ${command}`
      );
    };
  }
}

type UnionToIntersection<T> = (
  T extends any ? (arg: T) => any : never
) extends (arg: infer I) => any
  ? I
  : never;
type ToLetters<S extends string, R = never> = S extends ""
  ? R
  : S extends `${infer I}${infer J}`
  ? ToLetters<J, R | I>
  : never;
type ShortAllowed = (typeof SHORT_ALLOWED)[number];
type LongAllowed = (typeof LONG_ALLOWED)[number];
type FirstLetter<S extends string> = S extends `${infer I}${infer _}`
  ? I
  : never;
type Or<T extends boolean[]> = true extends T[number] ? true : false;

// prettier-ignore
const SHORT_ALLOWED = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '_',
] as const;
const LONG_ALLOWED = [...SHORT_ALLOWED, "-"] as const;
