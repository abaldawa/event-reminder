import moment from 'moment-timezone';
import {
  SaveEventArg,
  saveEvent,
  getTimeZones,
  getEventsByTime
} from '../../../src/services/events.service';
import { Types } from "mongoose";
import { Event } from '../../../src/database/models/events.model';
import * as eventsModel from '../../../src/database/models/events.model';

jest.mock('../../../src/database/models/events.model', ()=> ({
  getEventsByTime: jest
    .fn()
    .mockRejectedValueOnce(new Error('DB error'))
    .mockResolvedValueOnce([])
    .mockImplementation(async () => [{
      name: 'some event',
      _id: new Types.ObjectId(),
      time: moment().toDate()
    }]),

  saveEvent: jest
    .fn()
    .mockRejectedValueOnce(new Error('DB error'))
    .mockImplementation(async (event: Event) => ({
      name: event.name,
      _id: new Types.ObjectId(),
      time: event.time
    })),
}));

describe('src/services/events.service', () => {
  describe('#saveEvent()', () => {
    const currentTimeZone = moment.tz.guess();
    const eventName = 'dummy event';
    const dateTimeFormat = 'YYYY-MM-DD HH:mm';

    const getFutureTime = (hoursToWait: number, timeFormat: string): string => {
      const currentDate = moment();
      return currentDate
        .clone()
        .hours(currentDate.hours() + hoursToWait)
        .format(timeFormat);
    };

    it(`Should throw an error if 'eventName' is not provided`, async () => {
      await expect(
        saveEvent({} as SaveEventArg)
      ).rejects.toThrow(/'eventName' is required/);
    });

    it(`Should throw an error if 'timeZone' is not provided`, async () => {
      await expect(
        saveEvent({eventName} as SaveEventArg)
      ).rejects.toThrow(/'timeZone' is required/);
    });

    it(`Should throw an error if invalid 'timeZone' is provided`, async () => {
      const timeZone = 'invalid';

      await expect(
        saveEvent({eventName, timeZone} as SaveEventArg)
      ).rejects.toThrow(new RegExp(`timeZone='${timeZone}' is invalid`));
    });

    it(`Should throw an error if 'time' is not provided`, async () => {
      await expect(
        saveEvent({eventName, timeZone: currentTimeZone} as SaveEventArg)
      ).rejects.toThrow(/'time' is required/);
    });

    it(`Should throw an error if invalid 'time' is provided`, async () => {
      const time = 'invalid time';

      await expect(
        saveEvent({eventName, timeZone: currentTimeZone, time})
      ).rejects.toThrow(new RegExp(`time='${time}' is invalid`));
    });

    it(`Should throw an error if event 'time' is in past`, async () => {
      const currentTime = moment();
      const pastTimeStr = currentTime
        .clone()
        .minutes(currentTime.minutes()-1)
        .format(dateTimeFormat);

      await expect(
        saveEvent({eventName, timeZone: currentTimeZone, time: pastTimeStr})
      ).rejects.toThrow(new RegExp(`time='${pastTimeStr} should be in future`));
    });

    it(`Should throw an error if event 'time' is in the current minute`, async () => {
      const currentTimeStr = moment().format(dateTimeFormat);

      await expect(
        saveEvent({eventName, timeZone: currentTimeZone, time: currentTimeStr})
      ).rejects.toThrow(new RegExp(`time='${currentTimeStr} should be in future`));
    });

    it(`Should throw an error if there is an error saving valid future event`, async () => {
      const futureTimeStr = getFutureTime(3, dateTimeFormat);

      await expect(
        saveEvent({eventName, timeZone: currentTimeZone, time: futureTimeStr})
      ).rejects.toThrow(new Error('DB error'));

      expect(eventsModel.saveEvent).lastCalledWith({
        name: eventName,
        time: moment.tz(futureTimeStr, dateTimeFormat, true, currentTimeZone).toDate(),
      });
    });

    it(`Should successfully save a valid future event`, async () => {
      const futureTimeStr = getFutureTime(3, dateTimeFormat);
      const futureDateTime = moment.tz(futureTimeStr, dateTimeFormat, true, currentTimeZone).toDate()

      await expect(
        saveEvent({eventName, timeZone: currentTimeZone, time: futureTimeStr})
      ).resolves.toStrictEqual({
        name: eventName,
        time: futureDateTime,
        _id: expect.any(Types.ObjectId)
      });

      expect(eventsModel.saveEvent).lastCalledWith({
        name: eventName,
        time: futureDateTime,
      });
    });
  });

  describe('#getEventsByTime()', () => {
    const dateTime = moment().toDate();

    it('Should throw an error if there is an an error fetching events from DB', async () => {
      await expect(
        getEventsByTime(dateTime)
      ).rejects.toThrow(new Error('DB error'))
    });

    it('Should return an empty array if no events were found in DB for that time', async () => {
      const events = await getEventsByTime(dateTime);

      expect(events).toStrictEqual(expect.any(Array));
      expect(events.length === 0).toBe(true);
    });

    it('Should return all the events in array found in the DB at that time', async () => {
      const events = await getEventsByTime(dateTime);

      expect(events).toStrictEqual(expect.any(Array));
      expect(events.length > 0).toBe(true);

      events.forEach((event) => {
        expect(event).toStrictEqual({
          _id: expect.any(Types.ObjectId),
          name: expect.any(String),
          time: expect.any(Date)
        });
      });
    });
  });

  describe('#getTimeZones()', () => {
    it('Should return array of timezones', () => {
      const timeZones = getTimeZones();

      expect(timeZones).toStrictEqual(expect.any(Array));
      expect(timeZones.length > 0).toBe(true);

      timeZones.forEach((timeZone) => {
        expect(timeZone).toStrictEqual(expect.any(String))
      });
    });
  });
});