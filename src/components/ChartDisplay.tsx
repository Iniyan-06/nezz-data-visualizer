'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ChartDisplayProps {
  config: any;
}

export default function ChartDisplay({ config }: ChartDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (canvasRef.current && config) {
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      try {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const styledConfig = {
            ...config,
            options: {
              ...config.options,
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                ...config.options?.plugins,
                legend: {
                  ...config.options?.plugins?.legend,
                  labels: {
                    color: '#cbd5e1',
                    font: { family: 'Inter, system-ui, sans-serif', size: 12 },
                    padding: 16,
                  },
                },
                tooltip: {
                  backgroundColor: '#1a1d27',
                  borderColor: '#2d313f',
                  borderWidth: 1,
                  titleColor: '#f1f5f9',
                  bodyColor: '#94a3b8',
                  padding: 10,
                  cornerRadius: 8,
                },
              },
              scales: {
                ...config.options?.scales,
                x: {
                  ...config.options?.scales?.x,
                  grid: { color: 'rgba(255, 255, 255, 0.04)' },
                  ticks: {
                    color: '#64748b',
                    font: { family: 'Inter, system-ui, sans-serif', size: 11 },
                  },
                  border: { color: '#2d313f' },
                },
                y: {
                  ...config.options?.scales?.y,
                  grid: { color: 'rgba(255, 255, 255, 0.04)' },
                  ticks: {
                    color: '#64748b',
                    font: { family: 'Inter, system-ui, sans-serif', size: 11 },
                  },
                  border: { color: '#2d313f' },
                },
              },
            },
            // Override dataset colours to use accent
            data: {
              ...config.data,
              datasets: (config.data?.datasets || []).map((ds: any, i: number) => ({
                ...ds,
                backgroundColor:
                  ds.backgroundColor ??
                  (i === 0 ? 'rgba(249, 115, 22, 0.75)' : `hsl(${200 + i * 40},60%,55%)`),
                borderColor:
                  ds.borderColor ??
                  (i === 0 ? '#f97316' : `hsl(${200 + i * 40},60%,55%)`),
                borderWidth: ds.borderWidth ?? 2,
                pointBackgroundColor: ds.pointBackgroundColor ?? '#f97316',
                pointRadius: ds.pointRadius ?? 4,
                showLine: config.type === 'scatter' ? false : ds.showLine,
              })),
            },
          };

          if (styledConfig.type === 'scatter') {
            styledConfig.type = 'line';
          }

          chartRef.current = new Chart(ctx, styledConfig);
        }
      } catch (err) {
        console.error('Error creating chart:', err);
      }
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [config]);

  if (!config) {
    return (
      <div
        style={{
          width: '100%',
          height: '360px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          fontSize: '13px',
        }}
      >
        Waiting for analysis…
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '360px', position: 'relative', padding: '4px 0' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
