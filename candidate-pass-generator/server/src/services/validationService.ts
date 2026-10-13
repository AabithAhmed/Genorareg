import { z } from 'zod';
import { NormalizedCandidate } from '../types';

export const CandidateSchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  events: z.array(z.string()).optional(),
  college: z.string().optional(),
  food: z.string().optional(),
  registrationId: z.string().optional(),
  phone: z.string().optional(),
  sourceRowNumber: z.number(),
});

export interface ValidationResult {
  valid: NormalizedCandidate[];
  invalid: { candidate: NormalizedCandidate; errors: string[] }[];
  duplicates: { candidate: NormalizedCandidate; reason: string }[];
}

export const validateCandidates = (
  candidates: NormalizedCandidate[],
  requiredFields: (keyof NormalizedCandidate)[]
): ValidationResult => {
  const valid: NormalizedCandidate[] = [];
  const invalid: { candidate: NormalizedCandidate; errors: string[] }[] = [];
  const duplicates: { candidate: NormalizedCandidate; reason: string }[] = [];

  const emailSet = new Set<string>();
  const regIdSet = new Set<string>();

  for (const candidate of candidates) {
    const errors: string[] = [];

    // Zod validation
    const parsed = CandidateSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push(...parsed.error.errors.map(e => e.message));
    }

    // Dynamic required fields validation
    for (const field of requiredFields) {
      const val = candidate[field];
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0)
      ) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (errors.length > 0) {
      invalid.push({ candidate, errors });
      continue;
    }

    // Duplicate detection
    let isDuplicate = false;
    if (candidate.email) {
      if (emailSet.has(candidate.email)) {
        duplicates.push({ candidate, reason: 'Duplicate email' });
        isDuplicate = true;
      } else {
        emailSet.add(candidate.email);
      }
    }

    if (candidate.registrationId && !isDuplicate) {
      if (regIdSet.has(candidate.registrationId)) {
        duplicates.push({ candidate, reason: 'Duplicate registrationId' });
        isDuplicate = true;
      } else {
        regIdSet.add(candidate.registrationId);
      }
    }

    if (!isDuplicate) {
      valid.push(candidate);
    }
  }

  return { valid, invalid, duplicates };
};
