import { ClientEvents, InteractionResponse } from "discord.js";

export type EventNameType = keyof ClientEvents;

export default abstract class Event {
  disabled = false;
  abstract eventNames: EventNameType[];

  abstract handle(...args: unknown[]): Promise<void | InteractionResponse>;
}