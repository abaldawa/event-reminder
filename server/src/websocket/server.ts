/**
 * User: abhijit.baldawa
 *
 * This module exposes methods to interact with socket.io server
 */

import { Server, Socket } from 'socket.io';
import * as http from 'http';
import { SocketMessage, webSocketMessageHandler } from './messageHandler';
import { Event } from '../database/models/events.model';

let socketioServer: Server | undefined;

/**
 * @public
 *
 * Binds the socket.io server to the passed in http server and does below:
 * 1] Starts listening on 'connection' event for socket.io clients
 * 2] Handles the commands received in 'command' event emitted from
 *    connected socket.io clients
 *
 * @param server - http server to bind socket.io server
 */
const attach = (server: http.Server): void => {
  socketioServer = new Server(server);
  socketioServer.on('connection', (socket: Socket) => {
    socket.on(
      'command',
      async (message: SocketMessage, callback?: (...args: any[]) => void) => {
        const response = await webSocketMessageHandler(message);
        callback?.(response);
      }
    );
  });
};

/**
 * @public
 *
 * Notifies ALL current events to all the connected websocket
 * clients
 *
 * @param currentEvents
 */
const notifyEventsToAll = (currentEvents: Event[]): void => {
  if (!socketioServer) {
    throw new Error(`Websocket server not initialised`);
  }

  for (const currentEvent of currentEvents) {
    socketioServer.emit('eventReminder', currentEvent);
  }
};

export { attach, notifyEventsToAll };
