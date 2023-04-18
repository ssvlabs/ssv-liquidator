export const getAllowedLogLevels = (): any => {
  const logLevels: any = ['verbose', 'debug', 'log', 'warn', 'error'];
  return logLevels.slice(
    logLevels.indexOf(process.env.LOG_LEVEL || 'debug'),
    logLevels.length,
  );
};
