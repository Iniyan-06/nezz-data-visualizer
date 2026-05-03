'use client';

import { useState, useEffect } from 'react';

interface RawPasteProps {
  onAnalyze: (content: string, prompt: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function RawPaste({
  onAnalyze,
  isLoading,
  initialValue = '',
}: RawPasteProps) {
  const [content, setContent] = useState(initialValue);
  const [prompt, setPrompt] = useState('Analyze this data and suggest a chart type.');

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const canRun = !isLoading && content.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Data source textarea */}
      <div>
        <label className="field-label">Data Source</label>
        <textarea
          className="field-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste CSV or JSON here, or load a demo above…"
          spellCheck={false}
        />
      </div>

      {/* Analysis goal input */}
      <div>
        <label className="field-label">Analysis Goal</label>
        <input
          type="text"
          className="field-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should I look for?"
        />
      </div>

      {/* Row: char count + run button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {content.trim().length > 0 && (
          <span
            className="mono"
            style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            {content.split('\n').length} rows
          </span>
        )}
        <button
          className="btn-primary"
          onClick={() => onAnalyze(content, prompt)}
          disabled={!canRun}
          style={{ flex: 1 }}
        >
          {isLoading ? (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}
            >
              <span className="spinner" />
              Processing Pipeline…
            </span>
          ) : (
            'Generate Visualization'
          )}
        </button>
      </div>
    </div>
  );
}
