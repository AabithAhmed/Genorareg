export interface ColumnAnalysis {
  originalHeader: string;
  inferredField: string | null;
  confidence: number;
  sampleValues: string[];
}

const headerPatterns = {
  email: /email|e-mail|mail id/i,
  name: /name|full name|candidate name|participant name/i,
  college: /college|institution|university|organization/i,
  events: /event|competition|round|selected event/i,
  food: /food|diet|meal|veg/i,
  registrationId: /id|registration id|registration no/i,
  phone: /phone|mobile|contact|whatsapp/i,
};

const valuePatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?\d{10,14}$/,
};

const calculateConfidence = (header: string, values: string[]): { field: string | null; confidence: number } => {
  let bestField: string | null = null;
  let maxScore = 0;

  const validValues = values.filter(v => v.trim() !== '');
  if (validValues.length === 0) return { field: null, confidence: 0 };

  const fields = Object.keys(headerPatterns) as (keyof typeof headerPatterns)[];

  for (const field of fields) {
    let score = 0;
    // Header match
    if (headerPatterns[field].test(header)) {
      score += 60;
    }

    // Value match
    let valueMatchCount = 0;
    for (const val of validValues) {
      if (field === 'email' && valuePatterns.email.test(val)) {
        valueMatchCount++;
      } else if (field === 'phone' && valuePatterns.phone.test(val.replace(/\s|-/g, ''))) {
        valueMatchCount++;
      } else if (field === 'college' && (val.toLowerCase().includes('college') || val.toLowerCase().includes('institute') || val.toLowerCase().includes('university'))) {
        valueMatchCount++;
      } else if (field === 'food' && /veg|non-veg|vegan/i.test(val)) {
        valueMatchCount++;
      }
    }
    
    // If it's not email/phone where we have regex, we just give some baseline points if header matched, or if values matched
    const valueMatchRatio = validValues.length > 0 ? valueMatchCount / validValues.length : 0;
    if (valueMatchRatio > 0) {
      score += (valueMatchRatio * 40);
    } else if (field === 'name' && score > 0) {
      // Names are hard to validate by regex, so if header matched, we boost based on word count (usually 1-3 words)
      const nameLikelyCount = validValues.filter(v => v.split(/\s+/).length <= 4).length;
      score += (nameLikelyCount / validValues.length) * 35;
    } else if (field === 'events' && score > 0) {
      score += 35; // If header matches event, give it a high score
    } else if (field === 'registrationId' && score > 0) {
      score += 35;
    }

    if (score > maxScore) {
      maxScore = score;
      bestField = field;
    }
  }

  // Cap confidence at 100
  return { field: bestField, confidence: Math.min(Math.round(maxScore), 100) };
};

export const analyzeCSVStructure = (rows: Record<string, string>[]): ColumnAnalysis[] => {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const analysis: ColumnAnalysis[] = [];

  for (const header of headers) {
    // Take up to 10 sample values for analysis
    const sampleValues = rows.slice(0, 10).map(r => r[header]).filter(v => v !== undefined);
    const { field, confidence } = calculateConfidence(header, sampleValues);

    analysis.push({
      originalHeader: header,
      inferredField: confidence >= 60 ? field : null,
      confidence,
      sampleValues,
    });
  }

  return analysis;
};
