import { cleanCSV, jsonToCSV, CleanedData } from './dataCleaner';
import { analyzeWithOllama, OllamaAnalysis } from './ollamaAnalyzer';
import { runHeuristicAnalysis } from './heuristic';

export type PipelineStep = 'idle' | 'cleaning' | 'analyzing' | 'validating' | 'done' | 'error';

export interface PipelineResult {
  data: CleanedData;
  analysis: OllamaAnalysis;
  isHeuristic: boolean;
  error?: string;
}

/**
 * Step 4: Multi-step pipeline implementation.
 * Orchestrates cleaning, AI analysis, and heuristic fallback.
 */
export async function runDataPipeline(
  csvString: string, 
  onStep: (step: PipelineStep) => void
): Promise<PipelineResult> {
  try {
    // Step 1: Parse and Clean
    onStep('cleaning');
    const cleanedData = cleanCSV(csvString);
    
    // Convert back to CSV string for the Ollama prompt
    const cleanedCsv = jsonToCSV(cleanedData.raw, cleanedData.headers);

    // Step 2: AI Analysis (Step 3 in the prompt's numbering: Analyze + Validate)
    onStep('analyzing');
    
    try {
      // analyzeWithOllama handles its own retries (now set to 2)
      const analysis = await analyzeWithOllama(cleanedCsv);
      
      onStep('done');
      return {
        data: cleanedData,
        analysis: analysis,
        isHeuristic: false
      };
    } catch (aiError) {
      console.warn("AI Pipeline failed twice. Falling back to heuristic mode.", aiError);
      
      // Step 3: Heuristic Fallback
      onStep('validating'); // Labeling the fallback/validation phase
      const heuristicAnalysis = runHeuristicAnalysis(cleanedData);
      
      onStep('done');
      return {
        data: cleanedData,
        analysis: heuristicAnalysis,
        isHeuristic: true
      };
    }
  } catch (globalError: any) {
    onStep('error');
    throw globalError;
  }
}
