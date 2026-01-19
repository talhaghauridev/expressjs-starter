import ms from 'ms';
import ApiError from './api-error';

export const parseTimeToMs = (time: string): number => {
  // @ts-ignore
  const milliseconds = ms(time);
  if (!milliseconds) {
    throw ApiError.badRequest(`Invalid time format: ${time}`);
  }
  return milliseconds;
};

export function getUpdatedFields<T>(current: T, updates: Partial<T>): Partial<T> {
  const changed: Partial<T> = {};
  for (const key in updates) {
    if (updates[key] !== undefined && updates[key] !== current[key]) {
      changed[key] = updates[key];
    }
  }
  return changed;
}
