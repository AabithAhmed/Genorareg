import { EmailJob, EventConfig, NormalizedCandidate, DeliveryResult } from '../types';
import { generatePass } from './passGeneratorService';
import { sendEmail } from './emailService';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface JobState {
  jobId: string;
  total: number;
  successful: number;
  failed: number;
  pending: number;
  results: DeliveryResult[];
  status: 'idle' | 'running' | 'completed' | 'error';
  currentCandidate?: string;
  eventConfig: EventConfig;
  candidates: NormalizedCandidate[];
}

const jobs = new Map<string, JobState>();

export const createJob = (candidates: NormalizedCandidate[], eventConfig: EventConfig): string => {
  const jobId = uuidv4();
  
  const results: DeliveryResult[] = candidates.map(c => ({
    candidateId: c.candidateId,
    passId: '', // Will be filled during generation
    recipient: c.email,
    status: 'pending',
    attempts: 0
  }));

  jobs.set(jobId, {
    jobId,
    total: candidates.length,
    successful: 0,
    failed: 0,
    pending: candidates.length,
    results,
    status: 'idle',
    eventConfig,
    candidates
  });

  return jobId;
};

export const getJobState = (jobId: string): JobState | undefined => {
  return jobs.get(jobId);
};

export const startJob = async (jobId: string, candidates: NormalizedCandidate[]): Promise<void> => {
  const state = jobs.get(jobId);
  if (!state) throw new Error('Job not found');
  if (state.status === 'running') throw new Error('Job is already running');

  state.status = 'running';
  const concurrency = parseInt(process.env.EMAIL_CONCURRENCY || '3');
  const maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES || '3');

  const pendingCandidates = candidates.filter(c => {
    const r = state.results.find(res => res.candidateId === c.candidateId);
    return r && (r.status === 'pending' || r.status === 'failed');
  });
  
  state.pending = pendingCandidates.length;

  const queue = [...pendingCandidates];
  let running = 0;

  const processNext = async () => {
    if (queue.length === 0 && running === 0) {
      state.status = 'completed';
      saveReport(state);
      return;
    }

    while (queue.length > 0 && running < concurrency) {
      const candidate = queue.shift()!;
      running++;
      
      const result = state.results.find(r => r.candidateId === candidate.candidateId)!;
      result.status = 'sending';
      state.currentCandidate = candidate.email;

      (async () => {
        try {
          console.log(`[PASS] candidate=${candidate.candidateId}`);
          
          // 1. Generate Pass
          const { passId, pdfPath } = await generatePass(candidate, state.eventConfig);
          result.passId = passId;

          // 2. Send Email
          const emailJob: EmailJob = {
            candidateId: candidate.candidateId,
            passId,
            recipient: candidate.email,
            pdfPath
          };

          let success = false;
          while (!success && result.attempts < maxRetries) {
            result.attempts++;
            try {
              console.log(`[EMAIL] Attempt ${result.attempts} for candidate=${candidate.candidateId} recipient=${candidate.email}`);
              await sendEmail(emailJob);
              success = true;
            } catch (err: any) {
              result.error = err.message;
              if (result.attempts >= maxRetries) {
                throw err; // Give up
              }
              // Wait before retry (exponential backoff)
              await new Promise(res => setTimeout(res, 1000 * Math.pow(2, result.attempts)));
            }
          }

          result.status = 'sent';
          result.sentAt = new Date().toISOString();
          state.successful++;
          state.pending--;
          console.log(`[EMAIL] candidate=${candidate.candidateId} recipient=${candidate.email} status=sent`);

        } catch (err: any) {
          result.status = 'failed';
          result.error = err.message;
          state.failed++;
          state.pending--;
          console.error(`[EMAIL] candidate=${candidate.candidateId} recipient=${candidate.email} status=failed err=${err.message}`);
        } finally {
          running--;
          processNext();
        }
      })();
    }
  };

  processNext();
};

const saveReport = (state: JobState) => {
  try {
    const storageDir = process.env.STORAGE_DIR || './storage';
    const reportsDir = path.join(storageDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const header = ['candidateId', 'passId', 'email', 'status', 'attempts', 'error', 'sentAt'];
    const csvContent = [
      header.join(','),
      ...state.results.map(r => [
        r.candidateId,
        r.passId,
        r.recipient,
        r.status,
        r.attempts,
        `"${(r.error || '').replace(/"/g, '""')}"`,
        r.sentAt || ''
      ].join(','))
    ].join('\n');

    fs.writeFileSync(path.join(reportsDir, `pass-delivery-report-${state.jobId}.csv`), csvContent);
  } catch (err) {
    console.error('Failed to save delivery report', err);
  }
};
