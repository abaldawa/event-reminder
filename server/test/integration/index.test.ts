import * as http from 'http';
import { Types } from 'mongoose';
import moment from 'moment-timezone';
import { io as socketIoClient, Socket } from 'socket.io-client';
import scheduler from '../../src/scheduler';
import * as websocketServer from '../../src/websocket/server';
import sinon from 'sinon';
import { Commands, WebSocketServerResponse } from '../../src/websocket/messageHandler';
import type { Event } from '../../src/database/models/events.model';

type EventsDB = Event & {_id: Types.ObjectId};

/**
 * Mock the behaviour that we are saving and retrieving from an actual DB
 */
jest.mock('../../src/database/models/events.model', () => {
  const eventsDb: EventsDB[] = [];

  const saveEvent = async (event: Event) => {
    const eventToSave = {...event, _id: new Types.ObjectId()};
    eventsDb.push(eventToSave);

    return eventToSave;
  };

  const getEventsByTime = async (time: Date) => {
    return eventsDb.filter((event: EventsDB) => {
      return event.time.toISOString() === time.toISOString();
    });
  };

  return {
    saveEvent,
    getEventsByTime
  };
});

/**
 * Given a URL returns a socket.io client successfully
 * connected to Websocket (socket.io) server
 *
 * @param URL
 */
const getLiveSocketClient = async (URL: string): Promise<Socket> => {
  const socketClient: Socket = socketIoClient(URL);

  await new Promise<void>( (resolve) => {
    socketClient.on('connect', resolve);
  } );

  return socketClient;
};

/**
 * Returns future time
 *
 * @param hoursToWait
 * @param timeFormat
 */
const getFutureTime = (hoursToWait: number, timeFormat: string): string => {
  const currentDate = moment();
  return currentDate
    .clone()
    .hours(currentDate.hours() + hoursToWait)
    .format(timeFormat);
};

