/**
 * User: abhijit.baldawa
 *
 * This module initializes all the pre-requisites and then starts the websocket server
 */

import * as http from 'http';
import { getPort, getMongoDbConfig } from './config';
import { createDBConnection } from './database/dbConnection';
import * as websocketServer from './websocket/server';
import scheduler from './scheduler';
import logger from './logger';

/**
 * @public
 *
 * Async method which does all the standard server startup routine.
 */
const start = async (): Promise<void> => {
  try {
    const PORT = getPort();
    const mongoDbConfig = getMongoDbConfig();
    const server: http.Server = http.createServer();

    // Connect to mongoDB
    await createDBConnection(mongoDbConfig);
    logger.info('Connected to MongoDB.');

    // Start scheduler
    scheduler.start();
    logger.info('Scheduler is running');

    // Start Websocket server
    websocketServer.attach(server);

    await new Promise<void>((resolve) => server.listen(PORT, resolve));
    logger.info(`Websocket server is listening on port = ${PORT}`);
  } catch (err) {
    logger.error(
      `Error while starting server. Error: ${(err as Error).stack}. Exiting...`
    );
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export { start };
