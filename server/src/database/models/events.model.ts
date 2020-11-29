/**
 * User: abhijit.baldawa
 *
 * This module exposes methods to perform CRUD operations on events collection
 */

import mongoose, { Document, Schema } from 'mongoose';

const COLLECTION_NAME = 'events';

// --- Define types ---
interface Event {
  name: string;
  time: Date;
}

interface EventDBRecord extends Event, Document {}
// --- Types END ---

// --- Define schema and initialize model
const eventsSchema = new Schema<EventDBRecord>({
  name: { type: String, required: true },
  time: { type: Date, required: true },
});

const EventsModel = mongoose.model<EventDBRecord>(
  COLLECTION_NAME,
  eventsSchema
);
// ---- END ----

/**
 * @public
 *
 * Save new event details
 *
 * @param event
 */
const saveEvent = async (event: Event): Promise<EventDBRecord> => {
  try {
    return await new EventsModel(event).save();
  } catch (err) {
    throw new Error(
      `Error saving event = '${JSON.stringify(event)}' in DB. ${err}`
    );
  }
};

/**
 * @public
 *
 * Get events by time
 *
 * @param time
 */
const getEventsByTime = async (time: Date): Promise<EventDBRecord[]> => {
  try {
    return await EventsModel.find({ time });
  } catch (err) {
    throw new Error(
      `Error querying events by time = '${time}' from DB. ${err}`
    );
  }
};

export { EventDBRecord, Event, saveEvent, getEventsByTime };
