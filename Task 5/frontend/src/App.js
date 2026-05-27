import React from 'react';
import UploadPage from './UploadPage';
import ExpensesPage from './ExpensesPage';

export default function App() {
  var [tab, setTab] = React.useState('upload');

  return (
    <div>
      <nav className="navbar">
        <span className="navbar-brand">🧾 SmartSpend</span>
        <div className="navbar-tabs">
          <button
            className={'tab-btn' + (tab === 'upload' ? ' active' : '')}
            onClick={function() { setTab('upload'); }}
          >
            📸 Upload Receipt
          </button>
          <button
            className={'tab-btn' + (tab === 'expenses' ? ' active' : '')}
            onClick={function() { setTab('expenses'); }}
          >
            💰 My Expenses
          </button>
        </div>
      </nav>

      <div className="page">
        {tab === 'upload'   && <UploadPage />}
        {tab === 'expenses' && <ExpensesPage />}
      </div>
    </div>
  );
}