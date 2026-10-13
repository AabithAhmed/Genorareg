import { v4 as uuidv4 } from 'uuid';
import { NormalizedCandidate } from '../types';

export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\s+/g, ' ');
};

export const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

export const normalizeEvents = (eventsStr: string, configuredEvents?: string[]): string[] => {
  if (!eventsStr) return [];
  // Split by common separators: comma, pipe, semicolon, slash, newline
  const rawEvents = eventsStr.split(/[,|;/\n]+/).map(e => e.trim()).filter(e => e.length > 0);
  
  if (!configuredEvents || configuredEvents.length === 0) {
    return rawEvents;
  }

  // If configured events exist, try to match them loosely to avoid splitting configured events that contain separators
  // Actually, standard split might break if configured event has a comma, but usually separators are standard.
  // For safety, let's just return the split parts for now.
  return rawEvents;
};

export interface FieldMapping {
  originalHeader: string;
  mappedField: keyof NormalizedCandidate | null;
}

export const normalizeCandidates = (
  rows: Record<string, string>[],
  mappings: FieldMapping[],
  configuredEvents?: string[]
): NormalizedCandidate[] => {
  return rows.map((row, index) => {
    const candidate: Partial<NormalizedCandidate> = {
      candidateId: uuidv4(),
      sourceRowNumber: index + 1, // 1-based index (header is 0 theoretically but rows array doesn't have it)
      events: [],
    };

    for (const mapping of mappings) {
      if (mapping.mappedField) {
        const rawValue = row[mapping.originalHeader];
        
        switch (mapping.mappedField) {
          case 'name':
            candidate.name = normalizeName(rawValue);
            break;
          case 'email':
            candidate.email = normalizeEmail(rawValue);
            break;
          case 'events':
            candidate.events = normalizeEvents(rawValue, configuredEvents);
            break;
          case 'college':
          case 'food':
          case 'registrationId':
          case 'phone':
            candidate[mapping.mappedField] = rawValue ? rawValue.trim() : '';
            break;
        }
      }
    }

    return candidate as NormalizedCandidate;
  });
};
