import React from 'react';

var BADGE_STYLES = {
  waiting:   { background: '#f3f4f6', color: '#6b7280' },
  uploading: { background: '#fef3c7', color: '#92400e' },
  uploaded:  { background: '#d1fae5', color: '#065f46' },
  scanning:  { background: '#dbeafe', color: '#1e40af' },
  scanned:   { background: '#ede9fe', color: '#4c1d95' },
  failed:    { background: '#fee2e2', color: '#991b1b' },
};

export default function FileCard({ state, onScan }) {
  var { file, progress, status } = state;
  var bs   = BADGE_STYLES[status] || BADGE_STYLES.waiting;
  var text = status === 'uploading' ? ('⏳ ' + progress + '%') : status;

  return (
    <div className={'file-card' + (status === 'failed' ? ' file-card-failed' : '')}>
      <div className="file-card-header">
        <div className="file-card-left">
          <span className="file-icon">📄</span>
          <span className="file-name">{file.name}</span>
        </div>
        <span className="file-badge" style={bs}>{text}</span>
      </div>

      {status === 'uploading' && (
        <div className="progress-track">
          <div className="progress-bar" style={{ width: progress + '%' }} />
        </div>
      )}

      {status === 'uploaded' && (
        <button className="btn-scan" onClick={() => onScan(state)}>
          🔍 Scan with AI
        </button>
      )}

      {status === 'scanning' && (
        <div className="scanning-row">
          <div className="mini-spinner" />
          <span className="scanning-text">Gemini is reading your receipt…</span>
        </div>
      )}

      {status === 'failed' && (
        <p className="error-text">❌ Something went wrong. Please try again.</p>
      )}
    </div>
  );
}