import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { getAllowedLogLevels } from '@cli/shared/services/logging';

export class CustomLogger extends ConsoleLogger {
  protected context: string;
  constructor(context: string) {
    super();
    this.context = context;
  }
  printMessages(messages, context = '', logLevel = 'log', writeStreamType) {
    if (getAllowedLogLevels().indexOf(logLevel) === -1) {
      return;
    }
    messages.forEach(message => {
      const pidMessage = ` ${process.pid} `;
      const contextMessage = `${this.context} `;
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padEnd(7, ' ');
      const formattedMessage = this.formatMessage(
        <LogLevel>logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff,
      );
      let loggerMethod = 'log';
      if (writeStreamType === 'stderr') {
        loggerMethod = 'error';
      }
      console[loggerMethod](formattedMessage.replace(/^\n+|\n+$/g, ''));
    });
  }
}
