/**
 * User: abhijit.baldawa
 *
 * This module exposes method to handle messages received on websocket server
 */

import {
  SaveEventArg,
  saveEvent,
  getTimeZones,
} from '../services/events.service';

enum Commands {
  scheduleEvent = 'scheduleEvent',
  getAllTimeZones = 'getAllTimeZones',
}

interface SocketMessage {
  command: Commands;
  data?: any;
}

interface WebSocketServerResponse {
  status: 'success' | 'failure';
  response?: any;
  error?: string;
}

/**
 * @public
 *
 * Handle messages received on websocket server
 *
 * @param socketMessage
 */
const webSocketMessageHandler = async (
  socketMessage: SocketMessage
): Promise<WebSocketServerResponse> => {
  try {
    if (!socketMessage || !socketMessage.command) {
      throw new Error(
        `Invalid message passed. Socket message must be a JSON with valid 'command' property`
      );
    }

    switch (socketMessage.command) {
      case Commands.scheduleEvent:
        const savedEvent = await saveEvent(socketMessage.data as SaveEventArg);
        return { status: 'success', response: savedEvent };
      case Commands.getAllTimeZones:
        return { status: 'success', response: getTimeZones() };
      default:
        return { status: 'failure', error: 'un-recognized command' };
    }
  } catch (error: unknown) {
    return { status: 'failure', error: (error as Error).message };
  }
};

export {
  SocketMessage,
  WebSocketServerResponse,
  Commands,
  webSocketMessageHandler,
};
