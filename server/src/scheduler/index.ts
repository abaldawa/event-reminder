/**
 * User: abhijit.baldawa
 *
 * This is scheduler module. It reads cron jobs config from
 * cronJobs.json and emits event (as configured in cronJobs.json)
 * once time for any cron job has reached. The schedule listeners
 * can listen to those emitted events and handle them accordingly
 */

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import * as scheduleHandlers from './handlers';
import cronJobsObject from './cronJobs.json';

class Scheduler extends EventEmitter {
  #jobs: CronJob[] = [];

  constructor() {
    super();
    this.#init();
  }

  #init = (): void => {
    for (const cronJobConfig of Object.values(cronJobsObject)) {
      const job = new CronJob({
        cronTime: cronJobConfig.cronTime,
        onTick: () => {
          this.emit(cronJobConfig.cronName);
        },
      });

      this.#jobs.push(job);
    }
  };

  /**
   * Start both the scheduler and schedule event listeners
   */
  public start(): void {
    scheduleHandlers.listen(this);
    this.#jobs.forEach((job) => job.start());
  }

  /**
   * Stops the scheduler
   */
  public stop(): void {
    this.#jobs.forEach((job) => job.stop());
  }
}

export default new Scheduler();
export type { Scheduler };
