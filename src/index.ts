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
    ? ReturnType<T[K]["parse"]> | undefined
    : T[K] extends { type: "list" }
    ? ReturnType<T[K]["parse"]>[] | undefined
    : never;
};

export interface CommandContext<Context, T> {
  name: string;
  fullName: string;
  args: string[];
  context: Context;
  getHelp: (name: string, fullName: string) => string;
  getVersion: (name: string) => string | undefined;
  run: (
    args: string[],
    context: Context,
    name: string,
    fullName: string,
    onHelp: (message: string) => never,
    onVersion: (message: string | undefined) => never
  ) => T;
}

export interface CommandGroupContext<Context, T> {
  name: string;
  fullName: string;
  args: string[];
  context: Context;
  getHelp: (name: string, fullName: string) => string;
  getVersion: (name: string) => string | undefined;
  run: (
    args: string[],
    context: Context,
    name: string,
    fullName: string,
    onHelp: (message: string) => never,
    onVersion: (message: string | undefined) => never
  ) => T;
}

export interface CommandRegistration<Context, T> {
  description: string | undefined;
  run: (
    args: string[],
    context: Context,
    name: string,
    fullName: string,
    onHelp: (message: string) => never,
    onVersion: (message: string | undefined) => never
  ) => T;
}

export class ParseError extends Error {
  constructor(message: string, public readonly help: () => string) {
    super(message);
  }
}

class Command<
  const RequiredPositionalCount extends number,
  const Positional extends unknown[],
  const LongOptions extends Partial<Record<string, OptionType>>,
  const ShortOptions extends Partial<Record<string, string>>,
  const ExtraPositional
