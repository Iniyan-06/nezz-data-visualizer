import { CleanedData, detectRecommendedChart } from './dataCleaner';
import { OllamaAnalysis, Anomaly } from './ollamaAnalyzer';

/**
 * Fallback: Rule-based analysis using basic statistics.
 */
export function runHeuristicAnalysis(data: CleanedData): OllamaAnalysis {
  const chartRec = detectRecommendedChart(data);
  // Find the most likely "value" column (first numeric column that isn't an 'id' or 'index')
  const numCol = data.headers.find(h => 
    data.types[h] === 'number' && !h.toLowerCase().includes('id') && !h.toLowerCase().includes('index')
  ) || data.headers.find(h => data.types[h] === 'number');
  
  if (!numCol) {
    return {
      trend: "No numeric data found for statistical trend analysis.",
      anomalies: [],
      recommendation: "Please provide numeric datasets to enable trend detection and outlier analysis.",
      confidence: "100",
      chartType: 'bar',
      reasoning: "Defaulting to bar chart as no numeric patterns were identified."
    };
  }

  const values = data.raw.map(r => r[numCol] as number);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const diffs = values.map(v => Math.pow(v - mean, 2));
  const stdDev = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / values.length);

  // 1. Trend detection: compare first and second half
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstMean = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondMean = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  
  const percentChange = firstMean !== 0 ? ((secondMean - firstMean) / Math.abs(firstMean)) * 100 : 0;
  const trendDir = secondMean > firstMean ? "increasing" : "decreasing";
  
  const trend = `The statistical analysis of '${numCol}' reveals an overall ${trendDir} trend (${percentChange.toFixed(1)}% change) with a mean value of ${mean.toFixed(2)}.`;

  // 2. Anomalies: 3-sigma rule (standard outliers)
  const anomalies: Anomaly[] = [];
  values.forEach((v, i) => {
    const sigmaDist = Math.abs(v - mean) / (stdDev || 1);
    if (sigmaDist > 3) {
      anomalies.push({
        row: i + 1,
        value: v,
        reason: `Statistical outlier: ${sigmaDist.toFixed(1)} standard deviations from mean.`
      });
    }
  });

  // 3. Recommendation
  const recommendation = anomalies.length > 0 
    ? `Action required: Audit the ${anomalies.length} extreme outliers found in the dataset. Statistical growth is currently ${trendDir}.`
    : `Data is stable. Continue monitoring '${numCol}' for any sudden shifts away from the current ${mean.toFixed(2)} average.`;

  return {
    trend,
    anomalies,
    recommendation,
    confidence: "100",
    chartType: chartRec.type,
    reasoning: chartRec.reasoning
  };
}
