import { NormalizedCandidate, EventConfig } from '../types';

export const csvStore = new Map<string, Record<string, string>[]>();
export const candidateStore = new Map<string, NormalizedCandidate[]>();

let currentEventConfig: EventConfig = {
  eventName: 'GENORA\'26',
  department: 'Department of CSE',
  organization: 'Government College of Engineering, Tirunelveli',
  date: 'October 14, 2026',
  venue: 'Main Auditorium',
};

export const getEventConfig = () => currentEventConfig;
export const setEventConfig = (config: EventConfig) => {
  currentEventConfig = config;
};
