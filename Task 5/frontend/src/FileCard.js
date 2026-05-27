import React from 'react';

var BADGE = {
  waiting:   { background: '#e9ecef', color: '#555'    },
  uploading: { background: '#fff3cd', color: '#856404' },
  uploaded:  { background: '#d4edda', color: '#155724' },
  scanning:  { background: '#cce5ff', color: '#004085' },
  scanned:   { background: '#d1ecf1', color: '#0c5460' },
  failed:    { background: '#f8d7da', color: '#721c24' },
};

export default function FileCard(props) {
  var state  = props.state;
  var onScan = props.onScan;

  var status   = state.status;
  var progress = state.progress;
  var file     = state.file;

  var bs   = BADGE[status] || BADGE.waiting;
  var text = status === 'uploading' ? ('⏳ ' + progress + '%') : status;

  return (
    <div className="file-card">
      <div className="file-card-header">
        <span className="file-name">{file.name}</span>
        <span className="badge" style={bs}>{text}</span>
      </div>

      {status === 'uploading' && (
        <div className="progress-wrap">
          <div className="progress-fill" style={{ width: progress + '%' }} />
        </div>
      )}

      {status === 'uploaded' && (
        <button
          className="scan-btn"
          onClick={function() { onScan(state); }}
        >
          🔍 Scan with AI
        </button>
      )}

      {status === 'scanning' && (
        <p className="scan-msg" style={{ color: '#004085' }}>
          🤖 Gemini is reading your receipt…
        </p>
      )}

      {status === 'failed' && (
        <p className="scan-msg" style={{ color: '#721c24' }}>
          ❌ Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}