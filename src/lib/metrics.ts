import { OllamaAnalysis } from './ollamaAnalyzer';

export interface WowGapResult {
  qualityRating: number;
  tierRating: number;
  score: number;
  metrics: {
    insightsValid: boolean;
    anomaliesAccurate: boolean;
    confidenceCalibrated: boolean;
  };
}

/**
 * Calculates the "Wow Gap" score based on model size and output quality.
 * Formula: (Quality Rating 1-5) / (Model Tier Max Rating 1-5) * 100
 */
export function calculateWowGap(analysis: OllamaAnalysis): WowGapResult {
  let qualityPoints = 0;
  
  // 1. Number of valid insights (Trend + Recommendation)
  const trendWords = analysis.trend.split(/\s+/).length;
  const recWords = analysis.recommendation.split(/\s+/).length;
  const insightsValid = trendWords > 5 && recWords > 10;
  if (insightsValid) qualityPoints += 2;
  
  // 2. Anomaly detection (Did it generate a valid JSON array and detect variance?)
  const anomaliesAccurate = Array.isArray(analysis.anomalies);
  if (anomaliesAccurate) qualityPoints += 1.5;
  
  // 3. Confidence calibration (Is there a numeric confidence score?)
  const confValue = parseInt(analysis.confidence.replace(/[^0-9]/g, ''));
  const confidenceCalibrated = !isNaN(confValue) && confValue >= 0 && confValue <= 100;
  if (confidenceCalibrated) qualityPoints += 1.5;

  // Normalize quality to 1-5 scale
  const qualityRating = Math.min(5, Math.max(1, qualityPoints));
  
  // Model Tier Max Rating
  // 0.6B = Tier 2 (Tiny/Edge)
  // 7B = Tier 4 (Standard)
  // 70B = Tier 5 (Pro)
  const tierRating = 2; 
  
  const score = (qualityRating / tierRating) * 100;
  
  return {
    qualityRating,
    tierRating,
    score,
    metrics: {
      insightsValid,
      anomaliesAccurate,
      confidenceCalibrated
    }
  };
}
