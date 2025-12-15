import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { AdminCommand } from ".";
import embeds from "../../utils/embeds";

export default class TestCommand extends AdminCommand {
  slashCommand = new SlashCommandBuilder()
    .setName("test")
    .setDescription("Try me, I dare you!");

  async execute(interaction: ChatInputCommandInteraction) {
    interaction.reply({
      embeds: [
        embeds.normal(
          `Give this command a shot! See what happens.`,
          `Test Command`
        ),
      ],
    });
  }
}
