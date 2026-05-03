'use client';

import { useState, useMemo } from 'react';
import Dropzone from '@/components/Dropzone';
import RawPaste from '@/components/RawPaste';
import ChartDisplay from '@/components/ChartDisplay';
import { callOllama, buildFallbackChartConfig } from '@/lib/ollama';
import { OllamaAnalysis } from '@/lib/ollamaAnalyzer';
import { runDataPipeline, PipelineStep, PipelineResult } from '@/lib/pipeline';
import { calculateWowGap, WowGapResult } from '@/lib/metrics';

/* ─── Demo data ───────────────────────────────────────────── */
const DEMO_SUCCESS = `month,revenue,orders,returns
Jan,42000,1200,89
Feb,38500,1050,102
Mar,51200,1480,76
Apr,44800,1290,91
May,67300,1820,64
Jun,71200,1950,58`;

const DEMO_FAILURE = `timestamp,temp_c,humidity,pressure_hpa
08:00,22.1,45,1013
08:15,22.4,46,1012
08:30,99.9,46,1012
08:45,,47,1011
09:00,23.1,220,1010
09:15,23.0,48,999
09:30,22.8,48,`;

/* ─── Component ───────────────────────────────────────────── */
export default function Home() {
  const [data, setData] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [analysisResult, setAnalysisResult] = useState<{
    chartConfig: any;
    analysis: string;
  } | null>(null);
  const [structuredAnalysis, setStructuredAnalysis] =
    useState<OllamaAnalysis | null>(null);
  const [overrideChartType, setOverrideChartType] = useState<
    'line' | 'scatter' | 'bar' | null
  >(null);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null
  );
  const [wowGap, setWowGap] = useState<WowGapResult | null>(null);
  const [showLimitations, setShowLimitations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Derived state ─────────────────────────────────────── */
  const isSuccessDemo = data === DEMO_SUCCESS;
  const isFailureDemo = data === DEMO_FAILURE;

  const successMetrics = useMemo(() => {
    if (!isSuccessDemo) return null;
    const rows = DEMO_SUCCESS.trim()
      .split('\n')
      .slice(1)
      .map((r) => r.split(','));
    const totalRevenue = rows.reduce((acc, curr) => acc + parseInt(curr[1]), 0);
    const avgOrders = Math.round(
      rows.reduce((acc, curr) => acc + parseInt(curr[2]), 0) / rows.length
    );
    const peakMonth = rows.reduce((prev, curr) =>
      parseInt(curr[1]) > parseInt(prev[1]) ? curr : prev
    )[0];
    return { totalRevenue, avgOrders, peakMonth };
  }, [isSuccessDemo]);

  const currentChartType =
    overrideChartType || structuredAnalysis?.chartType || 'bar';

  /* ─── Handlers ──────────────────────────────────────────── */
  const handleDataLoaded = (content: string) => {
    setData(content);
    setActiveTab('paste');
  };

  const loadDemo = (type: 'success' | 'failure') => {
    const demo = type === 'success' ? DEMO_SUCCESS : DEMO_FAILURE;
    setData(demo);
    setActiveTab('paste');
    setAnalysisResult(null);
    setStructuredAnalysis(null);
    setPipelineResult(null);
  };

  const runAnalysis = async (content: string, prompt: string) => {
    setLoading(true);
    setError(null);
    setStructuredAnalysis(null);
    setAnalysisResult(null);
    setPipelineResult(null);
    setOverrideChartType(null);
    setWowGap(null);

    try {
      // Step 1 + 2: Clean → AI analysis (with heuristic fallback built-in)
      const result = await runDataPipeline(content, setPipelineStep);
      setPipelineResult(result);
      setStructuredAnalysis(result.analysis);

      if (result.analysis) {
        setWowGap(calculateWowGap(result.analysis));
      }

      // Step 3: Ask Ollama to produce a Chart.js config.
      // If Ollama is unavailable or the model is missing, build a chart
      // directly from the cleaned data — no model call needed.
      try {
        const chartResult = await callOllama(
          JSON.stringify(result.data.raw.slice(0, 50)),
          prompt
        );
        setAnalysisResult(chartResult);
      } catch (chartErr: any) {
        console.warn('callOllama failed, using heuristic chart:', chartErr.message);
        const fallback = buildFallbackChartConfig(
          result.data.raw.slice(0, 50),
          result.analysis?.chartType ?? 'bar'
        );
        setAnalysisResult(fallback);
      }

      setPipelineStep('done');
    } catch (err: any) {
      setPipelineStep('error');
      setError(err.message || 'Failed to complete the data pipeline.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <div className="page-wrap">

      {/* ── Header ────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2.5rem',
        }}
      >
        <div>
          <h1
            className="mono"
            style={{
              color: 'var(--accent)',
              fontSize: '1.6rem',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            NEZZ_
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              marginTop: '6px',
              letterSpacing: '0.01em',
            }}
          >
            Big ideas. Cheap model.
          </p>
        </div>

        {/* Model pill badge */}
        <div
          className="pill"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-muted)',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            marginTop: '4px',
          }}
        >
          <span className="pulsing-dot" />
          Qwen 3 0.6B&nbsp;·&nbsp;Tier 1&nbsp;·&nbsp;LOCAL
        </div>
      </header>

      {/* ── Demo Buttons ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <button
          className={`btn-demo${isSuccessDemo ? ' active-demo' : ''}`}
          onClick={() => loadDemo('success')}
        >
          <span className="demo-badge success">SUCCESS DEMO</span>
          Load Demo: E-commerce Sales
        </button>

        <button
          className={`btn-demo${isFailureDemo ? ' active-demo' : ''}`}
          onClick={() => loadDemo('failure')}
        >
          <span className="demo-badge failure">FAILURE DEMO</span>
          Load Demo: Sensor Failure
        </button>
      </div>

      {/* ── Two-column grid ───────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '5fr 7fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* ── Left column ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Input card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            {/* Tab bar */}
            <div className="tab-bar">
              <button
                className={`tab-btn ${activeTab === 'upload' ? 'active' : 'inactive'}`}
                onClick={() => setActiveTab('upload')}
              >
                Upload
              </button>
              <button
                className={`tab-btn ${activeTab === 'paste' ? 'active' : 'inactive'}`}
                onClick={() => setActiveTab('paste')}
              >
                Paste Data
              </button>
            </div>

            {activeTab === 'upload' ? (
              <Dropzone onDataLoaded={handleDataLoaded} />
            ) : (
              <RawPaste
                onAnalyze={runAnalysis}
                isLoading={loading}
                initialValue={data}
              />
            )}
          </div>

          {/* Error display */}
          {error && (
            <div
              style={{
                padding: '0.875rem 1rem',
                background: 'var(--failure-dim)',
                border: '1px solid var(--failure)',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: 'var(--failure)',
                lineHeight: 1.5,
              }}
            >
              <strong>Pipeline error:</strong> {error}
            </div>
          )}

          {/* ── Known Limitations ──────────────────────────── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <button
              className="limits-toggle"
              onClick={() => setShowLimitations(!showLimitations)}
              aria-expanded={showLimitations}
            >
              <span className="limits-toggle-label">Known Limitations</span>
              <span className={`chevron${showLimitations ? ' open' : ''}`} />
            </button>

            <div
              className={`limits-body${showLimitations ? ' open' : ''}`}
              style={{
                borderTop: showLimitations
                  ? '1px solid var(--border-subtle)'
                  : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.75rem 1.25rem',
                  gap: '0',
                }}
              >
                <div
                  className="limit-row"
                  style={{ borderColor: 'var(--warning)' }}
                >
                  <p>Scale Limit</p>
                  <p>Processing &gt;500 rows triggers context failure.</p>
                </div>
                <div
                  className="limit-row"
                  style={{ borderColor: 'var(--failure)' }}
                >
                  <p>Hallucinations</p>
                  <p>Occasional column misnaming; mitigated by validation.</p>
                </div>
                <div
                  className="limit-row"
                  style={{ borderColor: '#facc15' }}
                >
                  <p>Calibration</p>
                  <p>Confidence scores are non-statistical intuition.</p>
                </div>
                <div
                  className="limit-row"
                  style={{ borderColor: 'var(--blue)' }}
                >
                  <p>Language</p>
                  <p>Non-English headers degrade output quality.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────── */}
        <div className="card" style={{ minHeight: '460px', display: 'flex', flexDirection: 'column' }}>

          {/* Card header */}
          <div
            style={{
              padding: '0.9rem 1.25rem',
              borderBottom: '1px solid var(--border-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-sub)',
              }}
            >
              Visual Insights
            </span>

            {analysisResult && (
              <span
                className="mono"
                style={{ fontSize: '10px', color: 'var(--accent)' }}
              >
                {currentChartType.toUpperCase()} MODE
              </span>
            )}
          </div>

          {/* Card body */}
          <div style={{ flex: 1, padding: '1.25rem' }}>

            {/* ── Loading state ──────────────────────────── */}
            {loading ? (
              <div
                style={{
                  height: '100%',
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                }}
              >
                <div className="spinner-lg" />
                <p
                  className="mono"
                  style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                >
                  pipeline:{' '}
                  <span style={{ color: 'var(--accent)' }}>{pipelineStep}</span>
                </p>
              </div>

            ) : !data ? (
              /* ── Awaiting placeholder ─────────────────── */
              <div className="awaiting-state">
                <div className="awaiting-icon" />
                <p style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
                  Awaiting data —
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  load a demo or upload a file to begin
                </p>
              </div>

            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* ── Failure demo warning banner ─────────── */}
                {isFailureDemo && !analysisResult && (
                  <div className="failure-banner">
                    <span className="warn-tri" />
                    <div>
                      <p>
                        Anomalous data detected — model fallback to heuristic mode
                        <span>
                          Missing values, out-of-range readings and trailing commas
                          were detected. Statistical heuristics will be used instead
                          of the model output.
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Success demo metric preview ─────────── */}
                {isSuccessDemo && successMetrics && !analysisResult && (
                  <div>
                    <p
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: '0.75rem',
                      }}
                    >
                      Preview — E-commerce Sales
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div className="metric-card">
                        <p className="metric-label">Total Revenue</p>
                        <p className="metric-value metric-accent">
                          ${successMetrics.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="metric-label">Peak Month</p>
                        <p className="metric-value">{successMetrics.peakMonth}</p>
                      </div>
                      <div className="metric-card">
                        <p className="metric-label">Avg Orders</p>
                        <p className="metric-value">{successMetrics.avgOrders}</p>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: '0.75rem',
                        fontStyle: 'italic',
                      }}
                    >
                      Hit "Generate Visualization" to run the full AI pipeline →
                    </p>
                  </div>
                )}

                {/* ── Analysis results ────────────────────── */}
                {analysisResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Chart type switcher */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['bar', 'line', 'scatter'] as const).map((t) => (
                        <button
                          key={t}
                          className={`chart-type-btn ${currentChartType === t ? 'active' : 'inactive'}`}
                          onClick={() => setOverrideChartType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <ChartDisplay
                      config={{ ...analysisResult.chartConfig, type: currentChartType }}
                    />

                    {structuredAnalysis && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div
                          className="insight-panel"
                          style={{
                            borderColor: 'var(--accent)',
                            background: 'rgba(249, 115, 22, 0.04)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '9.5px',
                              fontWeight: '800',
                              color: 'var(--accent)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              marginBottom: '4px',
                            }}
                          >
                            Trend
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
                            {structuredAnalysis.trend}
                          </p>
                        </div>
                        <div
                          className="insight-panel"
                          style={{
                            borderColor: 'var(--failure)',
                            background: 'rgba(239, 68, 68, 0.04)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '9.5px',
                              fontWeight: '800',
                              color: 'var(--failure)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              marginBottom: '4px',
                            }}
                          >
                            Anomalies
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
                            {structuredAnalysis.anomalies.length} detected
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom receipt bar (always visible) ─────────────── */}
      <footer className="receipt-bar">
        <div className="receipt-items">
          <span>Model: qwen3:0.6b-q4_k_m</span>
          <span className="receipt-dot">·</span>
          <span>Cost: $0.00</span>
          <span className="receipt-dot">·</span>
          <span>Tier: 1</span>
        </div>
        <div className="receipt-status">
          <span>Status:</span>
          {loading ? (
            <>
              <span className="analyzing">analyzing...</span>
              <span className="spinner" />
            </>
          ) : (
            <span className="ready">ready</span>
          )}
        </div>
      </footer>
    </div>
  );
}
