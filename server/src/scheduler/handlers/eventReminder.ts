/**
 * User: abhijit.baldawa
 *
 * This module handles event reminders.
 */

import moment from 'moment-timezone';
import logger from '../../logger';
import { getEventsByTime } from '../../services/events.service';
import { eventReminder } from '../cronJobs.json';
import { notifyEventsToAll } from '../../websocket/server';
import type { Scheduler } from '..';

/**
 * @private
 *
 * This method will check if there are any events in the DB
 * for the current minute. If yes then a notification is sent
 * to all the connected websockets clients about those events.
 */
const checkAndRemindCurrentEvents = async (): Promise<void> => {
  try {
    const currentTimeToMinutes = moment().seconds(0).milliseconds(0).toDate();
    const currentEvents = await getEventsByTime(currentTimeToMinutes);

    if (currentEvents.length) {
      logger.info(
        `checkAndRemindCurrentEvents: found '${currentEvents.length}' events scheduled at: ${currentTimeToMinutes}. Notifying...`
      );
      notifyEventsToAll(currentEvents);
    }
  } catch (error) {
    logger.error(
      `checkAndRemindCurrentEvents: error: ${(error as Error).stack || error}`
    );
  }
};

/**
 * @public
 *
 * Given a scheduler will start listening for
 * event reminder event from the scheduler
 *
 * @param scheduler
 */
const listen = (scheduler: Scheduler): void => {
  scheduler.on(eventReminder.cronName, checkAndRemindCurrentEvents);
};

export { listen };
