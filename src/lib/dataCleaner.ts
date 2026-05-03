import Papa from 'papaparse';

export interface CleanedData {
  raw: any[];
  headers: string[];
  types: Record<string, 'number' | 'string'>;
  stats: {
    missingValuesHandled: number;
    rowCount: number;
  };
}

/**
 * Step 1: Parse and clean CSV data.
 * Handles missing values with mean imputation for numbers and "Unknown" for text.
 */
export function cleanCSV(csvString: string): CleanedData {
  const parsed = Papa.parse(csvString, { 
    header: true, 
    dynamicTyping: true, 
    skipEmptyLines: true 
  });
  
  const data = parsed.data as any[];
  const headers = parsed.meta.fields || [];
  
  let missingValuesHandled = 0;
  const types: Record<string, 'number' | 'string'> = {};

  // 1. Detect column types
  headers.forEach(header => {
    const firstVal = data.find(row => row[header] !== null && row[header] !== undefined)?.[header];
    types[header] = typeof firstVal === 'number' ? 'number' : 'string';
  });

  // 2. Pre-calculate means for imputation
  const columnMeans: Record<string, number> = {};
  headers.forEach(header => {
    if (types[header] === 'number') {
      const values = data.map(r => r[header]).filter(v => typeof v === 'number');
      columnMeans[header] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
  });

  // 3. Clean and impute
  const cleaned = data.map(row => {
    const newRow = { ...row };
    headers.forEach(header => {
      if (newRow[header] === null || newRow[header] === undefined || newRow[header] === '') {
        missingValuesHandled++;
        if (types[header] === 'number') {
          newRow[header] = columnMeans[header];
        } else {
          newRow[header] = 'Unknown';
        }
      }
    });
    return newRow;
  });

  return {
    raw: cleaned,
    headers,
    types,
    stats: {
      missingValuesHandled,
      rowCount: cleaned.length
    }
  };
}

/**
 * Converts JSON array back to CSV string.
 */
export function jsonToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) return "";
  const lines = [headers.join(',')];
  data.forEach(row => {
    lines.push(headers.map(h => {
      const val = row[h];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','));
  });
  return lines.join('\n');
}

/**
 * Heuristic chart type detection.
 */
export function detectRecommendedChart(data: CleanedData): { type: 'line' | 'scatter' | 'bar', reasoning: string } {
  const headers = data.headers;
  const numCols = headers.filter(h => data.types[h] === 'number');
  
  // Check for time column
  const timeCol = headers.find(h => 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('time') || 
    h.toLowerCase().includes('year') || 
    h.toLowerCase().includes('month')
  );

  if (timeCol) {
    return { type: 'line', reasoning: `Detected time-series column '${timeCol}', suggesting a line chart.` };
  }

  if (numCols.length >= 2) {
    return { type: 'scatter', reasoning: `Detected multiple numeric columns (${numCols.slice(0, 2).join(', ')}), suggesting a scatter plot for correlation.` };
  }

  return { type: 'bar', reasoning: 'Detected categorical or simple numeric data, defaulting to a bar chart for comparison.' };
}
