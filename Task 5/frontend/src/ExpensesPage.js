import React from 'react';
import { fetchExpenses, deleteMultipleExpenses, BASE_URL } from './api';

var CATEGORIES = ['Food', 'Travel', 'Shopping', 'Utilities', 'Health', 'Entertainment', 'Other'];

var CAT_COLORS = {
  Food:          '#ef4444',
  Travel:        '#3b82f6',
  Shopping:      '#f59e0b',
  Utilities:     '#10b981',
  Health:        '#8b5cf6',
  Entertainment: '#f97316',
  Other:         '#6b7280',
};

var PAGE_SIZE = 10;

function fmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// eslint-disable-next-line no-unused-vars
function getMonthKey(dateStr) {
  if (!dateStr) return 'Unknown';
  return dateStr.slice(0, 7);
}

function getMonthLabel(yyyymm) {
  if (!yyyymm || yyyymm === 'Unknown') return 'Unknown Date';
  var [y, m] = yyyymm.split('-');
  var months = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  return months[parseInt(m, 10) - 1] + ' ' + y;
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel, deleting }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🗑️</div>
        <h3 className="modal-title">Delete Expenses</h3>
        <p className="modal-msg">
          Are you sure you want to delete{' '}
          <strong>{count} expense{count !== 1 ? 's' : ''}</strong>?
          This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel-modal" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Image Preview Modal ────────────────────────────────────────────────────
function ImageModal({ url, name, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="image-modal-box" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>✕</button>
        <img src={url} alt={name || 'Receipt'} className="image-modal-img" />
        {name && <p className="image-modal-name">{name}</p>}
      </div>
    </div>
  );
}

// ── Source Badge ───────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  var isAI = source === 'AI';
  return (
    <span className={'source-badge ' + (isAI ? 'badge-ai' : 'badge-manual')}>
      {isAI ? '🤖 AI' : '✏️ Manual'}
    </span>
  );
}

