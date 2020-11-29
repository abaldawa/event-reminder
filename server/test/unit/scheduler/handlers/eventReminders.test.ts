import {EventEmitter} from 'events';
import moment from 'moment-timezone';
import { Types } from 'mongoose';
import * as eventReminders from '../../../../src/scheduler/handlers/eventReminder';
import { eventReminder } from '../../../../src/scheduler/cronJobs.json';
import {notifyEventsToAll} from '../../../../src/websocket/server';
import logger from '../../../../src/logger';
import type { Scheduler } from '../../../../src/scheduler';

const waitForNextCycle = (): Promise<void> => new Promise( (resolve) => setImmediate(resolve) );
const scheduler = new EventEmitter() as Scheduler;
const dummyEvents = [
  {
    name: 'dummy event name1',
    time: moment().seconds(0).millisecond(0).toDate(),
    _id: new Types.ObjectId()
  },
  {
    name: 'dummy event name2',
    time: moment().seconds(0).millisecond(0).toDate(),
    _id: new Types.ObjectId()
  }
];

jest.mock( '../../../../src/websocket/server', () => ({
  notifyEventsToAll: jest.fn()
}));

jest.mock('../../../../src/services/events.service', () => ({
  getEventsByTime: jest
    .fn()
    .mockRejectedValueOnce(new Error('DB error'))
    .mockResolvedValueOnce([])
    .mockImplementationOnce(async () => dummyEvents)
}));

jest.mock('../../../../src/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('src/scheduler/handlers/eventReminders.ts', () => {
  describe('#listen()', () => {
    beforeEach(() => {
      (logger.error as jest.Mock).mockClear();
      (logger.info as jest.Mock).mockClear();
      (notifyEventsToAll as jest.Mock).mockClear();
    });

    it(`Should start listening to '${eventReminder.cronName}' when scheduler is passed`, async () => {
      const listenResponse = eventReminders.listen(scheduler);
      expect(listenResponse).toBeUndefined();
    });

    it(`When schedule emits '${eventReminder.cronName}' event should handle the event\
    and log any errors occurred during processing of the event`, async () => {
      scheduler.emit(eventReminder.cronName);
      await waitForNextCycle();

      expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/DB error/));
      expect(notifyEventsToAll).not.toHaveBeenCalled();
    });

    it(`When schedule emits '${eventReminder.cronName}' event and no event is\
    found for that time in DB then the event reminder handler does nothing`, async () => {
      scheduler.emit(eventReminder.cronName);
      await waitForNextCycle();

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(notifyEventsToAll).not.toHaveBeenCalled();
    });

    it(`When schedule emits '${eventReminder.cronName}' event and one or more events are found for that time in DB\
    then logs the info and informs websocket server to broadcast those events all connected sockets`, async () => {
      scheduler.emit(eventReminder.cronName);
      await waitForNextCycle();

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/found '2' events/));
      expect(notifyEventsToAll).toHaveBeenCalledWith(dummyEvents);
    });
  });
});