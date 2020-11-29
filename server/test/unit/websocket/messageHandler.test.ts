import moment from 'moment-timezone';
import { Types } from 'mongoose';
import { SocketMessage, webSocketMessageHandler } from '../../../src/websocket/messageHandler';
import { SaveEventArg } from '../../../src/services/events.service';

jest.mock('../../../src/services/events.service', () => ({
  saveEvent: jest
    .fn()
    .mockRejectedValueOnce(new Error('DB error'))
    .mockImplementation(async (event: SaveEventArg) => ({
      name: event.eventName,
      _id: new Types.ObjectId(),
      time: moment().toDate()
    })),

  getTimeZones: jest
    .fn()
    .mockReturnValue(['time/zone1', 'time/zone2', 'time/zone3'])
}));

const scheduleEventCommand = {
  command: 'scheduleEvent',
  data: {
    eventName: 'dummy event',
    time: moment().format('YYYY-MM-DD HH:mm'),
    timeZone: moment.tz.guess()
  }
} as SocketMessage;

const getAllTimeZonesCommand = {
  command: 'getAllTimeZones'
} as SocketMessage;

describe('src/websocket/messageHandler.ts', () => {
  describe('#webSocketMessageHandler()', () => {
    it(`Should return error response if message does not have 'command' key`, async () => {
      await expect(
        webSocketMessageHandler({} as SocketMessage)
      ).resolves.toStrictEqual({
        status: 'failure',
        error: expect.stringMatching(/Invalid message passed/)
      });
    });

    it(`Should return un-recognized error response if 'command' is not recognised`, async () => {
      await expect(
        webSocketMessageHandler({command: 'invalid'} as any as SocketMessage)
      ).resolves.toStrictEqual({
        status: 'failure',
        error: expect.stringMatching(/un-recognized command/)
      });
    });

    it(`For 'scheduleEvent' command should handle any error handling that event\
     and respond with appropriate failure structure`, async () => {
      await expect(
        webSocketMessageHandler(scheduleEventCommand)
      ).resolves.toStrictEqual({
        status: 'failure',
        error: expect.stringMatching(/DB error/)
      });
    });

    it(`For 'scheduleEvent' command should save the event and respond with success`, async () => {
      await expect(
        webSocketMessageHandler(scheduleEventCommand)
      ).resolves.toStrictEqual({
        status: 'success',
        response: {
          name: scheduleEventCommand.data.eventName as string,
          time: expect.any(Date),
          _id: expect.any(Types.ObjectId)
        }
      });
    });

    it(`For 'getAllTimeZones' command should respond with array of timezones`,  async () => {
      const timeZonesResponse =  await webSocketMessageHandler(getAllTimeZonesCommand);

      expect(timeZonesResponse).toStrictEqual({
        status: 'success',
        response: expect.any(Array)
      });
      expect((timeZonesResponse.response as string[]).length > 0).toBe(true);

      (timeZonesResponse.response as string[]).forEach((timeZone) => {
        expect(timeZone).toStrictEqual(expect.any(String));
      });
    });
  });
});