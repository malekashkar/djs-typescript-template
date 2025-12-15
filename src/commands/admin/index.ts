import { ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ChildCommand, Command, ParentCommand } from "..";

export abstract class ParentAdminCommand extends ParentCommand {
  async canRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions) return false;

    return interaction.memberPermissions.has(
      PermissionsBitField.Flags.Administrator
    );
  }
}

export abstract class AdminCommand extends Command {
  async canRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions) return false;
    
    return interaction.memberPermissions.has(
      PermissionsBitField.Flags.Administrator
    );
  }
}

export abstract class ChildAdminCommand extends ChildCommand {
  async canRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions) return false;
    
    return interaction.memberPermissions.has(
      PermissionsBitField.Flags.Administrator
    );
  }
}
