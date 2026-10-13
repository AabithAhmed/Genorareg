import React, { useState, useEffect } from 'react';
import { getEventConfig, updateEventConfig } from '../services/api';

export default function EventConfig() {
  const [config, setConfig] = useState({
    eventName: '',
    department: '',
    organization: '',
    date: '',
    venue: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getEventConfig().then(res => {
      setConfig(res.data);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateEventConfig(config);
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Event Configuration</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>This information will be displayed on the generated passes.</p>
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">
                Event Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="eventName"
                  id="eventName"
                  value={config.eventName}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="department"
                  id="department"
                  value={config.department}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Organization / College
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="organization"
                  id="organization"
                  value={config.organization}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Event Date
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="date"
                  id="date"
                  value={config.date}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                Venue
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="venue"
                  id="venue"
                  value={config.venue}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            {saved && <span className="text-green-600 mr-4 self-center font-medium">Saved successfully!</span>}
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
