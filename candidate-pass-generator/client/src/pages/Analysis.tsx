import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCsvAnalysis, previewPasses } from '../services/api';
import { AlertTriangle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function Analysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const possibleFields = ['name', 'email', 'college', 'events', 'food', 'registrationId', 'phone', 'ignore'];

  useEffect(() => {
    if (id) {
      getCsvAnalysis(id).then(res => {
        const data = res.data.analysis.map((col: any) => ({
          ...col,
          selectedField: col.inferredField || 'ignore'
        }));
        setAnalysis(data);
        setRowCount(res.data.rowCount);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [id]);

  const handleFieldChange = (index: number, value: string) => {
    const newAnalysis = [...analysis];
    newAnalysis[index].selectedField = value;
    setAnalysis(newAnalysis);
  };

  const handleContinue = async () => {
    try {
      setIsGenerating(true);
      const mappings = analysis.map(a => ({
        originalHeader: a.originalHeader,
        mappedField: a.selectedField === 'ignore' ? null : a.selectedField
      }));
      
      const res = await previewPasses(id!, mappings);
      navigate(`/preview/${id}`, { state: { data: res.data } });
    } catch (err) {
      console.error(err);
      alert('Failed to generate preview. Check console for details.');
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="text-center py-10">Analyzing CSV Structure...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">CSV Structure Analysis</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Found {rowCount} candidates. Please confirm the column mappings below.
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={isGenerating}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isGenerating && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating Preview...' : 'Confirm & Preview'}
          </button>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSV Header</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Values</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Map To Field</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.map((col, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {col.originalHeader}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {col.sampleValues.slice(0,3).join(', ')}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              {col.confidence >= 85 ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : col.confidence >= 60 ? (
                                <HelpCircle className="h-5 w-5 text-yellow-500 mr-2" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                              )}
                              <span className={
                                col.confidence >= 85 ? 'text-green-700' :
                                col.confidence >= 60 ? 'text-yellow-700' : 'text-red-700'
                              }>{col.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={col.selectedField}
                              onChange={(e) => handleFieldChange(idx, e.target.value)}
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                            >
                              {possibleFields.map(f => (
                                <option key={f} value={f}>{f === 'ignore' ? '-- Ignore Column --' : f.toUpperCase()}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
