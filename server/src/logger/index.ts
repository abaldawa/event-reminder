/**
 * User: abhijit.baldawa
 *
 * Standard logger module using winston
 */

import chalk from 'chalk';
import { createLogger, format, transports } from 'winston';

const { Console } = transports;
const { combine, timestamp, printf } = format;

export default createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    printf((logObj) => {
      const log = `${logObj.timestamp} ${logObj.level}: ${logObj.message}`;

      if (logObj.level === 'warn') {
        return chalk.yellow(log);
      }
      if (logObj.level === 'error') {
        return chalk.red(log);
      }
      return log;
    })
  ),
  transports: [new Console()],
});
