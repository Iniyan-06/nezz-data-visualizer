'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface DropzoneProps {
  onDataLoaded: (content: string) => void;
}

export default function Dropzone({ onDataLoaded }: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onDataLoaded(content);
        };
        reader.readAsText(file);
      }
    },
    [onDataLoaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone${isDragActive ? ' drag-active' : ''}`}
    >
      <input {...getInputProps()} />

      {/* CSS arrow-up shape — no icon library */}
      <div className="arrow-up-shape" style={{ marginBottom: '0.5rem' }} />

      <p
        style={{
          fontSize: '1rem',
          fontWeight: '700',
          color: 'var(--text-main)',
          textAlign: 'center',
          letterSpacing: '-0.01em',
        }}
      >
        Drop CSV or JSON
      </p>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or</p>

      {/* Orange pill "Choose File" button */}
      <div
        style={{
          background: 'var(--accent)',
          color: '#fff',
          padding: '6px 22px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.03em',
          marginTop: '2px',
        }}
      >
        Choose File
      </div>

      {isDragActive && (
        <p
          style={{
            fontSize: '11px',
            color: 'var(--accent)',
            marginTop: '4px',
            fontWeight: '600',
          }}
        >
          Release to load
        </p>
      )}
    </div>
  );
}
