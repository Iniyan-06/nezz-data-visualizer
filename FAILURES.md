# Known Failures & Limitations

While the Nezz Data Visualizer is highly efficient for local analysis, the use of a 0.6B parameter model (Qwen 3) introduces specific edge-case failures.

## 1. Row Count Limits
- **Failure**: The model fails to process datasets exceeding **500 rows** in a single pass.
- **Reason**: Token context window limits and attention degradation in tiny models.
- **Mitigation**: Current implementation slices data to 50 rows for chart generation. Future versions will require semantic chunking.

## 2. Column Hallucinations
- **Failure**: The model occasionally references columns that do not exist or misnames existing ones.
- **Mitigation**: A robust **XML Validation Layer** and regex-based parsing ensure that nonsensical responses are rejected and retried.

## 3. Statistical Calibration
- **Failure**: The `<confidence>` score provided by the model is **not statistically calibrated**.
- **Context**: The model provides an "intuitive" confidence rating based on pattern recognition rather than formal probability distributions.
- **Note**: Use the **Heuristic Mode** for formal statistical outlier detection (3-Sigma).

## 4. Linguistic Sensitivity
- **Failure**: Non-English column headers (e.g., Cyrillic, Kanji, or accented Latin) significantly degrade analysis quality.
- **Mitigation**: Ensure headers are normalized to English for best results with the current 0.6B weights.
