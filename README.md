# event scheduler and reminder

## Author: Abhijit Baldawa

### Description
A socket.io based websocket server to schedule events and get reminded about those events when the time is reached. The events are persisted in database so even if the websocket server is restarted in between those scheduled events are not lost and those events will be notified to all connected websocket client at appropriate time.

### Tech stack
1. **Backend:** Node.js(14.15.1 LTS)/Typescript, socket.io, mongoose.js, moment.js.
2. **Tests:** Unit tests and integration tests (**33 tests written**)
3. **Testing modules used:** Jest
4. **Linters and formatters:** Eslint, prettier
5. **Container:** Docker

### How to run the socket.io based websocket server:
**a] With Docker**
1. **git clone https://github.com/abaldawa/event-reminder.git**
2. **cd event-reminder**
3. **docker-compose up**
4. The websocker server will start running on port **3000**

**b] Without docker**

**_Note: Node.js 14.15.1 and mongodb server must be installed and mongoDB must be up and running_**
1. **git clone https://github.com/abaldawa/event-reminder.git**
2. **cd event-reminder**
3. execute "**npm i**" in the terminal path to install node modules
4. **cp .env.example .env**
5. Execute "**vi .env**" and as a value for '***DB_PORT***' check and update the port on which mongoDB server is running, save the file and exit.
6. Execute "**npm run start**" and it will start the websocket server on port **3000** (or the one you have updated in **.env** file)

**_NOTE:_** To run both unit tests and integration tests execute "**_npm run test_**"

Once the server is running (assuming say on port 3000), a [socket.io-client](https://github.com/socketio/socket.io-client) can be used to create websocket connection to the socket.io based event-reminder websocket server at **ws://localhost:3000**

### Websocket commands supported by event-reminder server:
event-reminder websocket server listens for event **command** and supports two commands for below usecases.

**1]** Get the list of time zones from server using '**getAllTimeZones**' command as below (Typescript code)
```typescript
// Timezones type
type TimeZones = string[];

// Server response structure for commands
interface WebSocketServerResponse {
    status: 'success' | 'failure';
    response?: TimeZones;
    error?: string;
}

// emit 'command' event to the server with command = 'getAllTimeZones' to get list of all time zones
socketioClient.emit( 'command', { command: 'getAllTimeZones' }, (serverResponse: WebSocketServerResponse) => {
  if(serverResponse.status === 'failure') {
    // in this case serverResponse = {status: 'failure', error: 'reason of error'}
  } else {
    // in this case serverResponse = {status: 'success', response: ['Europe/Berlin', 'America/Toronto', ...]}
  }
} );
```

**2]** Schedule event using '**scheduleEvent**' command and get reminded about the same 
on 'eventReminder' event emitted by the server
**(NOTE: all connected sockets gets event reminders on 'eventReminder' event)**
```typescript
// Event reminder type on server
interface EventReminder {
  name: string;
  time: string;
  _id: string;
}

// event-reminder server response structure for any emitted command
interface WebSocketServerResponse {
    status: 'success' | 'failure';
    response?: EventReminder;
    error?: string;
}

const time = '2020-11-29 17:30'; // format 'YYYY-MM-DD HH:mm' (future time at which this event is to be reminded)
const timeZone = 'America/Toronto'; // Time zone of the event to be reminded
const eventName = 'Name of the event';

// 1. emit 'command' event to the server with command = 'scheduleEvent' and 'data' to schedule an event at some point in the future
socketioClient.emit( 'command', { command: 'scheduleEvent', data: { time, timeZone, eventName } }, (serverResponse: WebSocketServerResponse) => {
  if(serverResponse.status === 'failure') {
    // in this case serverResponse = {status: 'failure', error: 'reason of error'}
  } else {
    // Note serverResponse.response.time is the ISOString representation of the passed-in 'time' along with its timeZone
    // in this case serverResponse = {status: 'success', response: {name: 'Name of the event', time: '2020-11-29T22:30:00.000Z', _id: 'some_mongo_id'}}
  }
} );

// 2. listen for 'eventReminder' event to get notified about the events whose time has reached
socketClient.on('eventReminder', (eventReminder: EventReminder) => {
   console.log(`Time is up. Got event reminder from server = ${JSON.stringify(eventReminder)}`);
});
```

### Using exampleClient repo to test event-reminder server
To simplify testing even further I have created a socket.io-client example implementation in **event-reminder/exampleClient**. 
Use this repo to test event-reminder websocket server by getting all ***timezones***, ***schedule events*** and ***get reminded*** about it.

**1]** **cd event-reminder/exampleClient**

**2]** run "***npm i***"

**3]** run "***npm run build***"

**4]** run "***npm run getTimeZones***" (Gets the list of all time zones)

**5]** run "***npm run scheduleEvent***" (Schedules an event for the next clock minute on the event-reminder server. Once the next clock minute is reached an event reminder is notified to all the connected websocket clients and it is logged on console. Technically the user can create an event reminder for ANY date in the future. In this case scheduled for next minute just so to speed up the manual testing)

**6]** run "***npm run listenForReminders***" (With this command socket.io-client is ONLY listening for 'eventReminder' events and logging it on the console. It does not schedule any event. Use this if you want to ONLY listen for event reminders. If as a use you want to schedule event reminder for the next minute and also get notified at the same time then use ***npm run scheduleEvent*** as mentioned in point ***(5)***)
