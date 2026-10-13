import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { parseCSV } from '../services/csvParserService';
import { analyzeCSVStructure } from '../services/csvAnalyzerService';
import { normalizeCandidates, FieldMapping } from '../services/normalizationService';
import { validateCandidates } from '../services/validationService';
import { generatePass } from '../services/passGeneratorService';
import { createJob, getJobState, startJob } from '../services/queueService';
import { csvStore, candidateStore, getEventConfig, setEventConfig } from '../store';
import { AppError } from '../utils/errors';
import { NormalizedCandidate } from '../types';

export const uploadCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No CSV file uploaded', 'MISSING_FILE', 400);
    }
    const filePath = req.file.path;
    const rows = await parseCSV(filePath);
    
    if (rows.length === 0) {
      throw new AppError('CSV file is empty', 'EMPTY_CSV', 400);
    }

    const uploadId = uuidv4();
    csvStore.set(uploadId, rows);

    // Auto cleanup after parsing
    try {
      fs.unlinkSync(filePath);
    } catch(err) {}

    res.json({
      success: true,
      data: {
        uploadId,
        rowCount: rows.length,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getCsvAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rows = csvStore.get(id);
    if (!rows) throw new AppError('Upload not found or expired', 'NOT_FOUND', 404);

    const analysis = analyzeCSVStructure(rows);

    res.json({
      success: true,
      data: {
        analysis,
        rowCount: rows.length
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateEventConfig = (req: Request, res: Response) => {
  const config = req.body;
  setEventConfig({ ...getEventConfig(), ...config });
  res.json({ success: true, data: getEventConfig() });
};

export const getEventConfigDetails = (req: Request, res: Response) => {
  res.json({ success: true, data: getEventConfig() });
};

export const previewPasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploadId, mappings } = req.body;
    const rows = csvStore.get(uploadId);
    if (!rows) throw new AppError('Upload not found', 'NOT_FOUND', 404);

    const candidates = normalizeCandidates(rows, mappings as FieldMapping[]);
    const validationResult = validateCandidates(candidates, ['name', 'email']); // Configurable if needed

    candidateStore.set(uploadId, validationResult.valid);

    // Generate a sample pass for the first valid candidate
    let samplePassUrl = null;
    let samplePassId = null;
    if (validationResult.valid.length > 0) {
      const sampleCandidate = validationResult.valid[0];
      const { passId, pdfPath } = await generatePass(sampleCandidate, getEventConfig());
      // We will serve pdfs statically or via a route. For preview, we can send HTML or just PDF URL.
      // Let's send the candidate info and passId
      samplePassId = passId;
    }

    res.json({
      success: true,
      data: {
        total: candidates.length,
        validCount: validationResult.valid.length,
        invalidCount: validationResult.invalid.length,
        duplicateCount: validationResult.duplicates.length,
        errors: validationResult.invalid,
        duplicates: validationResult.duplicates,
        samplePassId,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const sendPasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.body;
    const validCandidates = candidateStore.get(uploadId);
    if (!validCandidates || validCandidates.length === 0) {
      throw new AppError('No valid candidates found for this upload', 'NO_CANDIDATES', 400);
    }

    const jobId = createJob(validCandidates, getEventConfig());
    
    // Start job asynchronously
    startJob(jobId, validCandidates).catch(err => {
      console.error('[CRITICAL] Queue Job failed', err);
    });

    res.json({
      success: true,
      data: { jobId }
    });
  } catch(err) {
    next(err);
  }
};

export const getJobStateRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = getJobState(req.params.id);
    if (!state) throw new AppError('Job not found', 'NOT_FOUND', 404);
    res.json({ success: true, data: state });
  } catch(err) {
    next(err);
  }
};

export const getJobReport = (req: Request, res: Response, next: NextFunction) => {
  try {
    const storageDir = process.env.STORAGE_DIR || './storage';
    const reportPath = path.join(storageDir, 'reports', `pass-delivery-report-${req.params.id}.csv`);
    
    if (fs.existsSync(reportPath)) {
      res.download(reportPath);
    } else {
      throw new AppError('Report not found', 'NOT_FOUND', 404);
    }
  } catch(err) {
    next(err);
  }
};

export const retryFailed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const state = getJobState(id);
    if (!state) throw new AppError('Job not found', 'NOT_FOUND', 404);
    
    if (state.status === 'running') {
      throw new AppError('Job is currently running', 'JOB_RUNNING', 400);
    }

    const failedResults = state.results.filter(r => r.status === 'failed');
    if (failedResults.length === 0) {
      throw new AppError('No failed candidates to retry', 'NO_FAILED', 400);
    }

    // reset attempts for failed ones
    failedResults.forEach(r => {
      r.status = 'pending';
      r.attempts = 0;
    });

    const failedCandidateIds = new Set(failedResults.map(r => r.candidateId));
    const candidatesToRetry = state.candidates.filter(c => failedCandidateIds.has(c.candidateId));
    
    startJob(state.jobId, candidatesToRetry).catch(err => {
      console.error('[CRITICAL] Queue Retry Job failed', err);
    });

    res.json({
      success: true,
      data: { jobId: state.jobId }
    });
  } catch(err) {
    next(err);
  }
};

export const previewSamplePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passId } = req.params;
    const storageDir = process.env.STORAGE_DIR || './storage';
    const pdfPath = path.join(storageDir, 'generated', `${passId}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      res.contentType('application/pdf');
      res.sendFile(path.resolve(pdfPath));
    } else {
      throw new AppError('PDF not found', 'NOT_FOUND', 404);
    }
  } catch(err) {
    next(err);
  }
};
