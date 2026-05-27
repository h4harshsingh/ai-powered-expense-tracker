import React from 'react';
import { fetchExpenses, deleteExpense, BASE_URL } from './api';

var CAT_COLOR = {
  Food: '#e03131', Travel: '#1971c2', Shopping: '#e67700',
  Utilities: '#2f9e44', Health: '#9c36b5',
  Entertainment: '#d6336c', Other: '#495057',
};

export default function ExpensesPage() {
  var [expenses, setExpenses] = React.useState([]);
  var [loading,  setLoading ] = React.useState(true);

  function load() {
    fetchExpenses()
      .then(function(data) {
        setExpenses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(function(err) {
        console.error('Fetch expenses failed:', err);
        setLoading(false);
      });
  }

  React.useEffect(function() { load(); }, []);

  function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    deleteExpense(id).then(load).catch(function(err) {
      console.error('Delete failed:', err);
    });
  }

  if (loading) {
    return <div><h2 className="page-title">💰 My Expenses</h2><p className="loading-state">Loading…</p></div>;
  }

  if (!expenses.length) {
    return (
      <div>
        <h2 className="page-title">💰 My Expenses</h2>
        <div className="empty-state">No expenses yet. Upload a receipt to get started.</div>
      </div>
    );
  }

  var total = expenses.reduce(function(s, e) { return s + (e.total_amount || 0); }, 0);

  return (
    <div>
      <h2 className="page-title">💰 My Expenses</h2>

      <div className="summary-bar">
        <span>Total: <strong>{'₹' + total.toFixed(2)}</strong></span>
        <span style={{ color: '#888', fontSize: '14px' }}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table className="exp-table">
          <thead>
            <tr>
              <th>Receipt</th><th>Merchant</th><th>Amount</th>
              <th>Date</th><th>Category</th><th>Description</th>
              <th>Source</th><th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(function(e) {
              var img = e.image_url ? BASE_URL + e.image_url : null;
              var col = CAT_COLOR[e.category] || CAT_COLOR.Other;
              var src = e.source === 'AI' ? 'src-badge src-ai' : 'src-badge src-manual';
              var amt = e.total_amount != null ? '₹' + Number(e.total_amount).toFixed(2) : '—';
              return (
                <tr key={e.id}>
                  <td>
                    {img
                      ? <img className="receipt-thumb" src={img} alt="receipt"
                          onClick={function() { window.open(img, '_blank'); }} />
                      : '—'}
                  </td>
                  <td>{e.merchant    || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{amt}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.date || '—'}</td>
                  <td><span className="cat-badge" style={{ background: col }}>{e.category}</span></td>
                  <td style={{ fontSize: '13px', color: '#555' }}>{e.description || '—'}</td>
                  <td><span className={src}>{e.source}</span></td>
                  <td>
                    <button
                      onClick={function() { handleDelete(e.id); }}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 600 }}
                    >Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}