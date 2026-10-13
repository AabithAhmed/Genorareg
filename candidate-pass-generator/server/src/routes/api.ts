import { Router } from 'express';
import { upload } from '../middleware/upload';
import * as apiController from '../controllers/apiController';

const router = Router();

router.post('/uploads/csv', upload.single('file'), apiController.uploadCsv);
router.get('/uploads/:id/analysis', apiController.getCsvAnalysis);

router.post('/events/config', apiController.updateEventConfig);
router.get('/events/config', apiController.getEventConfigDetails);

router.post('/passes/preview', apiController.previewPasses);
router.post('/passes/send', apiController.sendPasses);

router.get('/jobs/:id', apiController.getJobStateRoute);
router.get('/jobs/:id/report', apiController.getJobReport);
router.post('/jobs/:id/retry-failed', apiController.retryFailed);

router.get('/passes/preview-pdf/:passId', apiController.previewSamplePdf);

export default router;
