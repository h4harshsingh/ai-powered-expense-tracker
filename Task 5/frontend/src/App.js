import React from 'react';
import UploadPage from './UploadPage';
import ExpensesPage from './ExpensesPage';

export default function App() {
  var [tab, setTab] = React.useState('upload');

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="navbar-left">
          <span className="navbar-logo">💰</span>
          <span className="navbar-brand">SmartSpend</span>
        </div>
        <div className="navbar-tabs">
          <button
            className={'nav-tab' + (tab === 'upload' ? ' active' : '')}
            onClick={() => setTab('upload')}
          >
            <span className="tab-icon">📸</span>
            <span className="tab-label">Upload Receipts</span>
          </button>
          <button
            className={'nav-tab' + (tab === 'expenses' ? ' active' : '')}
            onClick={() => setTab('expenses')}
          >
            <span className="tab-icon">📋</span>
            <span className="tab-label">Transactions</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {tab === 'upload'   && <UploadPage onExpenseSaved={() => setTab('expenses')} />}
        {tab === 'expenses' && <ExpensesPage />}
      </main>
    </div>
  );
}