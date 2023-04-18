import { ConsoleLogger, LogLevel } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  printMessages(messages, context = '', logLevel = 'log', writeStreamType) {
    messages.forEach(message => {
      const pidMessage = this.formatPid(process.pid);
      const contextMessage = this.formatContext(context);
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, ' ');
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