> {
  private constructor(
    private readonly description: string | undefined,
    private readonly requiredPositionalCount: RequiredPositionalCount,
    private readonly positionalData: PositionalData[],
    private readonly optionsData: Partial<Record<string, OptionData>>,
    private readonly shortOptions: ShortOptions,
    private readonly extraPositional: [ExtraPositional] extends [never]
      ? undefined
      : ExtraPositionalData<ExtraPositional>,
    private readonly helpPositional: [left: string, right: string][],
    private readonly helpPositionalLongestLeftLength: number,
    private readonly helpOptions: [left: string, right: string][],
    private readonly helpOptionsLongestLeftLength: number,
    private readonly name: string | undefined,
    private readonly version: string | undefined,
    private readonly enableHelp: true | undefined,
    private readonly enableVersion: true | undefined,
    private readonly parseOptions: {
      allowOptionAfterPositional?: boolean;
      allowDuplicateOptions?: boolean;
      allowSingleDashAsPositional?: boolean;
    }
  ) {}

  public static command(options?: {
    description?: string;
    name?: string;
    version?: string;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): Command<0, [], {}, {}, never>;
  public static command(options: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp: true;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): Command<
    0,
    [],
    Record<"help", { type: "boolean" }>,
    Record<"h", "help">,
    never
  >;
  public static command(options: {
    description?: string;
    name?: string;
    version?: string;
    enableVersion: true;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): Command<
    0,
    [],
    Record<"version", { type: "boolean" }>,
    Record<"v", "version">,
    never
  >;
  public static command(options: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp: true;
    enableVersion: true;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): Command<
    0,
    [],
    { version: { type: "boolean" }; help: { type: "boolean" } },
    { v: "version"; h: "help" },
    never
  >;
  public static command({
    description,
    name,
    version,
    enableHelp,
    enableVersion,
    ...options
  }: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp?: true;
    enableVersion?: true;
    allowOptionAfterPositional?: boolean;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  } = {}) {
    const base = new Command<0, [], {}, {}, never>(
      description,
      0,
      [],
      {},
      {},
      undefined,
      [],
      0,
      [],
      0,
      name,
      version,
      enableHelp,
      enableVersion,
      options
    );
    if (enableHelp && enableVersion) {
      return base
        .option("h", "help", "Show help")
        .option("v", "version", "Show version");
    } else if (enableHelp) {
      return base.option("h", "help", "Show help");
    } else if (enableVersion) {
      return base.option("v", "version", "Show version");
    } else {
      return base;
    }
  }

  public positional(
    name: string,
    description: string
  ): RequiredPositionalCount extends Positional["length"]
    ? Command<
        [...Positional, string]["length"],
        [...Positional, string],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
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
  public positional(
    name: string,
    description: string,
    parse?: (value: string) => string,
    required?: true
  ): RequiredPositionalCount extends Positional["length"]
    ? Command<
        [...Positional, string]["length"],
        [...Positional, string],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
  public positional<T>(
    name: string,
    description: string,
    parse: (value: string) => T,
    required?: true
  ): RequiredPositionalCount extends Positional["length"]
    ? Command<
        [...Positional, T]["length"],
        [...Positional, T],
        LongOptions,
        ShortOptions,
        ExtraPositional
      >
    : never;
  public positional(
    name: string,
    description: string,
    parse?: ((value: string) => string) | undefined,
    required?: false
  ): Command<
    RequiredPositionalCount,
    [...Positional, string | undefined],
    LongOptions,
    ShortOptions,
    ExtraPositional
  >;
  public positional<T>(
    name: string,
    description: string,
    parse: (value: string) => T,
    required: false
  ): Command<
    RequiredPositionalCount,
    [...Positional, T | undefined],
    LongOptions,
    ShortOptions,
    ExtraPositional
  >;
  public positional(
    name: string,
    description: string,
    parse?: (value: string) => unknown,
    required = true
  ): unknown {
    if (required) {
      if (this.positionalData.length !== this.requiredPositionalCount) {
        throw new Error(
          `[args-typed] required positional parameter ${name} cannot be after optional positional parameters`
        );
      }
    }
    if (!parse) {
      parse = (value) => value;
    }
    return new Command(
      this.description,
      this.requiredPositionalCount + (required ? 1 : 0),
      [...this.positionalData, { name, description, parse }],
      this.optionsData,
      this.shortOptions,
      this.extraPositional,
      [
        ...this.helpPositional,
        [required ? `<${name}>` : `[${name}]`, description],
      ],
      Math.max(this.helpPositionalLongestLeftLength, name.length + 2),
      this.helpOptions,
      this.helpOptionsLongestLeftLength,
      this.name,
      this.version,
      this.enableHelp,
      this.enableVersion,
      this.parseOptions
    );
  }

  public option<const NewLong extends string>(
    short: undefined,
    long: NewLong,
    description: string,
    type?: "boolean"
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      NewLong extends "" ? true : false,
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
    const Type extends Exclude<OptionType["type"], "boolean">
  >(
    short: undefined,
    long: NewLong,
    description: string,
    type: Type
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      NewLong extends "" ? true : false,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : Command<
        RequiredPositionalCount,
        Positional,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => string }>,
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
      NewLong extends "" ? true : false,
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
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
    const NewLong extends string
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type?: "boolean"
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      NewLong extends "" ? true : false,
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
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: Type
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      NewLong extends "" ? true : false,
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
          Record<NewLong, { type: Type; parse: (value: string) => string }>,
        ShortOptions & Record<NewShort, NewLong>,
        ExtraPositional
      >;
  public option<
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
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
      NewLong extends "" ? true : false,
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
    type?: OptionType["type"],
    parse?: (value: string) => unknown
  ): unknown {
    if (short) {
      if (short.length !== 1) {
        throw new Error(
          `[args-typed] short option -${short} must be a single letter`
        );
      }
      if (!(SHORT_ALLOWED as readonly string[]).includes(short)) {
        throw new Error(
          `[args-typed] short option -${short} must be a single letter from ${SHORT_ALLOWED.join(
            ", "
          )}`
        );
      }
      if (short in this.shortOptions) {
        throw new Error(
          `[args-typed] short option -${short} is already defined`
        );
      }
    }
    if (long.length === 0) {
      throw new Error(`[args-typed] long option must be a non-empty string`);
    }
    if (
      long
        .split("")
        .find((c) => !(LONG_ALLOWED as readonly string[]).includes(c))
    ) {
      throw new Error(
        `[args-typed] long option --${long} must be a string of letters from ${LONG_ALLOWED.join(
          ", "
        )}`
      );
    }
    if (long in this.optionsData) {
      throw new Error(`[args-typed] long option --${long} is already defined`);
    }
    const actualType = type === undefined ? "boolean" : type;
    return new Command(
      this.description,
      this.requiredPositionalCount,
      this.positionalData,
      {
        ...this.optionsData,
        [long]: {
          type:
            actualType === "boolean"
              ? { type: actualType }
              : { type: actualType, parse: parse ?? ((value) => value) },
          description,
          short,
        },
      },
      short ? { ...this.shortOptions, [short]: long } : this.shortOptions,
      this.extraPositional,
      this.helpPositional,
      this.helpPositionalLongestLeftLength,
      [
        ...this.helpOptions,
        [
          `${short ? `-${short},` : "   "} --${long}${
            actualType === "boolean" ? "" : " <value>"
          }`,
          description,
        ],
      ],
      Math.max(
        this.helpOptionsLongestLeftLength,
        long.length + 6 + (actualType === "boolean" ? 0 : 8)
      ),
      this.name,
      this.version,
      this.enableHelp,
      this.enableVersion,
      this.parseOptions
    );
  }

  public extra(
    name: string,
    description: string
  ): [ExtraPositional] extends [never]
    ? Command<
        RequiredPositionalCount,
        Positional,
        LongOptions,
        ShortOptions,
        string
      >
    : never;
  public extra<T>(
    name: string,
    description: string,
    parse: (value: string) => T
  ): [ExtraPositional] extends [never]
    ? Command<RequiredPositionalCount, Positional, LongOptions, ShortOptions, T>
    : never;
  public extra(
    name: string,
    description: string,
    parse?: (value: string) => unknown
  ): unknown {
    if (this.extraPositional) {
      throw new Error(
        `[args-typed] extra positional parameters already registered`
      );
    }
    return new Command(
      this.description,
      this.requiredPositionalCount,
      this.positionalData,
      this.optionsData,
      this.shortOptions,
      { parse: parse ?? ((value) => value), name, description },
      [...this.helpPositional, [`[...${name}]`, description]],
      Math.max(this.helpPositionalLongestLeftLength, name.length + 5),
      this.helpOptions,
      this.helpOptionsLongestLeftLength,
      this.name,
      this.version,
      this.enableHelp,
      this.enableVersion,
      this.parseOptions
    );
  }

  public build<Context, T = void>(
    action: (
      positional: [
        ...Positional,
        ...([ExtraPositional] extends [never] ? [] : ExtraPositional[])
      ],
      options: Options<LongOptions>,
      context: CommandContext<Context, T>
    ) => T
  ): CommandRegistration<Context, T> {
    const self = this;

    function getVersion(name: string): string | undefined {
      return self.version === undefined
        ? undefined
        : `${self.name ?? name} version ${self.version}`;
    }

    function getHelp(name: string, fullName: string): string {
      const version = getVersion(name);
      return `${version ? `${version}\n\n` : ""}${
        self.description === undefined ? "" : `${self.description}\n\n`
      }Usage: ${fullName} [options]${self.positionalData
        .map(
          ({ name }, i) =>
            ` ${i < self.requiredPositionalCount ? "<" : "["}${name}${
              i < self.requiredPositionalCount ? ">" : "]"
            }`
        )
        .join("")}${
        self.extraPositional ? ` [...${self.extraPositional.name}]` : ""
      }\n${
        self.helpPositional.length > 0
          ? `\nPositional parameters:\n${self.helpPositional
              .map(
                ([left, right]) =>
                  `  ${left}${" ".repeat(
                    self.helpPositionalLongestLeftLength - left.length + 2
                  )}${right}\n`
              )
              .join("")}`
          : ""
      }${
        self.helpOptions.length > 0
          ? `\nOptions:\n${self.helpOptions
              .map(
                ([left, right]) =>
                  `  ${left}${" ".repeat(
                    self.helpOptionsLongestLeftLength - left.length + 2
                  )}${right}\n`
              )
              .join("")}`
          : ""
      }`;
    }

    function run(
      args: string[],
      context: Context,
      name: string,
      fullName: string,
      onHelp: (message: string) => never,
      onVersion: (message: string | undefined) => never
    ): T {
      const {
        allowOptionAfterPositional,
        allowDuplicateOptions,
        allowSingleDashAsPositional,
      } = self.parseOptions;
      const positional: any[] = [];
      const options: any = {};
      const extra: any[] = [];

      const help = () => getHelp(name, fullName);

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
              throw new ParseError(
                "[args-typed] extra positional argument given",
                help
              );
            }
            extra.push(self.extraPositional.parse(current));
          }
          continue;
        } else if (current === "-") {
          if (!allowSingleDashAsPositional) {
            throw new ParseError(
              "[args-typed] single dash '-' is invalid unless after `--`.",
              help
            );
          }
          // TODO: reduce code duplication
          if (!allowOptionAfterPositional) {
            parsingFlag = false;
          }
          if (posIndex < self.positionalData.length) {
            positional.push(self.positionalData[posIndex].parse(current));
            posIndex++;
          } else {
            if (!self.extraPositional) {
              throw new ParseError(
                "[args-typed] extra positional argument given",
                help
              );
            }
            extra.push(self.extraPositional.parse(current));
          }
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
              `[args-typed] unknown option --${longFlag} given`,
              help
            );
          }
          const option = self.optionsData[longFlag]!;
          if (option.type.type === "boolean") {
            if (typeof potentialValue === "string") {
              throw new ParseError(
                `[args-typed] boolean option --${longFlag} does not take a value`,
                help
              );
            }
            if (!allowDuplicateOptions && options[longFlag]) {
              throw new ParseError(
                `[args-typed] option --${longFlag}${
                  option.short ? ` (-${option.short})` : ""
                } given multiple times`,
                help
              );
            }
            options[longFlag] = true;
            continue;
          } else {
            i++;
            if (i >= args.length) {
              throw new ParseError(
                `[args-typed] option --${longFlag} requires a value`,
                help
              );
            }
            if (option.type.type === "list") {
              options[longFlag] = [
                ...(options[longFlag] || []),
                option.type.parse(args[i]),
              ];
            } else {
              if (
                !allowDuplicateOptions &&
                typeof options[longFlag] !== "undefined"
              ) {
                throw new ParseError(
                  `[args-typed] option --${longFlag}${
                    option.short ? ` (-${option.short})` : ""
                  } given multiple times`,
                  help
                );
              }
              options[longFlag] = option.type.parse(args[i]);
            }
          }
        } else if (current.startsWith("-")) {
          const shortFlags = current.slice(1);
          let sfIndex = 0;
          while (sfIndex < shortFlags.length) {
            const shortFlag = shortFlags[sfIndex];
            if (!(shortFlag in self.shortOptions)) {
              throw new ParseError(
                `[args-typed] unknown short option -${shortFlag} given`,
                help
              );
            }
            const longFlag = self.shortOptions[shortFlag]!;
            const option = self.optionsData[longFlag]!;
            if (option.type.type === "boolean") {
              if (!allowDuplicateOptions && options[longFlag]) {
                throw new ParseError(
                  `[args-typed] option --${longFlag} (-${shortFlag}) given multiple times`,
                  help
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
                    option.type.parse(remainingShortFlags),
                  ];
                } else {
                  if (
                    !allowDuplicateOptions &&
                    typeof options[longFlag] !== "undefined"
                  ) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag}${
                        option.short ? ` (-${option.short})` : ""
                      } given multiple times`,
                      help
                    );
                  }
                  options[longFlag] = option.type.parse(remainingShortFlags);
                }
              } else {
                i++;
                if (i >= args.length) {
                  throw new ParseError(
                    `[args-typed] option --${longFlag} (-${shortFlag}) requires a value`,
                    help
                  );
                }
                if (option.type.type === "list") {
                  options[longFlag] = [
                    ...(options[longFlag] || []),
                    option.type.parse(args[i]),
                  ];
                } else {
                  if (
                    !allowDuplicateOptions &&
                    typeof options[longFlag] !== "undefined"
                  ) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag}${
                        option.short ? ` (-${option.short})` : ""
                      } given multiple times`,
                      help
                    );
                  }
                  options[longFlag] = option.type.parse(args[i]);
                }
              }
              break;
            }
          }
        } else {
          if (!allowOptionAfterPositional) {
            parsingFlag = false;
          }
          if (posIndex < self.positionalData.length) {
            positional.push(self.positionalData[posIndex].parse(current));
            posIndex++;
          } else {
            if (!self.extraPositional) {
              throw new ParseError(
                "[args-typed] extra positional argument given",
                help
              );
            }
            extra.push(self.extraPositional.parse(current));
          }
        }
      }

      if (self.enableHelp && options.help) {
        onHelp(getHelp(name, fullName));
      }
      if (self.enableVersion && options.version) {
        onVersion(getVersion(name));
      }

      if (posIndex < self.requiredPositionalCount) {
        throw new ParseError(
          `[args-typed] required positional parameters not given`,
          help
        );
      }

      return action([...positional, ...extra] as any, options, {
        name,
        fullName,
        args,
        context,
        getHelp,
        getVersion,
        run: run,
      });
    }

    return {
      description: this.description,
      run,
    };
  }
}

