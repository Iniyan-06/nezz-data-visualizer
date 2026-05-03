/**
 * Represents the structured analysis returned from Ollama.
 */
export interface Anomaly {
  row: number;
  value: any;
  reason: string;
}

export interface ModelMetadata {
  latencyMs: number;
  tokens: number;
  tokensPerSec: number;
  cost: string;
}

export interface OllamaAnalysis {
  trend: string;
  anomalies: Anomaly[];
  recommendation: string;
  confidence: string;
  chartType: 'line' | 'scatter' | 'bar';
  reasoning: string;
  metadata?: ModelMetadata;
}

/**
 * Calls the local Ollama instance to analyze CSV data using XML-tagged prompts.
 * Includes retry logic and validation layer.
 * 
 * @param csvString - The raw CSV data to analyze.
 * @returns A validated OllamaAnalysis object.
 */
export async function analyzeWithOllama(csvString: string): Promise<OllamaAnalysis> {
  const MODEL = "qwen3:0.6b";
  const URL = "http://localhost:11434/api/generate";
  const MAX_ATTEMPTS = 2;

  const prompt = `Act as a Data Analyst. Analyze CSV input. Return ONLY XML tags:
<trend>One sentence trend</trend>
<anomalies>[{"row": index, "value": "val", "reason": "why"}]</anomalies>
<recommendation>Two sentence advice</recommendation>
<confidence>Score 0-100</confidence>
<chartType>line or scatter or bar</chartType>
<reasoning>Explain selection: Time column -> line; Two numeric columns -> scatter; Categories -> bar</reasoning>

Examples:
In: date,val\n1,10\n2,100\n3,12
Out:
<trend>The data shows a massive spike at index 2 followed by a return to baseline.</trend>
<anomalies>[{"row": 2, "value": 100, "reason": "Significant outlier"}]</anomalies>
<recommendation>Investigate the cause of the spike on date 2. Verify data integrity before proceeding.</recommendation>
<confidence>95</confidence>
<chartType>line</chartType>
<reasoning>A line chart was chosen because the data is time-indexed, allowing for trend visualization over time.</reasoning>

In: x,y\n1,2\n2,4\n3,6
Out:
<trend>The data exhibits a consistent linear growth over time.</trend>
<anomalies>[]</anomalies>
<recommendation>Maintain current operations as growth is steady. Monitor for future saturation.</recommendation>
<confidence>100</confidence>
<chartType>scatter</chartType>
<reasoning>A scatter chart is ideal for visualizing the relationship between two numeric variables like x and y.</reasoning>

CSV Data:
${csvString}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText} (Status: ${response.status})`);
      }

      const result = await response.json();
      const text = result.response as string;

      // Extract metadata
      const latencyMs = result.total_duration / 1e6;
      const tokens = (result.prompt_eval_count || 0) + (result.eval_count || 0);
      const tokensPerSec = result.eval_count / (result.eval_duration / 1e9);

      const metadata: ModelMetadata = {
        latencyMs,
        tokens,
        tokensPerSec: isFinite(tokensPerSec) ? tokensPerSec : 0,
        cost: "$0.00"
      };

      // Validation Layer: Extract tags and check for presence
      const analysis = parseAndValidateXML(text);
      
      if (analysis) {
        return { ...analysis, metadata };
      } else {
        throw new Error("Missing required XML tags in Ollama response.");
      }

    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      lastError = error;
      
      // If it's the last attempt, don't wait
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simple 1s delay between retries
      }
    }
  }

  throw new Error(`Failed to get a valid analysis after ${MAX_ATTEMPTS} attempts. Last error: ${lastError?.message}`);
}

/**
 * Helper to extract content from XML tags and validate presence of all 4 required tags.
 */
function parseAndValidateXML(text: string): OllamaAnalysis | null {
  const extract = (tag: string) => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const trend = extract('trend');
  const anomalies = extract('anomalies');
  const recommendation = extract('recommendation');
  const confidence = extract('confidence');
  const chartType = (extract('chartType') || 'bar') as any;
  const reasoning = extract('reasoning') || 'No reasoning provided.';

  if (trend && anomalies && recommendation && confidence) {
    try {
      // Clean up anomalies string in case model added extra text
      const cleanAnomalies = anomalies.replace(/^[^{[]+/, '').replace(/[^}\]]+$/, '');
      const parsedAnomalies = JSON.parse(cleanAnomalies);
      
      return { 
        trend, 
        anomalies: Array.isArray(parsedAnomalies) ? parsedAnomalies : [], 
        recommendation, 
        confidence,
        chartType: ['line', 'scatter', 'bar'].includes(chartType) ? chartType : 'bar',
        reasoning
      };
    } catch (e) {
      console.warn("Failed to parse anomalies JSON:", anomalies);
      return null;
    }
  }

  return null;
}
