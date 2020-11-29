/**
 * User: abhijit.baldawa
 *
 * This module initialises all the schedule handlers
 */

import type { Scheduler } from '..';
import * as eventReminder from './eventReminder';

const listen = (scheduler: Scheduler): void => {
  eventReminder.listen(scheduler);
};

export { listen };