// ── Category Badge ─────────────────────────────────────────────────────────
function CatBadge({ category }) {
  var color = CAT_COLORS[category] || CAT_COLORS.Other;
  return (
    <span className="cat-badge-pill" style={{ background: color + '20', color }}>
      {category || 'Other'}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ExpensesPage() {
  var [expenses,       setExpenses      ] = React.useState([]);
  var [loading,        setLoading       ] = React.useState(true);
  var [search,         setSearch        ] = React.useState('');
  var [debouncedSearch, setDebouncedSearch] = React.useState('');
  var [catFilter,      setCatFilter     ] = React.useState('');
  var [fromDate,       setFromDate      ] = React.useState('');
  var [toDate,         setToDate        ] = React.useState('');
  var [sortBy,         setSortBy        ] = React.useState('date-desc');
  var [groupBy,        setGroupBy       ] = React.useState('month');
  var [page,           setPage          ] = React.useState(1);
  var [totalPages,     setTotalPages    ] = React.useState(1);
  var [totalRecords,   setTotalRecords  ] = React.useState(0);
  var [selected,       setSelected      ] = React.useState(new Set());
  var [showDelete,     setShowDelete    ] = React.useState(false);
  var [deleting,       setDeleting      ] = React.useState(false);
  var [notification,   setNotification  ] = React.useState(null);
  var [imagePreview,   setImagePreview  ] = React.useState(null);

  function load() {
    setLoading(true);
    fetchExpenses({
      page: page,
      page_size: PAGE_SIZE,
      search: debouncedSearch,
      category: catFilter,
      from_date: fromDate,
      to_date: toDate,
      sort_by: sortBy,
    })
      .then(data => {
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setTotalPages(data.total_pages || 1);
        setTotalRecords(data.total_records || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  // Debounce the search box so we don't fire an API call on every keystroke
  React.useEffect(() => {
    var t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 and clear selection whenever a filter changes
  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, catFilter, fromDate, toDate, sortBy]);

  // Fetch from the backend whenever filters or the page change
  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, catFilter, fromDate, toDate, sortBy, page]);

  function showNotif(msg, type) {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // ── Grouping (applied to the current page's rows only) ────────────────────
  var groups = React.useMemo(() => {
    var map = {};
    expenses.forEach(e => {
      var d = e.expense_date || e.date || '';
      var key;
      if (groupBy === 'day')   key = d.slice(0, 10) || 'Unknown';
      else if (groupBy === 'month') key = d.slice(0, 7) || 'Unknown';
      else if (groupBy === 'year')  key = d.slice(0, 4) || 'Unknown';
      else key = 'all';

      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses, groupBy]);

  function groupLabel(key) {
    if (key === 'all') return 'All Expenses';
    if (groupBy === 'month') return getMonthLabel(key);
    if (groupBy === 'year')  return key;
    if (!key || key === 'Unknown') return 'Unknown Date';
    try {
      return new Date(key + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return key; }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  var allPageIds      = expenses.map(e => e.id);
  var allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));
  var someSelected    = selected.size > 0;

  function toggleSelectAll() {
    if (allPageSelected) {
      var next = new Set(selected);
      allPageIds.forEach(id => next.delete(id));
      setSelected(next);
    } else {
      var next2 = new Set(selected);
      allPageIds.forEach(id => next2.add(id));
      setSelected(next2);
    }
  }

  function toggleOne(id) {
    var next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDeleteConfirm() {
    setDeleting(true);
    deleteMultipleExpenses([...selected])
      .then(() => {
        setDeleting(false);
        setShowDelete(false);
        setSelected(new Set());
        showNotif('Expenses deleted successfully.', 'success');
        load();
      })
      .catch(() => {
        setDeleting(false);
        showNotif('Delete failed. Please try again.', 'error');
      });
  }

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setCatFilter('');
    setFromDate('');
    setToDate('');
    setSortBy('date-desc');
  }

  var hasFilters = search || catFilter || fromDate || toDate;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading transactions…</p>
      </div>
    );
  }

  var startIdx = totalRecords > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  var endIdx   = Math.min(page * PAGE_SIZE, totalRecords);

  return (
    <div className="expenses-page">

      {/* Notification */}
      {notification && (
        <div className={'notification notification-' + notification.type}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="expenses-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {totalRecords > 0
              ? 'Showing ' + startIdx + '–' + endIdx + ' of ' + totalRecords + ' expense' +
                (totalRecords !== 1 ? 's' : '')
              : 'No expenses found'}
          </p>
        </div>
        {someSelected && (
          <button className="btn-delete-selected" onClick={() => setShowDelete(true)}>
            🗑️ Delete Selected ({selected.size})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              className="filter-input"
              type="text"
              placeholder="Search description or merchant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">From</label>
            <input className="filter-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>

          <div className="filter-group">
            <label className="filter-label">To</label>
            <input className="filter-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="filters-row filters-row-2">
          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date-desc">Date — Newest First</option>
              <option value="date-asc">Date — Oldest First</option>
              <option value="amt-desc">Amount — Highest First</option>
              <option value="amt-asc">Amount — Lowest First</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Group By</label>
            <select className="filter-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="month">Month</option>
              <option value="day">Day</option>
              <option value="year">Year</option>
              <option value="none">No Grouping</option>
            </select>
          </div>

          {hasFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No expenses found</h3>
          <p>Try adjusting your filters or upload a receipt.</p>
          {hasFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>Clear Filters</button>
          )}
        </div>
      ) : (
        <>
          {/* Select all header */}
          <div className="table-header-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAll}
                className="checkbox"
              />
              <span className="checkbox-text">
                {allPageSelected ? 'Deselect All' : 'Select All on Page'}
              </span>
            </label>
          </div>

          {/* Grouped expense rows */}
          {groups.map(([groupKey, groupExpenses]) => (
            <div key={groupKey} className="expense-group">
              {groupBy !== 'none' && (
                <div className="group-header">
                  <span className="group-label">{groupLabel(groupKey)}</span>
                  <span className="group-total">
                    {fmt(groupExpenses.reduce((s, e) => s + (e.total_amount || e.amount || 0), 0))}
                  </span>
                </div>
              )}

              {groupExpenses.map(e => {
                var imgUrl = e.image_url ? BASE_URL + e.image_url : null;
                var amt    = e.total_amount || e.amount;
                var date   = e.expense_date || e.date || '—';

                return (
                  <div
                    key={e.id}
                    className={'expense-row' + (selected.has(e.id) ? ' row-selected' : '')}
                  >
                    {/* Checkbox */}
                    <div className="row-check">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggleOne(e.id)}
                        className="checkbox"
                      />
                    </div>

                    {/* Receipt thumbnail */}
                    <div className="row-thumb">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt="receipt"
                          className="thumb-img"
                          onClick={() => setImagePreview({ url: imgUrl, name: e.original_name })}
                        />
                      ) : (
                        <div className="thumb-placeholder">🧾</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="row-details">
                      <div className="row-top">
                        <span className="row-merchant">
                          {e.merchant || e.description || 'Expense'}
                        </span>
                        <span className="row-amount">{fmt(amt)}</span>
                      </div>
                      <div className="row-bottom">
                        <span className="row-date">{date}</span>
                        <CatBadge category={e.category} />
                        <SourceBadge source={e.source} />
                        {e.description && e.merchant && (
                          <span className="row-desc">{e.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >«</button>
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >‹</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                var p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return p <= totalPages ? (
                  <button
                    key={p}
                    className={'page-btn' + (p === page ? ' page-active' : '')}
                    onClick={() => setPage(p)}
                  >{p}</button>
                ) : null;
              })}

              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >›</button>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >»</button>
            </div>
          )}
        </>
      )}

      {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          count={selected.size}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}

      {/* Image preview modal */}
      {imagePreview && (
        <ImageModal
          url={imagePreview.url}
          name={imagePreview.name}
          onClose={() => setImagePreview(null)}
        />
      )}
    </div>
  );
}