import { io as socketIoClient, Socket } from 'socket.io-client';
import moment from 'moment-timezone';

// Supported commands by event-reminder server
enum Commands {
    scheduleEvent = 'scheduleEvent',
    getAllTimeZones = 'getAllTimeZones',
}

// Event reminder type on server
interface EventReminder {
  name: string;
  time: string;
  _id: string;
}

// Timezones type
type TimeZones = string[];

// event-reminder server response structure for any emitted command
interface WebSocketServerResponse {
    status: 'success' | 'failure';
    response?: EventReminder | TimeZones;
    error?: string;
}

const WEB_SOCKET_SERVER_PORT = 3000;
const WEBSOCKET_SERVER_URL = `ws://localhost:${WEB_SOCKET_SERVER_PORT}`;

/**
 * Returns future time
 *
 * @param minutesToWait
 * @param dateTimeFormat - YYYY-MM-DD HH:mm
 * @return time in provided format
 */
const getFutureTime = (minutesToWait: number, dateTimeFormat: string): string => {
  const currentDate = moment();
  return currentDate
    .clone()
    .minutes(currentDate.minutes() + minutesToWait)
    .format(dateTimeFormat);
};

/**
 * Given a URL returns a socket.io client successfully
 * connected to Websocket (socket.io) server
 *
 * @param URL - server connection URL
 * @returns socket connection
 */
const getLiveSocketClient = async (URL: string): Promise<Socket> => {
    const socketClient: Socket = socketIoClient(URL);

    await new Promise<void>( (resolve) => {
        socketClient.on('connect', resolve);
    } );

    return socketClient;
};

/**
 * Checks if '-onlyListen' flag is set or not
 *
 * @returns true if the flag is set else false
 */
const onlyListenFlag = (): boolean => process.argv.includes('-onlyListen');

/**
 * Checks if '-timeZone' flag is set or not
 *
 * @returns true if the flag is set else false
 */
const timeZoneFlag = (): boolean => process.argv.includes('-timeZone');

/**
 * Fetches all time Zones from websocket server and logs it
 * NOTE: Will only be executed if '-timeZone' flag is passed
 */
const getAndLogTimeZones = async (): Promise<void> => {
    console.log(`Getting timezones via command: '${Commands.getAllTimeZones}' from websocket server`);

    const socketClient = await getLiveSocketClient(WEBSOCKET_SERVER_URL);
    const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
        socketClient.emit(
            'command',
            {
                command: Commands.getAllTimeZones
            },
            resolve
        );
    } );

    if(serverResponse.status === 'failure') {
        console.log(`${Commands.getAllTimeZones}: Failed. Server response = ${JSON.stringify(serverResponse, null, 2)}`);
    } else {
        console.log(`${Commands.getAllTimeZones}: Server response= ${JSON.stringify(serverResponse.response as TimeZones)}`);
    }
    socketClient.disconnect();
};

/**
 * By default schedules an event reminder for the next minute on the websocket server
 * logs the event reminder received from the server.
 *
 * If '-onlyListen' flag is passed then will only listen for event reminders from
 * the websocket server
 */
const scheduleAndListenToReminders = async () => {
    const dateTimeFormat = 'YYYY-MM-DD HH:mm';
    const event = {
        time: getFutureTime(1, dateTimeFormat), // Get reminder after 1 minute from now
        timeZone: moment.tz.guess(),
        eventName: 'Dummy event',
    };
    const socketClient = await getLiveSocketClient(WEBSOCKET_SERVER_URL);

    /**
     * NOTE: If user has explicitly set to only listen for event reminders
     * then do not schedule event event reminders on the websocket server
     */
    if(!onlyListenFlag()) {
        console.log(`Executing command: '${Commands.scheduleEvent}' on websocket server`);

        const serverResponse = await new Promise<WebSocketServerResponse>( (resolve) => {
            socketClient.emit(
                'command',
                {
                    command: Commands.scheduleEvent,
                    data: event,
                },
                resolve
            );
        } );

        if(serverResponse.status === 'failure') {
            console.log(`Failed to schedule event='${event.eventName}'. Server response = ${JSON.stringify(serverResponse)}`);
        } else {
            console.log(
                `Successfully scheduled event='${
                    event.eventName
                }'. Websocket server would remind about this event at: '${
                    moment((serverResponse.response as EventReminder).time)
                }'`
            );
        }
    }

    console.log('Listening for event reminders from websocket server');
    socketClient.on('eventReminder', (eventReminder: EventReminder) => {
        console.log(`Got event reminder from server = ${JSON.stringify(eventReminder)}`);
    });
};

if(timeZoneFlag()) {
    getAndLogTimeZones();
} else {
    scheduleAndListenToReminders();
}
