import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Ticket, Upload, Settings, UserPlus } from 'lucide-react';
import UploadCsv from './pages/UploadCsv';
import EventConfig from './pages/EventConfig';
import Analysis from './pages/Analysis';
import Preview from './pages/Preview';
import JobStatus from './pages/JobStatus';
import OfflineRegistration from './pages/OfflineRegistration';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Upload CSV / Excel', icon: Upload },
    { path: '/offline', label: 'Offline Registration', icon: UserPlus },
    { path: '/config', label: 'Event Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Ticket className="h-8 w-8 text-blue-600 mr-2" />
                <span className="font-bold text-xl text-gray-900 tracking-tight">Genora'26 Pass</span>
              </div>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadCsv />} />
          <Route path="/offline" element={<OfflineRegistration />} />
          <Route path="/config" element={<EventConfig />} />
          <Route path="/analysis/:id" element={<Analysis />} />
          <Route path="/preview/:id" element={<Preview />} />
          <Route path="/job/:id" element={<JobStatus />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
