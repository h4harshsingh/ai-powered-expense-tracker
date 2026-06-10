import React from 'react';
import { saveExpense, BASE_URL } from './api';

var CATEGORIES = ['Food','Travel','Shopping','Utilities','Health','Entertainment','Other'];

export default function ConfirmForm({ result, onSaved, onCancel }) {
  var [merchant,    setMerchant   ] = React.useState(result.merchant     != null ? String(result.merchant)    : '');
  var [totalAmount, setTotalAmount] = React.useState(result.total_amount  != null ? String(result.total_amount) : '');
  var [expDate,     setExpDate    ] = React.useState(result.date          != null ? String(result.date)         : '');
  var [category,    setCategory   ] = React.useState(result.category      || 'Other');
  var [description, setDescription] = React.useState(result.description   != null ? String(result.description)  : '');
  var [saving,      setSaving     ] = React.useState(false);
  var [error,       setError      ] = React.useState('');

  function handleSave() {
    if (!totalAmount) { setError('Amount is required.'); return; }
    setSaving(true);
    setError('');
    saveExpense({
      file_id:      result.file_id,
      merchant:     merchant     || null,
      total_amount: parseFloat(totalAmount),
      date:         expDate      || null,
      category,
      description:  description  || null,
      items:        result.items || [],
      source:       result.extraction_status === 'success' ? 'AI' : 'MANUAL',
    })
    .then(() => { setSaving(false); onSaved(); })
    .catch(() => { setSaving(false); setError('Save failed. Please try again.'); });
  }

  var imgSrc = result.image_url ? BASE_URL + result.image_url : null;
  var isOk   = result.extraction_status === 'success';

  return (
    <div className="confirm-form">
      <h3 className="confirm-title">Confirm Expense</h3>

      {imgSrc && (
        <img className="confirm-receipt-img" src={imgSrc} alt="Receipt preview" />
      )}

      <div className={'ai-banner ' + (isOk ? 'banner-success' : 'banner-warn')}>
        {isOk
          ? '✅ AI extracted these details — review and confirm.'
          : '⚠️ AI could not read this receipt — please fill in manually.'}
      </div>

      <div className="confirm-grid">
        <label className="field-label">
          Merchant
          <input className="field-input" type="text" value={merchant}
            onChange={e => setMerchant(e.target.value)} placeholder="e.g. Swiggy" />
        </label>

        <label className="field-label">
          Total Amount (₹) *
          <input className="field-input" type="number" step="0.01" value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" />
        </label>

        <label className="field-label">
          Date
          <input className="field-input" type="date" value={expDate}
            onChange={e => setExpDate(e.target.value)} />
        </label>

        <label className="field-label">
          Category
          <select className="field-input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="field-label field-full">
          Description
          <input className="field-input" type="text" value={description}
            onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
        </label>

        {result.items && result.items.length > 0 && (
          <div className="items-detected field-full">
            <strong>Items detected:</strong>
            <ul className="items-list">
              {result.items.map((item, i) => (
                <li key={i}>
                  {item && item.name
                    ? item.name + (item.price ? ' — ₹' + item.price : '')
                    : String(item)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="confirm-actions">
        <button className="btn-confirm-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '✅ Save Expense'}
        </button>
        <button className="btn-confirm-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}