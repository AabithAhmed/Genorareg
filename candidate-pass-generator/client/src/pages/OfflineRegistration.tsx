import { useState, useEffect } from 'react';
import { registerOfflineCandidate, getOfflineRegistrations, getPdfPreviewUrl, sendOfflineEmail } from '../services/api';
import { CheckCircle, Printer, Download, PlusCircle, AlertCircle, Loader2, Sparkles, UserCheck, Mail, Send } from 'lucide-react';

const GENORA_EVENTS = [
  'Paper Presentation',
  'Prompt Paradox',
  'CodeVolt',
  'AiVerse',
  'Reels And Rhythm',
  'Wit and Will',
  'Player Auction',
];

export default function OfflineRegistration() {
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [food, setFood] = useState<'Veg' | 'Non-Veg'>('Veg');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['Paper Presentation']);
  const [customEvent, setCustomEvent] = useState('');
  
  // Desk internal records (saved to backend database, omitted from pass)
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPass, setGeneratedPass] = useState<{
    passId: string;
    gsId: string;
    pdfUrl: string;
    candidate: any;
  } | null>(null);

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');

  const [recentList, setRecentList] = useState<any[]>([]);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const res = await getOfflineRegistrations();
      if (res.success) {
        setRecentList(res.data.reverse());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEvent = (eventName: string) => {
    if (selectedEvents.includes(eventName)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventName));
    } else {
      setSelectedEvents([...selectedEvents, eventName]);
    }
  };

  const handleAddCustomEvent = () => {
    if (customEvent.trim() && !selectedEvents.includes(customEvent.trim())) {
      setSelectedEvents([...selectedEvents, customEvent.trim()]);
      setCustomEvent('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter candidate name.');
      return;
    }
    if (!college.trim()) {
      setError('Please enter college / institution.');
      return;
    }

    setLoading(true);
    setError(null);
    setEmailStatus(null);

    try {
      const res = await registerOfflineCandidate({
        name: name.trim(),
        college: college.trim(),
        food,
        events: selectedEvents,
        email: email.trim(),
        phone: phone.trim(),
        paymentMode,
        paymentRef: paymentRef.trim(),
      });

      if (res.success) {
        setGeneratedPass(res.data);
        setRecipientEmail(email.trim());
        loadRecent();
      } else {
        setError(res.error?.message || 'Failed to generate offline pass.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Error creating registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (passId: string, targetEmail: string) => {
    const toEmail = targetEmail.trim();
    if (!toEmail) {
      setEmailStatus({
        success: false,
        message: 'Please provide candidate email address to send the pass.',
      });
      return;
    }

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await sendOfflineEmail(passId, toEmail);
      if (res.success) {
        setEmailStatus({
          success: true,
          message: `Entry pass PDF successfully sent to ${toEmail}!`,
        });
        loadRecent();
      } else {
        setEmailStatus({
          success: false,
          message: res.error?.message || 'Failed to send pass email.',
        });
      }
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: err.response?.data?.error?.message || err.message || 'Failed to send email.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleResetForNext = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPaymentRef('');
    setGeneratedPass(null);
    setError(null);
    setEmailStatus(null);
    setRecipientEmail('');
  };

  const handlePrint = (passId: string) => {
    const url = getPdfPreviewUrl(passId);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
      win.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-red-950 to-black text-white p-6 rounded-xl shadow-lg border border-red-900/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500/50 rounded-full text-xs font-semibold uppercase tracking-wider text-red-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              Spot Registration Desk
            </div>
            <h1 className="text-2xl font-black tracking-tight">Offline / Spot Candidate Registration</h1>
            <p className="text-gray-300 text-sm mt-1">
              Issue official Genora'26 Entry Passes instantly for walk-in participants using the strict, restricted pass template.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-2 rounded-lg">
            <UserCheck className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium text-gray-200">
              {recentList.length} Registered Today
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-3">New Registration</h2>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Candidate Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Candidate Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  College / Institution <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Government College of Engineering, Tirunelveli"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Dietary Preference <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border cursor-pointer font-medium text-sm transition-all ${
                    food === 'Veg'
                      ? 'bg-green-50 border-green-500 text-green-800 ring-2 ring-green-500/20'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="food"
                      value="Veg"
                      checked={food === 'Veg'}
                      onChange={() => setFood('Veg')}
                      className="hidden"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    Vegetarian (Veg)
                  </label>

                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border cursor-pointer font-medium text-sm transition-all ${
                    food === 'Non-Veg'
                      ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/20'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="food"
                      value="Non-Veg"
                      checked={food === 'Non-Veg'}
                      onChange={() => setFood('Non-Veg')}
                      className="hidden"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Non-Vegetarian (Non-Veg)
                  </label>
                </div>
              </div>
            </div>

            {/* Events Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Registered Events
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {GENORA_EVENTS.map((ev) => {
                  const isSelected = selectedEvents.includes(ev);
                  return (
                    <button
                      type="button"
                      key={ev}
                      onClick={() => handleToggleEvent(ev)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {ev}
                    </button>
                  );
                })}
              </div>

              {/* Custom Event */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add other event..."
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEvent(); } }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomEvent}
                  className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Internal Desk Records (Database Only, Not on Pass) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>Internal Desk Information</span>
                <span className="text-[11px] text-gray-400 font-normal">Strictly excluded from pass</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="candidate@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
                  >
                    <option value="Cash">Cash (Desk)</option>
                    <option value="UPI">UPI (QR Scan)</option>
                    <option value="Free">Complimentary / Host</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Receipt / Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. CASH-101 / Txn ID"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all text-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Official Pass...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Generate Entry Pass
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetForNext}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-all"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Live Generated Pass Preview & Send Mail */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Pass Preview & Actions</h2>
              {generatedPass && (
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 font-mono font-bold text-xs rounded-full border border-yellow-200">
                  {generatedPass.gsId}
                </span>
              )}
            </div>

            {generatedPass ? (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-900 text-sm font-semibold truncate">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">{generatedPass.candidate.name}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex-shrink-0">
                    {generatedPass.gsId}
                  </span>
                </div>

                {/* PDF Viewer */}
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 h-[360px] shadow-inner">
                  <iframe
                    src={getPdfPreviewUrl(generatedPass.passId)}
                    className="w-full h-full border-0"
                    title="Generated Pass PDF"
                  />
                </div>

                {/* Send Mail Action Section */}
                <div className="p-3.5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-red-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-red-600" />
                      Email Pass to Candidate
                    </span>
                    {generatedPass.candidate.emailSent && (
                      <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-semibold">
                        ✓ Sent
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter recipient email..."
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-red-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSendEmail(generatedPass.passId, recipientEmail)}
                      disabled={sendingEmail}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all disabled:opacity-60"
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send Mail
                        </>
                      )}
                    </button>
                  </div>

                  {emailStatus && (
                    <div className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                      emailStatus.success
                        ? 'bg-green-100 border border-green-300 text-green-800'
                        : 'bg-red-100 border border-red-300 text-red-800'
                    }`}>
                      {emailStatus.success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      )}
                      <span>{emailStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Print & Download Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(generatedPass.passId)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-xs shadow transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Print Pass
                  </button>

                  <a
                    href={getPdfPreviewUrl(generatedPass.passId)}
                    download={`${generatedPass.gsId}.pdf`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>

                <button
                  onClick={handleResetForNext}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register Next Candidate
                </button>
              </div>
            ) : (
              <div className="h-[460px] flex flex-col items-center justify-center text-center p-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Sparkles className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="font-semibold text-gray-600 text-sm">No Pass Generated Yet</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                  Fill in the registration form on the left and click "Generate Entry Pass" to view the live pass and email it directly to the candidate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Offline Registrations Table */}
      {recentList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-base">Recent Spot Registrations ({recentList.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[11px] border-b">
                <tr>
                  <th className="px-6 py-3">Unique ID</th>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">College</th>
                  <th className="px-6 py-3">Events</th>
                  <th className="px-6 py-3">Diet</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentList.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-amber-600">{r.gsId}</td>
                    <td className="px-6 py-3.5 font-bold text-gray-900">{r.name}</td>
                    <td className="px-6 py-3.5 text-gray-500">{r.email || '—'}</td>
                    <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">{r.college}</td>
                    <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">
                      {Array.isArray(r.events) ? r.events.join(', ') : r.events}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.food === 'Veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.food}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{r.paymentMode || 'Cash'}</td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {r.email && (
                        <button
                          onClick={() => handleSendEmail(r.gsId, r.email)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Send Mail
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(r.gsId)}
                        className="text-gray-700 hover:text-black font-semibold"
                      >
                        Print
                      </button>
                      <a
                        href={getPdfPreviewUrl(r.gsId)}
                        download={`${r.gsId}.pdf`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

