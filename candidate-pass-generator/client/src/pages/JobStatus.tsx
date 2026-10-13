import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getJobState, getJobReportUrl, getVerificationCsvUrl, retryFailed } from '../services/api';
import { CheckCircle, AlertCircle, Clock, Download, RefreshCw } from 'lucide-react';

export default function JobStatus() {
  const { id } = useParams();
  const [jobState, setJobState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let interval: any;
    
    const fetchState = async () => {
      try {
        if (!id) return;
        const res = await getJobState(id);
        setJobState(res.data);
        setLoading(false);
        
        if (res.data.status === 'completed' || res.data.status === 'error') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Failed to fetch job state', err);
      }
    };

    fetchState();
    interval = setInterval(fetchState, 1500);

    return () => clearInterval(interval);
  }, [id]);

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    try {
      await retryFailed(id);
      // Let the polling handle the updates
    } catch (err) {
      console.error(err);
      alert('Failed to retry failed candidates.');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading job status...</div>;
  }

  if (!jobState) {
    return <div className="text-center py-10">Job not found.</div>;
  }

  const { total, successful, failed, pending, status, currentCandidate } = jobState;
  const progress = total > 0 ? Math.round(((successful + failed) / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            Job Status 
            {status === 'running' && <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Running</span>}
            {status === 'completed' && <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>}
            {status === 'idle' && <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Idle</span>}
          </h3>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${status === 'completed' && failed === 0 ? 'bg-green-500' : 'bg-blue-600'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {status === 'running' && (
              <p className="mt-2 text-sm text-gray-500 truncate">
                Current: {currentCandidate || '...'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6 flex flex-col items-center">
                <span className="text-sm font-medium text-gray-500 truncate">Total</span>
                <span className="mt-1 text-3xl font-semibold text-gray-900">{total}</span>
              </div>
            </div>
            <div className="bg-green-50 overflow-hidden shadow rounded-lg border border-green-100">
              <div className="px-4 py-5 sm:p-6 flex flex-col items-center">
                <span className="text-sm font-medium text-green-700 truncate flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" /> Successful
                </span>
                <span className="mt-1 text-3xl font-semibold text-green-900">{successful}</span>
              </div>
            </div>
            <div className="bg-red-50 overflow-hidden shadow rounded-lg border border-red-100">
              <div className="px-4 py-5 sm:p-6 flex flex-col items-center">
                <span className="text-sm font-medium text-red-700 truncate flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> Failed
                </span>
                <span className="mt-1 text-3xl font-semibold text-red-900">{failed}</span>
              </div>
            </div>
            <div className="bg-yellow-50 overflow-hidden shadow rounded-lg border border-yellow-100">
              <div className="px-4 py-5 sm:p-6 flex flex-col items-center">
                <span className="text-sm font-medium text-yellow-700 truncate flex items-center">
                  <Clock className="w-4 h-4 mr-1" /> Pending
                </span>
                <span className="mt-1 text-3xl font-semibold text-yellow-900">{pending}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
            {status === 'completed' && failed > 0 && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry Failed'}
              </button>
            )}
            {(status === 'completed' || status === 'completed_with_errors' || status === 'error') && (
              <>
                <a
                  href={getVerificationCsvUrl(id!)}
                  download
                  className="inline-flex items-center px-4 py-2 border border-green-600 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Verification CSV (GS-IDs)
                </a>
                <a
                  href={getJobReportUrl(id!)}
                  download
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Full Report
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      
      {failed > 0 && (
        <div className="mt-8 bg-white shadow sm:rounded-lg overflow-hidden">
           <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Failed Deliveries</h3>
           </div>
           <ul className="divide-y divide-gray-200">
             {jobState.results.filter((r:any) => r.status === 'failed').map((r:any, idx:number) => (
               <li key={idx} className="px-4 py-4">
                 <div className="flex items-center gap-3">
                   <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold font-mono">{r.uniqueId || '—'}</span>
                   <div className="text-sm font-medium text-gray-900">{r.candidateName}</div>
                 </div>
                 <div className="text-xs text-gray-500 mt-0.5">{r.recipient}</div>
                 <div className="text-sm text-red-600 mt-1">{r.error}</div>
               </li>
             ))}
           </ul>
        </div>
      )}
    </div>
  );
}