describe('Integration test', () => {
  const eventName = 'Test event';
  const dateTimeFormat = 'YYYY-MM-DD HH:mm';
  const WEBSOCKET_PORT = 3001;
  const currentTimeZone = moment.tz.guess();

  let fakeTimer: sinon.SinonFakeTimers;
  let httpServer: http.Server;

  beforeAll(async () => {
    /**
     * NOTE: Using sinon fake timer instead of jest fake timer because
     * there is known open bug in jest (https://github.com/facebook/jest/issues/10221)
     * which is preventing websocket server to emit an actual event when racing timer
     * with jest.advanceTimersByTime() as it is also mocking process.nextTick.
     *
     * Sinon does not have that bug
     */
    fakeTimer = sinon.useFakeTimers({
      now: Date.now(),
      shouldAdvanceTime: true
    });

    httpServer = http.createServer();
    websocketServer.attach(httpServer);
    httpServer.listen(WEBSOCKET_PORT);
    scheduler.start();
  });

  afterAll( (done) => {
    scheduler.stop();
    fakeTimer.restore();

    httpServer.close(()  => {
      done();
    });
  });

  it('Websocket server should respond with error if input is not valid JSON', async () => {
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        'Non JSON input',
        resolve
      );
    } );

    socketClient.disconnect();

    expect(serverResponse).toEqual({
      status: 'failure',
      error: expect.stringMatching(/Invalid message passed/)
    });
  });

  it(`Websocket server should respond with error if input JSON does not have 'command' property`, async () => {
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        { anykey: 'value' },
        resolve
      );
    } );

    socketClient.disconnect();

    expect(serverResponse).toEqual({
      status: 'failure',
      error: expect.stringMatching(/Invalid message passed/)
    });
  });

  it(`Websocket server should respond with un-recognised command for non supported 'command' property`, async () => {
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        { command: 'invalid' },
        resolve
      );
    } );

    socketClient.disconnect();

    expect(serverResponse).toEqual({
      status: 'failure',
      error: 'un-recognized command'
    });
  });

  it(`Websocket server should respond with all timezones for 'getAllTimeZones' command`, async () => {
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        { command: Commands.getAllTimeZones },
        resolve
      );
    } );

    socketClient.disconnect();

    expect(serverResponse).toEqual({
      status: 'success',
      response: expect.any(Array)
    });
    expect((serverResponse.response as string[]).length > 0).toBe(true);

    (serverResponse.response as string[]).forEach((timeZone) => {
      expect(timeZone).toStrictEqual(expect.any(String));
    });
  });

  it(`For future event 3 hours from now, with 'scheduleEvent' command\
   websocket server should persist and successfully remind that event after 3 hours`, async () => {
    const HOURS_TO_WAIT = 3;
    const eventTime = getFutureTime(HOURS_TO_WAIT, dateTimeFormat);
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);

    // 1. Emit websocket event to schedule an event 3 hours from now
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        {
          command: Commands.scheduleEvent,
          data: {
            eventName,
            timeZone: currentTimeZone,
            time: eventTime
          }
        },
        resolve
      );
    } );

    // 2. Check whether websocket server acknowledged and saved event successfully
    expect(serverResponse).toEqual({
      status: 'success',
      response: expect.any(Object)
    });

    expect(serverResponse.response).toMatchObject({
      name: eventName,
      time: moment.tz(eventTime, dateTimeFormat, currentTimeZone).toISOString(),
      _id: expect.any(String)
    });

    // 3. Check if the websocket client gets reminded about the scheduled event after 3 hours
    const reminder = await new Promise<EventsDB>( async (resolve) => {
      socketClient.on('eventReminder', resolve);
      await fakeTimer.tickAsync(1000 * 60 * 60 * HOURS_TO_WAIT);
    } );

    expect(reminder).toEqual(serverResponse.response as EventsDB);

    // 4. Disconnect the client websocket from server
    socketClient.disconnect();
  });

  it(`For future event 5 hours from now, with 'scheduleEvent' command websocket server should\
    persist and successfully remind that event to all connected socket clients`, async () => {
    const HOURS_TO_WAIT = 5;
    const eventTime = getFutureTime(HOURS_TO_WAIT, dateTimeFormat);
    const socketClients: Socket[] = [];
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`);

    socketClients.push(socketClient);

    // 1. From a socket.io client emit websocket event to schedule an event 5 hours from now
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
      socketClient.emit(
        'command',
        {
          command: Commands.scheduleEvent,
          data: {
            eventName,
            timeZone: currentTimeZone,
            time: eventTime
          }
        },
        resolve
      );
    } );

    // 2. Check whether websocket server acknowledged and saved event successfully
    expect(serverResponse).toEqual({
      status: 'success',
      response: expect.any(Object)
    });

    expect(serverResponse.response).toMatchObject({
      name: eventName,
      time: moment.tz(eventTime, dateTimeFormat, currentTimeZone).toISOString(),
      _id: expect.any(String)
    });

    // 3. Create 4 more additional websocket socket.io clients to the websocket (socket.io) server
    for (const _ of Array(4)) {
      socketClients.push(await getLiveSocketClient(`ws://localhost:${WEBSOCKET_PORT}`));
    }

    // 4. Check whether ALL the connected websocket clients get reminded about the event after 5 hours
    const reminders = await new Promise<EventsDB[]>( async (resolve) => {
      const promArr = socketClients.map((clientSocket: Socket) => {
        return new Promise<EventsDB>((resolve) => clientSocket.on('eventReminder', resolve))
      });
      Promise.all(promArr).then(resolve);

      await fakeTimer.tickAsync(1000 * 60 * 60 * HOURS_TO_WAIT);
    } );

    reminders.forEach( (reminder) => {
      expect(reminder).toEqual({
        name: (serverResponse.response as EventsDB).name,
        time: (serverResponse.response as EventsDB).time,
        _id: (serverResponse.response as EventsDB)._id
      });
    });

    // 5. Disconnect all the websocket clients from the server
    socketClients.forEach( (wsClient) => wsClient.disconnect() );
  }, 8000); // Just in case as rarely sinon.tickAsync can cause a slight delay
});