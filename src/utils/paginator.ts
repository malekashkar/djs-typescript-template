import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Interaction,
  PermissionsBitField,
} from "discord.js";
import { EventEmitter } from "events";

const availableEmojis = {
  first: "⏮️",
  prev: "◀️",
  stop: "⏹️",
  next: "▶️",
  last: "⏭️",
};

const availableEmojiStrings = Object.values(availableEmojis);

export declare interface Paginator {
  on(event: "start", listener: () => void): this;
  on(event: "first", listener: () => void): this;
  on(event: "prev", listener: () => void): this;
  on(event: "stop", listener: () => void): this;
  on(event: "next", listener: () => void): this;
  on(event: "last", listener: () => void): this;

  emit(event: "start"): boolean;
  emit(event: "first"): boolean;
  emit(event: "prev"): boolean;
  emit(event: "stop"): boolean;
  emit(event: "next"): boolean;
  emit(event: "last"): boolean;
}

export class Paginator extends EventEmitter {
  public currentPageIndex: number;

  constructor(
    public interaction: CommandInteraction,
    public pageCount: number,
    private pageExtractor: (pageIndex: number) => Promise<EmbedBuilder>,
    initialPageIndex = 0,
    public ephemeral: boolean = false,
  ) {
    super();
    this.currentPageIndex = initialPageIndex;
  }

  async getDecoratedEmbed(pageIndex: number) {
    const embed = await this.pageExtractor(pageIndex);
    const embedPage: EmbedBuilder =
      embed instanceof EmbedBuilder ? embed : new EmbedBuilder(embed);

    if (
      embedPage.data.footer &&
      (embedPage.data.footer.text || embedPage.data.footer.icon_url)
    ) {
      if (/(?<!TOTAL_)PAGE(?!S)/g.test(embedPage.data.footer.text)) {
        embedPage.data.footer.text = embedPage.data.footer.text.replace(
          /(?<!TOTAL_)PAGE(?!S)/g,
          (pageIndex + 1).toString()
        );
      }
      if (/TOTAL_PAGES/g.test(embedPage.data.footer.text)) {
        embedPage.data.footer.text = embedPage.data.footer.text.replace(
          /TOTAL_PAGES/g,
          this.pageCount.toString()
        );
      }
      return embedPage;
    }
    return embedPage.setFooter({
      text: `Page ${pageIndex + 1} of ${this.pageCount}`,
    });
  }

  async start() {
    if (!this.interaction.channel) return;
    
    await this.interaction.reply({
      embeds: [await this.getDecoratedEmbed(this.currentPageIndex)],
      components: [
        new ActionRowBuilder().addComponents(
          availableEmojiStrings.map((x) => {
            return new ButtonBuilder()
              .setCustomId(x)
              .setLabel(x)
              .setStyle(ButtonStyle.Primary);
          })
        ) as ActionRowBuilder<ButtonBuilder>,
      ],
      ephemeral: this.ephemeral,
    });

    if (this.pageCount > 1) {
      const componentCollector =
        this.interaction.channel.createMessageComponentCollector({
          filter: (i: Interaction) => {
            return (
              i.isButton() &&
              i.user.id === this.interaction.user.id &&
              availableEmojiStrings.includes(i.customId)
            );
          },
          time: 60000,
          max: this.pageCount * 5,
        });
      this.emit("start");
      componentCollector.on("end", () => {
        if (
          this.interaction.guild &&
          this.interaction.guild.members.me &&
          this.interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)
        )
          this.interaction.editReply({ components: [] });
      });
      componentCollector.on("collect", async (int: ButtonInteraction) => {
        componentCollector.resetTimer({ time: 60000 });

        if (int.customId === availableEmojis.first) {
          if (this.currentPageIndex !== 0) {
            this.currentPageIndex = 0;
            int.deferUpdate();
            this.interaction.editReply({
              embeds: [await this.getDecoratedEmbed(this.currentPageIndex)],
            });
            this.emit("first");
          }
        } else if (int.customId === availableEmojis.prev) {
          this.currentPageIndex--;
          if (this.currentPageIndex < 0)
            this.currentPageIndex = this.pageCount - 1;
          int.deferUpdate();
          this.interaction.editReply({
            embeds: [await this.getDecoratedEmbed(this.currentPageIndex)],
          });
          this.emit("prev");
        } else if (int.customId === availableEmojis.stop) {
          componentCollector.stop("stopped by user");
          this.emit("stop");
        } else if (int.customId === availableEmojis.next) {
          this.currentPageIndex++;
          if (this.currentPageIndex >= this.pageCount) {
            this.currentPageIndex = 0;
          }
          int.deferUpdate();
          this.interaction.editReply({
            embeds: [await this.getDecoratedEmbed(this.currentPageIndex)],
          });
          this.emit("next");
        } else if (int.customId === availableEmojis.last) {
          if (this.currentPageIndex !== this.pageCount - 1) {
            this.currentPageIndex = this.pageCount - 1;
            int.deferUpdate();
            this.interaction.editReply({
              embeds: [await this.getDecoratedEmbed(this.currentPageIndex)],
            });
            this.emit("last");
          }
        }
      });
    }
  }
}

export default Paginator;