class CommandGroup<
  const Commands extends Partial<Record<string, never>>,
  const LongOptions extends Partial<Record<string, OptionType>>,
  const ShortOptions extends Partial<Record<string, string>>,
  const InnerContext,
  const Result
> {
  private constructor(
    private readonly description: string | undefined,
    private readonly commands: Partial<
      Record<string, CommandRegistration<InnerContext, Result>>
    >,
    private readonly optionsData: Partial<Record<string, OptionData>>,
    private readonly shortOptions: ShortOptions,
    private readonly helpSubcommands: [left: string, right: string][],
    private readonly helpSubcommandsLongestLeftLength: number,
    private readonly helpOptions: [left: string, right: string][],
    private readonly helpOptionsLongestLeftLength: number,
    private readonly name: string | undefined,
    private readonly version: string | undefined,
    private readonly enableHelp: true | undefined,
    private readonly enableVersion: true | undefined,
    private readonly parseOptions: {
      allowDuplicateOptions?: boolean;
      allowSingleDashAsPositional?: boolean;
    }
  ) {}

  public static commandGroup<InnerContext, T = never>(options?: {
    description?: string;
    name?: string;
    version?: string;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): CommandGroup<{}, {}, {}, InnerContext, T>;
  public static commandGroup<InnerContext, T = never>(options: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp: true;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): CommandGroup<
    {},
    Record<"help", { type: "boolean" }>,
    Record<"h", "help">,
    InnerContext,
    T
  >;
  public static commandGroup<InnerContext, T = never>(options: {
    description?: string;
    name?: string;
    version?: string;
    enableVersion: true;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): CommandGroup<
    {},
    Record<"version", { type: "boolean" }>,
    Record<"v", "version">,
    InnerContext,
    T
  >;
  public static commandGroup<InnerContext, T = never>(options: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp: true;
    enableVersion: true;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  }): CommandGroup<
    {},
    { version: { type: "boolean" }; help: { type: "boolean" } },
    { v: "version"; h: "help" },
    InnerContext,
    T
  >;
  public static commandGroup<InnerContext, T = never>({
    description,
    name,
    version,
    enableHelp,
    enableVersion,
    ...options
  }: {
    description?: string;
    name?: string;
    version?: string;
    enableHelp?: true;
    enableVersion?: true;
    allowDuplicateOptions?: boolean;
    allowSingleDashAsPositional?: boolean;
  } = {}) {
    const base = new CommandGroup<{}, {}, {}, InnerContext, T>(
      description,
      {},
      {},
      {},
      [],
      0,
      [],
      0,
      name,
      version,
      enableHelp,
      enableVersion,
      options
    );
    if (enableHelp && enableVersion) {
      return base
        .option("h", "help", "Show help")
        .option("v", "version", "Show version");
    } else if (enableHelp) {
      return base.option("h", "help", "Show help");
    } else if (enableVersion) {
      return base.option("v", "version", "Show version");
    } else {
      return base;
    }
  }

  public command<const Name extends string, T2>(
    name: Name,
    command: CommandRegistration<InnerContext, T2>
  ): CommandGroup<
    Commands & Record<Name, never>,
    LongOptions,
    ShortOptions,
    InnerContext,
    Result | T2
  >;
  public command<const Name extends string>(
    name: Name,
    command: CommandRegistration<InnerContext, Result>
  ): CommandGroup<
    Commands & Record<Name, never>,
    LongOptions,
    ShortOptions,
    InnerContext,
    Result
  >;
  public command<const Name extends string, T2>(
    name: Name,
    command: CommandRegistration<InnerContext, T2>
  ) {
    return new CommandGroup<
      Commands & Record<Name, never>,
      LongOptions,
      ShortOptions,
      InnerContext,
      Result | T2
    >(
      this.description,
      {
        ...this.commands,
        [name]: command,
      },
      this.optionsData,
      this.shortOptions,
      [...this.helpSubcommands, [name, command.description ?? ""]],
      Math.max(this.helpSubcommandsLongestLeftLength, name.length),
      this.helpOptions,
      this.helpOptionsLongestLeftLength,
      this.name,
      this.version,
      this.enableHelp,
      this.enableVersion,
      this.parseOptions
    );
  }

  public option<const NewLong extends string>(
    short: undefined,
    long: NewLong,
    description: string,
    type?: "boolean"
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      NewLong extends "" ? true : false,
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
        Result
      >;
  public option<
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">
  >(
    short: undefined,
    long: NewLong,
    description: string,
    type: Type
  ): Or<
    [
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      NewLong extends "" ? true : false,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => string }>,
        ShortOptions,
        InnerContext,
        Result
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
      NewLong extends "" ? true : false,
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
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
    const NewLong extends string
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type?: "boolean"
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      NewLong extends "" ? true : false,
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
        Result
      >;
  public option<
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
    const NewLong extends string,
    const Type extends Exclude<OptionType["type"], "boolean">
  >(
    short: NewShort,
    long: NewLong,
    description: string,
    type: Type
  ): Or<
    [
      UnionToIntersection<NewShort> extends never ? true : false,
      UnionToIntersection<NewLong> extends never ? true : false,
      UnionToIntersection<Type> extends never ? true : false,
      NewLong extends "" ? true : false,
      ToLetters<NewLong> extends LongAllowed ? false : true,
      NewShort extends keyof ShortOptions ? true : false,
      NewLong extends keyof LongOptions ? true : false
    ]
  > extends true
    ? never
    : CommandGroup<
        Commands,
        LongOptions &
          Record<NewLong, { type: Type; parse: (value: string) => string }>,
        ShortOptions & Record<NewShort, NewLong>,
        InnerContext,
        Result
      >;
  public option<
    const NewShort extends Exclude<ShortAllowed, keyof ShortOptions>,
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
      NewLong extends "" ? true : false,
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
    type?: OptionType["type"],
    parse?: (value: string) => unknown
  ): unknown {
    if (short) {
      if (short.length !== 1) {
        throw new Error(
          `[args-typed] short option -${short} must be a single letter`
        );
      }
      if (!(SHORT_ALLOWED as readonly string[]).includes(short)) {
        throw new Error(
          `[args-typed] short option -${short} must be a single letter from ${SHORT_ALLOWED.join(
            ", "
          )}`
        );
      }
      if (short in this.shortOptions) {
        throw new Error(
          `[args-typed] short option -${short} is already defined`
        );
      }
    }
    if (long.length === 0) {
      throw new Error(`[args-typed] long option must be a non-empty string`);
    }
    if (
      long
        .split("")
        .find((c) => !(LONG_ALLOWED as readonly string[]).includes(c))
    ) {
      throw new Error(
        `[args-typed] long option --${long} must be a string of letters from ${LONG_ALLOWED.join(
          ", "
        )}`
      );
    }
    if (long in this.optionsData) {
      throw new Error(`[args-typed] long option --${long} is already defined`);
    }
    const actualType = type === undefined ? "boolean" : type;
    return new CommandGroup(
      this.description,
      this.commands,
      {
        ...this.optionsData,
        [long]: {
          type:
            actualType === "boolean"
              ? { type: actualType }
              : { type: actualType, parse: parse ?? ((value) => value) },
          description,
          short,
        },
      },
      short ? { ...this.shortOptions, [short]: long } : this.shortOptions,
      this.helpSubcommands,
      this.helpSubcommandsLongestLeftLength,
      [
        ...this.helpOptions,
        [
          `${short ? `-${short},` : "   "} --${long}${
            actualType === "boolean" ? "" : " <value>"
          }`,
          description,
        ],
      ],
      Math.max(
        this.helpOptionsLongestLeftLength,
        long.length + 6 + (actualType === "boolean" ? 0 : 8)
      ),
      this.name,
      this.version,
      this.enableHelp,
      this.enableVersion,
      this.parseOptions
    );
  }

  public build<OuterContext>(
    mapContext: (
      options: Options<LongOptions>,
      context: CommandGroupContext<OuterContext, Result>
    ) => InnerContext
  ): CommandRegistration<OuterContext, Result> {
    const self = this;

    function getVersion(name: string): string | undefined {
      return self.version === undefined
        ? undefined
        : `${self.name ?? name} version ${self.version}`;
    }

    function getHelp(name: string, fullName: string): string {
      const version = getVersion(name);
      return `${version ? `${version}\n\n` : ""}${
        self.description === undefined ? "" : `${self.description}\n\n`
      }Usage: ${fullName} [options] <subcommand> [subcommand options] [subcommand arguments]\n\nSubcommands:\n${self.helpSubcommands
        .map(
          ([left, right]) =>
            `  ${left}${" ".repeat(
              self.helpSubcommandsLongestLeftLength - left.length + 2
            )}${right}\n`
        )
        .join("")}${
        self.helpOptions.length > 0
          ? `\nOptions:\n${self.helpOptions
              .map(
                ([left, right]) =>
                  `  ${left}${" ".repeat(
                    self.helpOptionsLongestLeftLength - left.length + 2
                  )}${right}\n`
              )
              .join("")}`
          : ""
      }`;
    }

    function run(
      args: string[],
      context: OuterContext,
      name: string,
      fullName: string,
      onHelp: (message: string) => never,
      onVersion: (message: string | undefined) => never
    ): Result {
      const { allowDuplicateOptions, allowSingleDashAsPositional } =
        self.parseOptions;
      const options: any = {};
      const help = () => getHelp(name, fullName);

      let command: string | undefined;
      let i = 0;

      for (; i < args.length; i++) {
        const current = args[i];
        if (current === "--") {
          i++;
          if (i >= args.length) {
            throw new ParseError(
              `[args-typed] could not find subcommand after --`,
              help
            );
          }
          command = args[i];
          i++;
          break;
        } else if (current == "-") {
          if (!allowSingleDashAsPositional) {
            throw new ParseError(
              "[args-typed] single dash '-' is invalid unless after `--`.",
              help
            );
          }
          command = current;
          i++;
          break;
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
              `[args-typed] unknown option --${longFlag} given`,
              help
            );
          }
          const option = self.optionsData[longFlag]!;
          if (option.type.type === "boolean") {
            if (typeof potentialValue === "string") {
              throw new ParseError(
                `[args-typed] boolean option --${longFlag} does not take a value`,
                help
              );
            }
            if (!allowDuplicateOptions && options[longFlag]) {
              throw new ParseError(
                `[args-typed] option --${longFlag}${
                  option.short ? ` (-${option.short})` : ""
                } given multiple times`,
                help
              );
            }
            options[longFlag] = true;
            continue;
          } else {
            i++;
            if (i >= args.length) {
              throw new ParseError(
                `[args-typed] option --${longFlag} requires a value`,
                help
              );
            }
            if (option.type.type === "list") {
              options[longFlag] = [
                ...(options[longFlag] || []),
                option.type.parse(args[i]),
              ];
            } else {
              if (
                !allowDuplicateOptions &&
                typeof options[longFlag] !== "undefined"
              ) {
                throw new ParseError(
                  `[args-typed] option --${longFlag}${
                    option.short ? ` (-${option.short})` : ""
                  } given multiple times`,
                  help
                );
              }
              options[longFlag] = option.type.parse(args[i]);
            }
          }
        } else if (current.startsWith("-")) {
          const shortFlags = current.slice(1);
          let sfIndex = 0;
          while (sfIndex < shortFlags.length) {
            const shortFlag = shortFlags[sfIndex];
            if (!(shortFlag in self.shortOptions)) {
              throw new ParseError(
                `[args-typed] unknown short option -${shortFlag} given`,
                help
              );
            }
            const longFlag = self.shortOptions[shortFlag]!;
            const option = self.optionsData[longFlag]!;
            if (option.type.type === "boolean") {
              if (!allowDuplicateOptions && options[longFlag]) {
                throw new ParseError(
                  `[args-typed] option --${longFlag} (-${shortFlag}) given multiple times`,
                  help
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
                    option.type.parse(remainingShortFlags),
                  ];
                } else {
                  if (
                    !allowDuplicateOptions &&
                    typeof options[longFlag] !== "undefined"
                  ) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag}${
                        option.short ? ` (-${option.short})` : ""
                      } given multiple times`,
                      help
                    );
                  }
                  options[longFlag] = option.type.parse(remainingShortFlags);
                }
              } else {
                i++;
                if (i >= args.length) {
                  throw new ParseError(
                    `[args-typed] option --${longFlag} (-${shortFlag}) requires a value`,
                    help
                  );
                }
                if (option.type.type === "list") {
                  options[longFlag] = [
                    ...(options[longFlag] || []),
                    option.type.parse(args[i]),
                  ];
                } else {
                  if (
                    !allowDuplicateOptions &&
                    typeof options[longFlag] !== "undefined"
                  ) {
                    throw new ParseError(
                      `[args-typed] option --${longFlag}${
                        option.short ? ` (-${option.short})` : ""
                      } given multiple times`,
                      help
                    );
                  }
                  options[longFlag] = option.type.parse(args[i]);
                }
              }
              break;
            }
          }
        } else {
          command = args[i];
          i++;
          break;
        }
      }

      if (self.enableHelp && options.help) {
        onHelp(getHelp(name, fullName));
      }
      if (self.enableVersion && options.version) {
        onVersion(getVersion(name));
      }

      if (!command) {
        throw new ParseError(
          `[args-typed] no subcommand given in group ${fullName}`,
          help
        );
      }
      if (!(command in self.commands)) {
        throw new ParseError(
          `[args-typed] subcommand ${command} not found in group ${fullName}`,
          help
        );
      }

      const sliced = args.slice(i);
      const innerContext = mapContext(options, {
        name,
        fullName,
        args: sliced,
        context,
        getHelp,
        getVersion,
        run: run,
      });
      return self.commands[command]!.run(
        sliced,
        innerContext,
        command,
        `${fullName} ${command}`,
        onHelp,
        onVersion
      );
    }

    return {
      description: this.description,
      run,
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
type Or<T extends boolean[]> = true extends T[number] ? true : false;

// prettier-ignore
const SHORT_ALLOWED = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '_',
] as const;
const LONG_ALLOWED = [...SHORT_ALLOWED, "-"] as const;

export type { Command, CommandGroup };
export const command = Command.command;
export const commandGroup = CommandGroup.commandGroup;

export function run<Context, T>(
  cmd: CommandRegistration<Context, T>,
  args: string[],
  context: Context,
  name: string,
  onError: (message: string) => never,
  onHelp: (message: string) => never,
  onVersion: (message: string | undefined) => never
): T {
  try {
    return cmd.run(args, context, name, name, onHelp, onVersion);
  } catch (e) {
    if (e instanceof ParseError) {
      onError(e.help());
    }
    throw e;
  }
}
