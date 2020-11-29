/**
 * User: abhijit.baldawa
 *
 * This module exposes methods which interacts with events DB collection
 */

import moment from 'moment-timezone';
import * as eventsModel from '../database/models/events.model';

type SaveEventArg = {
  eventName: string;
  time: string;
  timeZone: string;
};

/**
 * @public
 *
 * Get events by time
 *
 * @param time
 */
const getEventsByTime = (time: Date): Promise<eventsModel.EventDBRecord[]> => {
  return eventsModel.getEventsByTime(time);
};

/**
 * @public
 *
 * Save a new event in DB
 *
 * @param event
 */
const saveEvent = async (
  event: SaveEventArg
): Promise<eventsModel.EventDBRecord> => {
  const { eventName, time, timeZone } = event || {};

  // --- Validate inputs
  if (!eventName || typeof eventName !== 'string') {
    throw new Error(`'eventName' is required`);
  }

  if (!timeZone || typeof timeZone !== 'string') {
    throw new Error(`'timeZone' is required`);
  }

  if (!moment.tz.zone(timeZone)) {
    throw new Error(`timeZone='${timeZone}' is invalid`);
  }

  if (!time || typeof time !== 'string') {
    throw new Error(`'time' is required in format 'YYYY-MM-DD HH:mm'`);
  }

  const eventTime = moment.tz(time, 'YYYY-MM-DD HH:mm', true, timeZone);

  if (!eventTime.isValid()) {
    throw new Error(
      `time='${time}' is invalid.'time' should be in format 'YYYY-MM-DD HH:mm' and valid`
    );
  }

  if (eventTime.isSameOrBefore(moment())) {
    throw new Error(`time='${time} should be in future`);
  }

  // Save event
  return eventsModel.saveEvent({
    name: eventName,
    time: eventTime.toDate(),
  });
};

/**
 * @public
 *
 * Get the list of ALL timezones
 */
const getTimeZones = (): string[] => moment.tz.names();

export { SaveEventArg, getEventsByTime, saveEvent, getTimeZones };
