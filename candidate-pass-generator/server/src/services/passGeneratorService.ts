import { EventConfig, NormalizedCandidate, PassData } from '../types';
import { renderPassHTML } from './templateService';
import { generatePdf } from './pdfGeneratorService';

export const generatePassId = (eventName: string, candidateId: string): string => {
  const shortHash = candidateId.substring(0, 6).toUpperCase();
  const safeEventName = eventName ? eventName.replace(/[^A-Z0-9]/gi, '').toUpperCase() : 'EVENT';
  return `${safeEventName}-${shortHash}`;
};

export const generatePass = async (candidate: NormalizedCandidate, eventConfig: EventConfig): Promise<{ passId: string, pdfPath: string }> => {
  const passId = generatePassId(eventConfig.eventName, candidate.candidateId);
  
  const passData: PassData = {
    event: eventConfig,
    candidate,
    passId
  };

  const html = await renderPassHTML(passData);
  const pdfPath = await generatePdf(html, passId);

  return {
    passId,
    pdfPath
  };
};
