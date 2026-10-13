# Candidate Pass Generator

A complete, production-quality local web application to automatically parse registrations, generate personalized PDF event passes, and securely email them to each candidate.

## 1. Requirements
- Node.js (v18 or higher)
- NPM

## 2. Installation
1. Clone this repository or navigate to the directory:
   \`\`\`bash
   cd candidate-pass-generator
   \`\`\`
2. Install all dependencies for the server, client, and root:
   \`\`\`bash
   npm run install:all
   \`\`\`
   *(Alternatively, run \`npm install\` in root, server, and client folders manually.)*

## 3. Environment Setup
1. Copy the example environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
2. Open \`.env\` and configure your SMTP credentials:
   \`\`\`env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="Event Team <your-email@gmail.com>"
   \`\`\`
   > **Security Note:** Never expose your SMTP credentials to the frontend or commit them to version control. Use app passwords if using Gmail.

## 4. Running the Application
To run both the backend and frontend simultaneously, run from the root directory:
\`\`\`bash
npm run dev
\`\`\`
The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 5. CSV Format Examples
The system supports flexible CSV parsing with automatic column detection. Example:
\`\`\`csv
Name,Email,College,Events,Food
Aarav Kumar,aarav@example.com,ABC Engineering College,"Reel & Rhythm|Code Clash",Veg
Rahul Kumar,rahul@example.com,XYZ Engineering College,"Code Clash",Non-Veg
\`\`\`
### Supported Automatic Column Detection
The application uses header and data-value analysis to determine columns automatically. It recognizes:
- **Email:** \`Email\`, \`E-mail\`, \`Mail ID\` + values matching email regex.
- **Name:** \`Name\`, \`Full Name\`, \`Candidate Name\`
- **College:** \`College\`, \`Institution\`, \`University\`
- **Events:** \`Event\`, \`Competition\`, \`Rounds\`
- **Food:** \`Food\`, \`Diet\`, \`Meal\` + values like \`Veg\` or \`Non-Veg\`
- **Registration ID:** \`ID\`, \`Registration No\`
- **Phone:** \`Phone\`, \`Mobile\` + phone regex matching.

## 6. How the Pass Generation Works
1. **Upload & Parse:** Uploaded CSV is parsed, supporting BOM, quotes, and empty rows.
2. **Analysis:** The system calculates a confidence score for each column.
3. **Normalization:** The accepted mappings normalize the data (e.g., casing, splitting arrays, whitespace stripping).
4. **Validation:** Zod validates the required fields (Name, Email) and duplicate rules.
5. **Pass Generation:** Puppeteer turns an elegant HTML/CSS template into a PDF for each valid candidate, injecting a dynamically generated offline QR code with the unique \`passId\`.

## 7. How Email Sending Works
1. When confirmed, passes are generated and added to an email queue.
2. The queue controls concurrency (default 3) to prevent overwhelming SMTP servers.
3. NodeMailer dispatches each PDF exactly to its mapped candidate email.
4. Failed attempts are retried using exponential backoff (up to 3 times).
5. A live progress bar reports success/failure tracking in real-time.

## 8. Troubleshooting
- **PDFs look strange or text is unreadable:** Ensure an internet connection if loading Google Fonts (Inter is used in the template).
- **Email fails to send:** Double-check your \`.env\` SMTP settings. If using Gmail, you MUST generate an App Password instead of using your primary password.
- **Port in use:** Change the \`PORT\` in \`.env\` and \`client/src/services/api.ts\` if 5000 is occupied.

## 9. Security Considerations
- **Local Application Only:** This tool is designed to run locally on your machine.
- **Data Protection:** Temp files and reports are stored locally in the \`storage/\` directory and not exposed publicly.
- **File Validation:** The system only accepts \`.csv\` uploads and validates size using Multer.
- **Safe Injection:** Puppeteer renders HTML with safe parameter insertions directly via server-side generation, limiting XSS risk since it's locally contained.
