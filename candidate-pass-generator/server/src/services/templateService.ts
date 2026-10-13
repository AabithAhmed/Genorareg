import QRCode from 'qrcode';
import { PassData } from '../types';

export const generateQRCodeBase64 = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR Code generation failed', err);
    return '';
  }
};

export const renderPassHTML = async (data: PassData): Promise<string> => {
  const { event, candidate, passId } = data;
  
  const qrCodeBase64 = await generateQRCodeBase64(passId);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Pass - ${candidate.name}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      -webkit-print-color-adjust: exact;
    }

    .pass-container {
      width: 800px;
      height: 1131px; /* A4 Ratio */
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 40px;
      text-align: center;
      position: relative;
    }

    .header h1 {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }
    
    .pass-type {
      position: absolute;
      top: 40px;
      right: 40px;
      background: #f59e0b;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .content {
      padding: 50px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .candidate-info {
      margin-bottom: 40px;
    }

    .candidate-name {
      font-size: 2.5rem;
      font-weight: 800;
      color: #111827;
      margin-bottom: 10px;
    }

    .candidate-details {
      font-size: 1.2rem;
      color: #4b5563;
      margin-bottom: 20px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
    }

    .info-item {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }

    .info-label {
      font-size: 0.9rem;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .info-value {
      font-size: 1.2rem;
      color: #111827;
      font-weight: 600;
    }

    .events-list {
      margin-top: 30px;
    }
    
    .events-list h3 {
      font-size: 1.2rem;
      color: #374151;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }

    .events-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .event-tag {
      background: #dbeafe;
      color: #1e40af;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 1rem;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 40px;
      border-top: 2px dashed #e5e7eb;
    }

    .qr-section {
      text-align: center;
    }

    .qr-code {
      width: 180px;
      height: 180px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }

    .pass-id {
      margin-top: 10px;
      font-family: monospace;
      font-size: 1.1rem;
      color: #4b5563;
      font-weight: 600;
    }
    
    .event-details {
      text-align: right;
    }

    .event-details p {
      margin-bottom: 5px;
      color: #4b5563;
      font-size: 1.1rem;
    }
    
    .event-details strong {
      color: #111827;
    }

  </style>
</head>
<body>
  <div class="pass-container">
    <div class="header">
      <h1>${event.eventName || 'EVENT PASS'}</h1>
      <p>${event.department ? event.department + ' | ' : ''}${event.organization || ''}</p>
      <div class="pass-type">ENTRY PASS</div>
    </div>
    
    <div class="content">
      <div class="candidate-info">
        <div class="candidate-name">${candidate.name}</div>
        <div class="candidate-details">
          ${candidate.email} <br />
          ${candidate.college ? candidate.college : ''}
        </div>
      </div>

      <div class="info-grid">
        ${candidate.registrationId ? `
        <div class="info-item">
          <div class="info-label">Registration ID</div>
          <div class="info-value">${candidate.registrationId}</div>
        </div>
        ` : ''}
        
        ${candidate.food ? `
        <div class="info-item">
          <div class="info-label">Dietary Preference</div>
          <div class="info-value">${candidate.food}</div>
        </div>
        ` : ''}
        
        ${candidate.phone ? `
        <div class="info-item">
          <div class="info-label">Contact Number</div>
          <div class="info-value">${candidate.phone}</div>
        </div>
        ` : ''}
      </div>

      ${candidate.events && candidate.events.length > 0 ? `
      <div class="events-list">
        <h3>Registered Events</h3>
        <div class="events-tags">
          ${candidate.events.map(e => `<span class="event-tag">${e}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <div class="qr-section">
          <img src="${qrCodeBase64}" alt="QR Code" class="qr-code" />
          <div class="pass-id">${passId}</div>
        </div>
        
        <div class="event-details">
          <p><strong>Date:</strong> ${event.date || 'TBD'}</p>
          <p><strong>Venue:</strong> ${event.venue || 'TBD'}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
