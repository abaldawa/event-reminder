const io = require('socket.io-client');
const moment = require('moment-timezone');

/**
 * Returns future time
 *
 * @param {number} minutesToWait
 * @param {string} dateTimeFormat - YYYY-MM-DD HH:mm
 * @returns {string} timeFormat
 */
const getFutureTime = (minutesToWait, dateTimeFormat) => {
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
 * @param {string} URL - server connection URL
 * @returns {Object} socket connection
 */
const getLiveSocketClient = async (URL) => {
    const socketClient = io(URL);

    await new Promise( (resolve) => {
        socketClient.on('connect', resolve);
    } );

    return socketClient;
};

/**
 * Checks if -onlyListen flag is set or not
 *
 * @returns {boolean}
 */
const onlyListen = () => process.argv.includes('-onlyListen');

(async () => {
    const WEB_SOCKET_SERVER_PORT = 3000;
    const dateTimeFormat = 'YYYY-MM-DD HH:mm';
    const event = {
        time: getFutureTime(1, dateTimeFormat),
        timeZone: moment.tz.guess(),
        eventName: 'Dummy event',
    };
    const socketClient = await getLiveSocketClient(`ws://localhost:${WEB_SOCKET_SERVER_PORT}`);

    /**
     * NOTE: If user has explicitly set to only listen for event reminders
     * then do not schedule event event reminders on the websocket server
     */
    if(!onlyListen()) {
        const serverResponse = await new Promise( (resolve) => {
            socketClient.emit(
                'command',
                {
                    command: 'scheduleEvent',
                    data: event,
                },
                resolve
            );
        } );

        if(serverResponse.status === 'failure') {
            console.log(`Failed to schedule event='${event.eventName}'. Server response = ${JSON.stringify(serverResponse)}`);
        } else {
            console.log(
                `Successfully scheduled event='${event.eventName}'. Websocket server would remind about this event at: '${moment(serverResponse.response.time)}'`
            );
        }
    }

    console.log('Listening for event reminders from websocket server');
    socketClient.on('eventReminder', (eventReminder) => {
        console.log(`Got event reminder from server = ${JSON.stringify(eventReminder)}`);
    });
})();
