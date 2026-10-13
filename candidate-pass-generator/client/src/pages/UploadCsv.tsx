import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { uploadCsv } from '../services/api';

export default function UploadCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await uploadCsv(file);
      navigate(`/analysis/${res.data.uploadId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Registration Data</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Upload your event registrations CSV or Excel (.xlsx) file. We will automatically analyze the structure and map the columns.</p>
          </div>
          
          <div className="mt-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-12 flex justify-center items-center flex-col cursor-pointer transition-colors ${
                file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
              />
              
              {file ? (
                <>
                  <FileText className="h-12 w-12 text-blue-500 mb-4" />
                  <span className="text-lg font-medium text-gray-900">{file.name}</span>
                  <span className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <span className="text-base font-medium text-gray-900">Click to upload or drag and drop</span>
                  <span className="text-sm text-gray-500 mt-1">CSV or Excel (.xlsx) files (up to 10MB)</span>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                !file || loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {loading ? 'Uploading...' : 'Analyze CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
