import React from 'react';
import { uploadFileInChunks, scanReceipt } from './api';
import FileCard from './FileCard';
import ConfirmForm from './ConfirmForm';
import DashboardPage from './DashboardPage';

export default function UploadPage({ onExpenseSaved }) {
  var [cards,      setCards     ] = React.useState([]);
  var [activeForm, setActiveForm] = React.useState(null);

  function updateCard(id, patch) {
    setCards(prev => prev.map(c => c.id === id ? Object.assign({}, c, patch) : c));
  }

  function onFilesSelected(e) {
    var files = Array.from(e.target.files);
    if (!files.length) return;

    var newCards = files.map(f => ({
      id:       String(Date.now()) + '-' + String(Math.random()),
      file:     f,
      progress: 0,
      status:   'waiting',
      fileId:   null,
    }));

    setCards(prev => prev.concat(newCards));
    e.target.value = '';
    newCards.forEach(card => startUpload(card.id, card.file));
  }

  function startUpload(cardId, file) {
    updateCard(cardId, { status: 'uploading', progress: 0 });
    uploadFileInChunks(file, pct => updateCard(cardId, { progress: pct }))
      .then(fileId => updateCard(cardId, { status: 'uploaded', fileId }))
      .catch(() => updateCard(cardId, { status: 'failed' }));
  }

  function onScan(card) {
    updateCard(card.id, { status: 'scanning' });
    scanReceipt(card.fileId)
      .then(result => {
        updateCard(card.id, { status: 'scanned' });
        setActiveForm({ cardId: card.id, result });
      })
      .catch(() => updateCard(card.id, { status: 'failed' }));
  }

  function onSaved() {
    if (activeForm) {
      var sid = activeForm.cardId;
      setCards(prev => prev.filter(c => c.id !== sid));
    }
    setActiveForm(null);
    if (onExpenseSaved) onExpenseSaved();
  }

  return (
    <div className="upload-page">
      <h1 className="page-title">Upload Receipts</h1>
      <p className="page-subtitle">Select one or more receipt images. AI will extract expense details automatically.</p>

      <div className="upload-drop-card">
        <label className="file-picker-label">
          <span className="picker-icon">📂</span>
          <span>Choose Receipt Images</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onFilesSelected}
            style={{ display: 'none' }}
          />
        </label>
        <p className="file-picker-hint">JPG, PNG, WEBP supported · Multiple files allowed</p>
      </div>

      <div className="cards-list">
        {cards.map(card => (
          <FileCard key={card.id} state={card} onScan={onScan} />
        ))}
      </div>

      {activeForm && (
        <div className="modal-backdrop" onClick={() => setActiveForm(null)}>
          <div className="modal-box confirm-modal-box" onClick={e => e.stopPropagation()}>
            <ConfirmForm
              result={activeForm.result}
              onSaved={onSaved}
              onCancel={() => setActiveForm(null)}
            />
          </div>
        </div>
      )}

      {/* Dashboard appears below the upload section */}
      <DashboardPage />
    </div>
  );
}