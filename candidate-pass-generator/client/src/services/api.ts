import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const uploadCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/uploads/csv', formData);
  return response.data;
};

export const getCsvAnalysis = async (uploadId: string) => {
  const response = await api.get(`/uploads/${uploadId}/analysis`);
  return response.data;
};

export const getEventConfig = async () => {
  const response = await api.get('/events/config');
  return response.data;
};

export const updateEventConfig = async (config: any) => {
  const response = await api.post('/events/config', config);
  return response.data;
};

export const previewPasses = async (uploadId: string, mappings: any[]) => {
  const response = await api.post('/passes/preview', { uploadId, mappings });
  return response.data;
};

export const sendPasses = async (uploadId: string) => {
  const response = await api.post('/passes/send', { uploadId });
  return response.data;
};

export const getJobState = async (jobId: string) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

export const retryFailed = async (jobId: string) => {
  const response = await api.post(`/jobs/${jobId}/retry-failed`);
  return response.data;
};

export const getPdfPreviewUrl = (passId: string) => {
  return `http://localhost:5000/api/passes/preview-pdf/${passId}`;
};

export const getJobReportUrl = (jobId: string) => {
  return `http://localhost:5000/api/jobs/${jobId}/report`;
};

export const getVerificationCsvUrl = (jobId: string) => {
  return `http://localhost:5000/api/jobs/${jobId}/verification-csv`;
};

export const registerOfflineCandidate = async (candidateData: any) => {
  const response = await api.post('/passes/offline-register', candidateData);
  return response.data;
};

export const getOfflineRegistrations = async () => {
  const response = await api.get('/passes/offline-registrations');
  return response.data;
};

export const sendOfflineEmail = async (passId: string, email?: string) => {
  const response = await api.post('/passes/offline-send-email', { passId, email });
  return response.data;
};


