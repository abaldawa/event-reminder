/**
 * User: abhijit.baldawa
 *
 * This module exposes 'createDBConnection' method to connect
 * mongoose client to mongodb server
 */

import mongoose from 'mongoose';
import { MongoDbConfig } from '../config';

/**
 * @private
 *
 * This method accepts a config object and returns a mongodb connection URL string
 * as per mongodb guideline
 *
 * @param config config This object has all the necessary details to
 *                             connect to mongodb server as configured by user
 * @returns {string} - ex: "mongodb://user:password@host:port/dbname?authSource=source"
 */
const getMongoUrlFromConfig = (config: MongoDbConfig): string => {
  let adminAuthSource: string | undefined;
  let URL = 'mongodb://';

  if (config.dbUser && config.dbPassword && config.authSource) {
    URL = `${URL}${config.dbUser}:${config.dbPassword}@`;
    adminAuthSource = `?authSource=${config.authSource}`;
  }

  URL = `${URL}${config.dbHost}:${config.dbPort}/${config.dbName}`;

  if (adminAuthSource) {
    URL = `${URL}${adminAuthSource}`;
  }
  return URL;
};

/**
 * @public
 *
 * This method connects mongoose to mongoDB server
 *
 * @param dbConfig
 */
const createDBConnection = async (
  dbConfig: MongoDbConfig
): Promise<typeof mongoose> => {
  const URL = getMongoUrlFromConfig(dbConfig);

  return mongoose.connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // return new Promise((resolve, reject) => {
  //   mongoose.connection.on('error', reject).once('open', resolve);
  // });
};

export { createDBConnection };
