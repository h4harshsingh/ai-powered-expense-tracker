import React from 'react';
import { saveExpense, BASE_URL } from './api';

var CATEGORIES = ['Food','Travel','Shopping','Utilities','Health','Entertainment','Other'];

export default function ConfirmForm(props) {
  var result   = props.result;
  var onSaved  = props.onSaved;
  var onCancel = props.onCancel;

  var [merchant,    setMerchant   ] = React.useState(result.merchant     != null ? String(result.merchant)    : '');
  var [totalAmount, setTotalAmount] = React.useState(result.total_amount  != null ? String(result.total_amount) : '');
  var [expDate,     setExpDate    ] = React.useState(result.date          != null ? String(result.date)         : '');
  var [category,    setCategory   ] = React.useState(result.category      || 'Other');
  var [description, setDescription] = React.useState(result.description   != null ? String(result.description)  : '');
  var [saving,      setSaving     ] = React.useState(false);
  var [error,       setError      ] = React.useState('');

  function handleSave() {
    if (!totalAmount) {
      setError('Amount is required.');
      return;
    }
    setSaving(true);
    setError('');

    saveExpense({
      file_id:      result.file_id,
      merchant:     merchant     || null,
      total_amount: parseFloat(totalAmount),
      date:         expDate      || null,
      category:     category,
      description:  description  || null,
      items:        result.items || [],
      source:       result.extraction_status === 'success' ? 'AI' : 'MANUAL',
    })
    .then(function() {
      setSaving(false);
      onSaved();
    })
    .catch(function(err) {
      console.error('Save failed:', err);
      setSaving(false);
      setError('Save failed. Please try again.');
    });
  }

  var imgSrc  = result.image_url ? BASE_URL + result.image_url : null;
  var isOk    = result.extraction_status === 'success';

  return (
    <div>
      <h3 className="modal-title">Confirm Expense</h3>

      {imgSrc && (
        <img className="receipt-img" src={imgSrc} alt="Receipt preview" />
      )}

      <div className={'ai-banner ' + (isOk ? 'success' : 'failed')}>
        {isOk
          ? '✅ AI extracted these details — review and confirm.'
          : '⚠️ AI could not read this receipt — please fill in manually.'}
      </div>

      <div className="form-grid">
        <label className="form-label">
          Merchant
          <input
            className="form-input"
            type="text"
            value={merchant}
            onChange={function(e) { setMerchant(e.target.value); }}
            placeholder="e.g. Swiggy"
          />
        </label>

        <label className="form-label">
          Total Amount (₹) *
          <input
            className="form-input"
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={function(e) { setTotalAmount(e.target.value); }}
            placeholder="0.00"
          />
        </label>

        <label className="form-label">
          Date
          <input
            className="form-input"
            type="date"
            value={expDate}
            onChange={function(e) { setExpDate(e.target.value); }}
          />
        </label>

        <label className="form-label">
          Category
          <select
            className="form-input"
            value={category}
            onChange={function(e) { setCategory(e.target.value); }}
          >
            {CATEGORIES.map(function(c) {
              return <option key={c} value={c}>{c}</option>;
            })}
          </select>
        </label>

        <label className="form-label full">
          Description
          <input
            className="form-input"
            type="text"
            value={description}
            onChange={function(e) { setDescription(e.target.value); }}
            placeholder="Brief description"
          />
        </label>

        {result.items && result.items.length > 0 && (
          <div className="items-box">
            <strong>Items detected:</strong>
            <ul>
              {result.items.map(function(item, i) {
                var label = (item && item.name)
                  ? (item.name + (item.price ? ' — ₹' + item.price : ''))
                  : String(item);
                return <li key={i}>{label}</li>;
              })}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '✅ Save Expense'}
        </button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}