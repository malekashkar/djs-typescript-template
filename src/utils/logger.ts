/* eslint-disable no-console */
import chalk from 'chalk';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();

class Logger {
  /**
   * Gets the name of the file this method was called from
   */
  static getCallingFilename(n = 1, err: Error | null = null) {
    let info = '';
    try {
      throw new Error();
    } catch (e) {
      const error = err || (e as Error);
      const lines = error.stack?.split('\n') ?? [];
      const line = lines[n] || '';
      const matched = line.match(/([\w\d\-_.]*:\d+:\d+)/);
      info = matched?.[1] ?? '';
    }
    return info;
  }

  /**
   * Gets log string given the necessary arguments
   */
  static getLogString(type: string, tag: string, text: string | Error, n = 0) {
    if (!tag || !text) return '';

    let newTag: string = tag;
    let newText: string | Error = text;
    if (typeof tag !== 'string') {
      newTag = String(tag);
    }
    if (typeof text !== 'string' && !(text instanceof Error)) {
      newText = String(text);
    }

    const newN = n || (text instanceof Error ? 2 : 4);
    newTag = newTag.trim().split('\n').join('_');
    const lines = text instanceof Error
      ? (text.stack
        ?.trim()
        .split('\n')
        .map((x) => x.trim())
        ?? `${text.name} - ${text.message}`.split('\n'))
      : text.toString().trim().split('\n');

    return lines.map((line) => `[${type}] [${moment().format(
      'DD-MM-YYYY, hh:mm:ss A',
    )}] [${this.getCallingFilename(
      newN,
      newText instanceof Error ? newText : null,
    )}] [${newTag}] [${line}]`).join('\n');
  }

  /**
   * Outputs a debug log, used for temporary logs during development
   */
  static debug(tag: string, text: string, n = 0) {
    const logString = this.getLogString('D', tag, text, n);
    console.log(chalk.blue(logString));
  }

  /**
   * Outputs a error log, used for reporting errors
   */
  static error(tag: string, text: string | Error, n = 0) {
    const logString = this.getLogString('E', tag, text, n);
    console.log(chalk.red(logString));
  }

  /**
   * Outputs a info log, used for providing information
   */
  static info(tag: string, text: string, n = 0) {
    const logString = this.getLogString('I', tag, text, n);
    console.log(chalk.green(logString));
  }

  /**
   * Outputs a verbose log, used for everything else
   */
  static verbose(tag: string, text: string, n = 0) {
    const logString = this.getLogString('V', tag, text, n);
    console.log(chalk.hex('#DDA0DD')(logString));
  }

  /**
   * Outputs a warn log, used for warning
   */
  static warn(tag: string, text: string, n = 0) {
    const logString = this.getLogString('W', tag, text, n);
    console.log(chalk.yellow(logString));
  }
}

export default Logger;
