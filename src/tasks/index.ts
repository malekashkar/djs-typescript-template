export default abstract class Task {
  abstract taskName: string;
  abstract interval: number;
  abstract execute(...args: unknown[]): Promise<void>;
}