const MODEL = 'qwen3:0.6b';
const OLLAMA_URL = 'http://localhost:11434/api/generate';

const SYSTEM_PROMPT = `You are a data visualization expert. Analyze the provided data (CSV or JSON) and return a JSON object that follows the Chart.js configuration structure.

Your response MUST be a valid JSON object with the following keys:
1. "chartConfig": An object containing "type", "data", and "options" as expected by Chart.js.
2. "analysis": A brief textual summary of what the chart shows.

Chart.js specific instructions:
- Use vibrant colors for datasets (e.g., #f97316, #3b82f6, #22c55e).
- Ensure labels and datasets match.
- Return ONLY the JSON object, no other text.`;

export async function callOllama(data: string, userPrompt: string) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: `System: ${SYSTEM_PROMPT}\n\nData:\n${data}\n\nUser Instructions: ${userPrompt}`,
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const result = await response.json();
  const parsedResponse = JSON.parse(result.response);
  return parsedResponse;
}

/**
 * Builds a Chart.js config directly from raw row data, used as a
 * fallback when the Ollama chart-config call fails or times out.
 */
export function buildFallbackChartConfig(
  rows: Record<string, any>[],
  chartType: 'bar' | 'line' | 'scatter' = 'bar'
): { chartConfig: any; analysis: string } {
  if (!rows || rows.length === 0) {
    return {
      chartConfig: { type: 'bar', data: { labels: [], datasets: [] } },
      analysis: 'No data available.',
    };
  }

  const headers = Object.keys(rows[0]);
  // Use the first column as labels, the rest as numeric datasets
  const labelKey = headers[0];
  const numericKeys = headers.slice(1).filter((k) =>
    rows.some((r) => !isNaN(parseFloat(r[k])))
  );

  const labels = rows.map((r) => String(r[labelKey] ?? ''));

  const PALETTE = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];

  const datasets = numericKeys.map((key, i) => ({
    label: key,
    data: rows.map((r) => parseFloat(r[key]) || 0),
    backgroundColor: PALETTE[i % PALETTE.length] + (chartType === 'bar' ? 'cc' : '33'),
    borderColor: PALETTE[i % PALETTE.length],
    borderWidth: 2,
    tension: 0.4,
  }));

  return {
    chartConfig: {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    },
    analysis: `Displaying ${numericKeys.join(', ')} across ${labels.length} data points. Generated via heuristic fallback.`,
  };
}
