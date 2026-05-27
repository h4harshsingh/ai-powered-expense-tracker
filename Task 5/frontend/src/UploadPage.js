import React from 'react';
import { uploadFileInChunks, scanReceipt } from './api';
import FileCard from './FileCard';
import ConfirmForm from './ConfirmForm';

export default function UploadPage() {
  var [cards,      setCards     ] = React.useState([]);
  var [activeForm, setActiveForm] = React.useState(null);

  function updateCard(id, patch) {
    setCards(function(prev) {
      return prev.map(function(c) {
        return c.id === id ? Object.assign({}, c, patch) : c;
      });
    });
  }

  function onFilesSelected(e) {
    var files = Array.from(e.target.files);
    if (!files.length) return;

    var newCards = files.map(function(f) {
      return {
        id:       String(Date.now()) + '-' + String(Math.random()),
        file:     f,
        progress: 0,
        status:   'waiting',
        fileId:   null,
      };
    });

    setCards(function(prev) { return prev.concat(newCards); });
    e.target.value = '';

    newCards.forEach(function(card) {
      startUpload(card.id, card.file);
    });
  }

  function startUpload(cardId, file) {
    updateCard(cardId, { status: 'uploading', progress: 0 });

    uploadFileInChunks(file, function(pct) {
      updateCard(cardId, { progress: pct });
    })
    .then(function(fileId) {
      updateCard(cardId, { status: 'uploaded', fileId: fileId });
    })
    .catch(function(err) {
      console.error('[upload error]', err.message || err);
      updateCard(cardId, { status: 'failed' });
    });
  }

  function onScan(card) {
    updateCard(card.id, { status: 'scanning' });

    scanReceipt(card.fileId)
    .then(function(result) {
      updateCard(card.id, { status: 'scanned' });
      setActiveForm({ cardId: card.id, result: result });
    })
    .catch(function(err) {
      console.error('[scan error]', err.message || err);
      updateCard(card.id, { status: 'failed' });
    });
  }

  function onSaved() {
    if (activeForm) {
      var id = activeForm.cardId;
      setCards(function(prev) {
        return prev.filter(function(c) { return c.id !== id; });
      });
    }
    setActiveForm(null);
  }

  return (
    <div>
      <h2 className="page-title">📸 Upload Receipts</h2>
      <p className="page-sub">
        Select one or more receipt images. AI will extract expense details automatically.
      </p>

      <div className="card">
        <label className="file-picker-label">
          📂 Choose Receipt Images
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onFilesSelected}
            style={{ display: 'none' }}
          />
        </label>
        <p className="file-picker-hint">JPG, PNG, WEBP supported. Multiple files allowed.</p>
      </div>

      {cards.map(function(card) {
        return <FileCard key={card.id} state={card} onScan={onScan} />;
      })}

      {activeForm && (
        <div className="overlay">
          <div className="modal">
            <ConfirmForm
              result={activeForm.result}
              onSaved={onSaved}
              onCancel={function() { setActiveForm(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}