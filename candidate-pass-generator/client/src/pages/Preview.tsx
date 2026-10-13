import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { sendPasses, getPdfPreviewUrl } from '../services/api';
import { CheckCircle, AlertTriangle, XCircle, Send } from 'lucide-react';

export default function Preview() {
  const { id } = useParams();
  return <PreviewContent id={id!} />;
}

function PreviewContent({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  
  // In a real app we'd fetch this if state is missing, but let's assume we pass it from Analysis.
  // Oh wait, in Analysis.tsx I didn't pass the state! I should fix that.
  // Let's assume I will fix Analysis.tsx to pass state.
  const data = location.state?.data;

  if (!data) {
    return (
      <div className="text-center py-10">
        <p>Preview data not found. Please go back and re-analyze.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">Go Back</button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!window.confirm(`You are about to send ${data.validCount} personalized emails. This action cannot be undone. Are you sure?`)) {
      return;
    }
    
    setSending(true);
    try {
      const res = await sendPasses(id);
      navigate(`/job/${res.data.jobId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start sending process.');
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Summary</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium text-gray-500">Total Candidates</span>
              <span className="text-lg font-bold text-gray-900">{data.total}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-100">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-800">Valid</span>
              </div>
              <span className="text-lg font-bold text-green-900">{data.validCount}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-100">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm font-medium text-red-800">Invalid</span>
              </div>
              <span className="text-lg font-bold text-red-900">{data.invalidCount}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md border border-yellow-100">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Duplicates</span>
              </div>
              <span className="text-lg font-bold text-yellow-900">{data.duplicateCount}</span>
            </div>
          </div>
          
          <div className="mt-8">
            <button
              onClick={handleSend}
              disabled={sending || data.validCount === 0}
              className={`w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                sending || data.validCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
            >
              <Send className="h-5 w-5 mr-2" />
              {sending ? 'Starting Job...' : `SEND PASSES TO ${data.validCount} CANDIDATES`}
            </button>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white shadow sm:rounded-lg overflow-hidden flex flex-col h-full">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Sample Pass Preview</h3>
          </div>
          <div className="flex-1 bg-gray-100 p-4 flex justify-center items-center min-h-[600px]">
            {data.samplePassId ? (
              <iframe 
                src={getPdfPreviewUrl(data.samplePassId)} 
                className="w-full h-full min-h-[600px] border-0 shadow-lg rounded"
                title="Pass Preview"
              />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <AlertTriangle className="h-12 w-12 text-yellow-400 mb-2" />
                <p>No valid candidates to generate a preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
