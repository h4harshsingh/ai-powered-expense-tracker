import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { fetchExpenses, BASE_URL } from './api';

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

function fmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // YYYY-MM
}

function getMonthLabel(yyyymm) {
  if (!yyyymm) return '';
  var [y, m] = yyyymm.split('-');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m, 10) - 1] + ' ' + y;
}

// Custom tooltip for pie chart
function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  var entry = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{entry.name}</div>
      <div className="tooltip-value">{fmt(entry.value)}</div>
      <div className="tooltip-pct">{entry.payload.pct}%</div>
    </div>
  );
}

// Custom tooltip for bar chart
function BarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value">{fmt(payload[0].value)}</div>
    </div>
  );
}

// Custom label for pie chart
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }) {
  if (pct < 5) return null;
  var RADIAN = Math.PI / 180;
  var radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  var x = cx + radius * Math.cos(-midAngle * RADIAN);
  var y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {pct}%
    </text>
  );
}

export default function DashboardPage() {
  var [expenses, setExpenses]   = React.useState([]);
  var [loading,  setLoading]    = React.useState(true);
  var [selectedMonth, setSelectedMonth] = React.useState('');
  var [availableMonths, setAvailableMonths] = React.useState([]);
  var [recentExpense, setRecentExpense] = React.useState(null);

  React.useEffect(() => {
    fetchExpenses()
      .then(data => {
        var arr = Array.isArray(data) ? data : [];
        setExpenses(arr);

        // Build list of unique months from data
        var months = [...new Set(
          arr.map(e => getMonthKey(e.expense_date || e.date)).filter(Boolean)
        )].sort().reverse();

        setAvailableMonths(months);
        if (months.length > 0) setSelectedMonth(months[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter expenses for selected month
  var filtered = React.useMemo(() => {
    if (!selectedMonth) return expenses;
    return expenses.filter(e => {
      var d = e.expense_date || e.date;
      return d && d.startsWith(selectedMonth);
    });
  }, [expenses, selectedMonth]);

  // Summary calculations
  var totalSpend   = filtered.reduce((s, e) => s + (e.total_amount || e.amount || 0), 0);
  var txCount      = filtered.length;
  var avgExpense   = txCount > 0 ? totalSpend / txCount : 0;

  var catTotals = React.useMemo(() => {
    var map = {};
    CATEGORIES.forEach(c => { map[c] = 0; });
    filtered.forEach(e => {
      var cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (e.total_amount || e.amount || 0);
    });
    return map;
  }, [filtered]);

  var highestCat = Object.entries(catTotals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0];

  // Pie chart data
  var pieData = CATEGORIES
    .filter(c => catTotals[c] > 0)
    .map(c => ({
      name: c,
      value: catTotals[c],
      pct:  totalSpend > 0 ? Math.round((catTotals[c] / totalSpend) * 100) : 0,
      color: CAT_COLORS[c],
    }));

  // Bar chart data
  var barData = CATEGORIES
    .filter(c => catTotals[c] > 0)
    .map(c => ({ name: c, amount: catTotals[c], color: CAT_COLORS[c] }))
    .sort((a, b) => b.amount - a.amount);

  // Line chart — monthly trend (last 6 months)
  var trendData = React.useMemo(() => {
    var map = {};
    expenses.forEach(e => {
      var mk = getMonthKey(e.expense_date || e.date);
      if (!mk) return;
      map[mk] = (map[mk] || 0) + (e.total_amount || e.amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => ({ month: getMonthLabel(k), amount: v }));
  }, [expenses]);

  // Recent expense with image
  var recentWithImage = filtered.find(e => e.image_url);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* Header row */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your spending overview</p>
        </div>
        <div className="month-selector-wrap">
          <label className="month-label">Month</label>
          <select
            className="month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{getMonthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card card-blue">
          <div className="card-icon">💸</div>
          <div className="card-body">
            <div className="card-label">Total Spend</div>
            <div className="card-value">{fmt(totalSpend)}</div>
          </div>
        </div>
        <div className="summary-card card-purple">
          <div className="card-icon">🧾</div>
          <div className="card-body">
            <div className="card-label">Transactions</div>
            <div className="card-value">{txCount}</div>
          </div>
        </div>
        <div className="summary-card card-orange">
          <div className="card-icon">🏆</div>
          <div className="card-body">
            <div className="card-label">Top Category</div>
            <div className="card-value card-value-sm">
              {highestCat ? highestCat[0] : '—'}
            </div>
          </div>
        </div>
        <div className="summary-card card-green">
          <div className="card-icon">📈</div>
          <div className="card-body">
            <div className="card-label">Avg Expense</div>
            <div className="card-value">{fmt(avgExpense)}</div>
          </div>
        </div>
      </div>

      {txCount === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-icon">📊</div>
          <h3>No expenses for this period</h3>
          <p>Upload a receipt to get started, or select a different month.</p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="charts-row">

            {/* Donut chart */}
            <div className="chart-card">
              <h3 className="chart-title">Category Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#374151', fontSize: 13 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart */}
            <div className="chart-card">
              <h3 className="chart-title">Amount by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend chart */}
          {trendData.length > 1 && (
            <div className="chart-card chart-card-wide">
              <h3 className="chart-title">Monthly Spending Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                  <Tooltip content={<BarTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown list */}
          <div className="cat-breakdown-card">
            <h3 className="chart-title">Category Details</h3>
            <div className="cat-list">
              {pieData.map(c => (
                <div key={c.name} className="cat-row">
                  <div className="cat-dot" style={{ background: c.color }} />
                  <div className="cat-name">{c.name}</div>
                  <div className="cat-bar-wrap">
                    <div
                      className="cat-bar-fill"
                      style={{ width: c.pct + '%', background: c.color }}
                    />
                  </div>
                  <div className="cat-pct">{c.pct}%</div>
                  <div className="cat-amt">{fmt(c.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}