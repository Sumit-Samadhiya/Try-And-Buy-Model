import { remainingTrialSeconds } from './trialTimer';
test('the same server deadline survives reload and cannot create a fresh 15 minute timer', () => {
  const start = Date.parse('2026-09-24T10:00:00Z');
  const deadline = new Date(start + 15 * 60000).toISOString();
  expect(remainingTrialSeconds(deadline, start + 6 * 60000)).toBe(540);
  expect(remainingTrialSeconds(deadline, start + 6 * 60000)).toBe(540);
  expect(remainingTrialSeconds(deadline, start + 16 * 60000)).toBe(0);
  expect(remainingTrialSeconds(null, start)).toBeNull();
});
