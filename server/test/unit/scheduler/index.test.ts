import moment from 'moment-timezone';
import sinon from 'sinon';
import scheduler, { Scheduler } from '../../../src/scheduler';

const dummyEventListener = jest.fn();

// Mock the cronjobs.json and provide dummy configuration
jest.mock('../../../src/scheduler/cronJobs.json', () => ({
  dummyEvent: {
    cronName: 'dummyEvent',
    description: 'This event fires every minute',
    cronTime: '00 * * * * *'
  }
}));

// connect mocked dummy event listener to listen to dummyEvent via scheduler
jest.mock('../../../src/scheduler/handlers', () => ({
  listen: (scheduler: Scheduler): void => {
    scheduler.on('dummyEvent', dummyEventListener);
  }
}));

describe('src/scheduler/index.ts' , () => {
  let fakeTimer: sinon.SinonFakeTimers;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers({
      now: +moment().seconds(0).millisecond(0), // Start current minute
      shouldAdvanceTime: true
    });
  });

  afterAll(() => {
    fakeTimer.restore();
  });

  describe('#start()',  () => {
    it('Should start all the schedule listeners successfully', () => {
      expect(() => scheduler.start()).not.toThrow();
    });

    it('Should not call schedule listeners before the configured time', async () => {
      await fakeTimer.tickAsync(1000 * 59)
      expect(dummyEventListener).toBeCalledTimes(0)
    });

    it('Should call schedule listeners when the configured time has reached', async () => {
      await fakeTimer.tickAsync(1000 )
      expect(dummyEventListener).toBeCalledTimes(1)
    });
  });

  describe('#stop()',  () => {
    beforeAll(() => {
      dummyEventListener.mockClear();
    });

    it('Should stop all the schedule listeners successfully', () => {
      expect(() => scheduler.stop()).not.toThrow();
    });

    it('Should not call any schedule listeners in future', async () => {
      await fakeTimer.tickAsync(1000 * 120)
      expect(dummyEventListener).not.toHaveBeenCalled()
    });
  });
});