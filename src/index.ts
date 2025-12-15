import {
  Client,
  Collection,
  IntentsBitField,
  Partials,
  REST,
  Routes,
} from "discord.js";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

import {
  AllCommandTypes,
  ChildCommand,
  Command,
  ParentCommand,
} from "./commands";
import Event from "./events";
import Task from "./tasks";
import { CommandInterface } from "./types/discord";
import Logger from "./utils/logger";
import "./utils/prototypes";

config();

interface Constructor<T> {
  new(): T;
}

export default class App {
  private static token = process.env.TOKEN;
  public static initiated = false;

  public static discordBot = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.GuildMember,
      Partials.User,
      Partials.ThreadMember,
    ],
  });
  public static directories = [
    path.join(__dirname, "events"),
    path.join(__dirname, "tasks"),
    path.join(__dirname, "commands"),
  ];

  public static commands: (Command | ParentCommand | ChildCommand)[] = [];
  public static events: Collection<string, Event> = new Collection();
  public static tasks: Collection<string, Task> = new Collection();

  public static registeredCommands: CommandInterface[] = [];

  public static privateRest = new REST({ version: "10" }).setToken(
    process.env.TOKEN!
  );

  public static init() {
    if (!App.initiated) {
      const envAvail = App.envCheckup();
      if (typeof envAvail == "string") throw new Error(envAvail);

      App.discordBot.login(App.token);
      App.discordBot.once("clientReady", () => {
        Logger.info(
          "LOAD",
          `Connected to discord user ${App.discordBot.user?.tag ?? "unknown"}!`
        );
        App.directories.forEach((x) => App.loadModules(x));
        App.loadSlashCommands();
      });
    }
  }

  private static envCheckup() {
    if (!process.env.TOKEN)
      return "Please provide a TOKEN in the environment table!";
    return true;
  }

  private static loadModules(directoryPath: string) {
    const directoryStats = fs.statSync(directoryPath);
    if (!directoryStats.isDirectory())
      Logger.error(
        "LOAD_MODULES",
        `The ${directoryPath} directory is not available.`
      );

    const files = fs.readdirSync(directoryPath);
    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      const fileStats = fs.statSync(filePath);

      if (fileStats.isDirectory()) {
        this.loadModules(filePath);
        return;
      }
      if (
        !fileStats.isFile() ||
        !/^.*\.(js|ts|jsx|tsx)$/i.test(file) ||
        path.parse(filePath).name === "index"
      )
        return;

      const module = require(filePath);
      // If the file does not have a class, then don't use it
      let ModuleFunction: Constructor<Event | Task | AllCommandTypes> | null;
      if (typeof module === "function") ModuleFunction = module;
      else if (module && module.default) ModuleFunction = module.default;
      else ModuleFunction = null;

      if (ModuleFunction) {
        try {
          const moduleObject = new ModuleFunction();
          if (moduleObject instanceof Event) {
            if (moduleObject && moduleObject.eventNames) {
              if (App.events.has(filePath)) {
                Logger.error(
                  "LOAD_MODULES",
                  `Event at ${filePath} is already loaded!`
                );
                throw new Error(`Event at ${filePath} is already loaded!`);
              } else {
                moduleObject.eventNames.forEach((eventName) => {
                  App.discordBot.addListener(eventName, async (...args) =>
                    moduleObject.handle.bind(moduleObject)(...args, eventName)
                  );
                });
                App.events.set(filePath, moduleObject);
              }
            }
          } else if (moduleObject instanceof Task) {
            if (moduleObject?.taskName) {
              if (App.tasks.has(moduleObject.taskName)) {
                Logger.warn(
                  "LOAD_MODULES",
                  `Duplicate task ${moduleObject.taskName}.`
                );
              } else {
                App.tasks.set(moduleObject.taskName, moduleObject);
                setInterval(
                  moduleObject.execute.bind(moduleObject),
                  moduleObject.interval
                );
              }
            }
          } else if (
            moduleObject instanceof Command ||
            moduleObject instanceof ParentCommand ||
            moduleObject instanceof ChildCommand
          ) {
            App.commands.push(moduleObject);
          } else {
            Logger.error(
              "LOAD_MODULES",
              `The ${directoryPath} directory is not available.`
            );
          }
        } catch (err) {
          Logger.warn("LOAD_MODULES", `${filePath} is not a class:\n${err}`);
        }
      } else {
        Logger.error(
          "LOAD_MODULES",
          `The ${filePath} file does not contain a default function.`
        );
      }
    });
  }

  private static async loadSlashCommands() {
    try {
      // Format the parent slash commands to include child in them
      App.commands = App.commands
        .map((command) => {
          if (command instanceof ChildCommand || command instanceof Command)
            return command;

          if (command instanceof ParentCommand) {
            const childSlashCommands = command.childCommands.map(
              (x) => x.slashCommand
            );

            childSlashCommands.forEach((childSlashCommand) => {
              command.slashCommand.addSubcommand(childSlashCommand);
            });

            return command;
          }

          Logger.warn("LOAD_SLASHCMD", `Faulty command type ${command}`);
          return null;
        })
        .filter((x) => !!x);

      const formattedCommands = App.commands
        .map((command) => {
          if (command instanceof ChildCommand) return null;
          if (command instanceof ParentCommand || command instanceof Command) {
            return command.slashCommand;
          }
          return null;
        })
        .filter((x) => !!x);

      App.registeredCommands = (await App.privateRest.put(
        Routes.applicationCommands(App.discordBot.user!.id),
        { body: formattedCommands }
      )) as CommandInterface[];

      Logger.info("LOAD_SLASHCMD", "Slash commands loaded successfully");
    } catch (err) {
      Logger.error("LOAD_SLASHCMD", err instanceof Error ? err : String(err));
    }
  }
}

App.init();
