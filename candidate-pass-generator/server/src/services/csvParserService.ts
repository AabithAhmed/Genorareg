import fs from 'fs';
import { parse } from 'csv-parse';
import { AppError } from '../utils/errors';

export const parseCSV = (filePath: string): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new AppError('CSV file not found', 'FILE_NOT_FOUND', 404));
    }

    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true, // Handle UTF-8 BOM
        })
      )
      .on('data', (data) => {
        results.push(data);
      })
      .on('error', (err) => {
        reject(new AppError('Failed to parse CSV file: ' + err.message, 'CSV_PARSE_ERROR', 400));
      })
      .on('end', () => {
        resolve(results);
      });
  });
};
