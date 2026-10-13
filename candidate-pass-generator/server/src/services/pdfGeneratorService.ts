import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { PassData } from '../types';

export const generatePdf = async (htmlContent: string, passId: string): Promise<string> => {
  const storageDir = process.env.STORAGE_DIR || './storage';
  const generatedDir = path.join(storageDir, 'generated');
  
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const pdfPath = path.join(generatedDir, `${passId}.pdf`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'load' });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px'
    }
  });

  await browser.close();

  return pdfPath;
};
