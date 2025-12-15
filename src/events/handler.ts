import { ClientEvents, Interaction } from "discord.js";
import Event from ".";
import App from "..";
import { ChildCommand, Command, ParentCommand } from "../commands";
import embeds from "../utils/embeds";
import Logger from "../utils/logger";

export default class InteractionHandler extends Event {
  eventNames: (keyof ClientEvents)[] = ["interactionCreate"];

  async handle(interaction: Interaction) {
    if (!interaction.isChatInputCommand() || !interaction.isCommand()) return;

    const commandName = interaction.commandName;
    const subCommmandName = interaction.options.getSubcommand(false);

    let command: Command | ChildCommand;
    if (subCommmandName) {
      const parentCommand = App.commands.find(
        (x) =>
          x instanceof ParentCommand &&
          x.slashCommand.name == commandName &&
          x.childCommands.find((y) => y.slashCommand.name == subCommmandName)
      ) as ParentCommand;
      command = parentCommand.childCommands.find(
        (x) => x.slashCommand.name == subCommmandName
      )!;
    } else {
      command = App.commands.find(
        (x) => x instanceof Command && x.slashCommand.name == commandName
      ) as Command;
    }
    if (!command) return;

    if (command.maintenance)
      return interaction.reply({
        embeds: [embeds.error("This command is currently under maintenance!")],
      });

    if (!(await command.canRun(interaction)))
      return interaction.reply({
        embeds: [
          embeds.error(
            `You do not have permission to run this command at the moment.`
          ),
        ],
        ephemeral: true,
      });

    command
      .execute(interaction)
      .catch((e) => Logger.error("COMMAND_HANDLER", e));
  }
}
