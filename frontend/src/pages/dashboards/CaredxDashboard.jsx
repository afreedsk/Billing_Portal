import React, { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Upload, Download, Plus, RefreshCw, Filter,
  Wallet, CreditCard, Landmark, TrendingUp, TrendingDown,
} from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import FinanceCharts from "../../components/FinanceCharts.jsx";
import CaredxLabTable from "../../components/CaredxLabTable.jsx";
import CaredxLabEntryForm from "../../components/CaredxLabEntryForm.jsx";
import CaredxExpenseTable from "../../components/CaredxExpenseTable.jsx";
import CaredxExpenseForm from "../../components/CaredxExpenseForm.jsx";
import api from "../../api/axios.js";

const ROLE_COLOR = "#be185d";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function CaredxDashboard() {
  // Shared date range — drives Lab Data Entry, Expenses, and the combined
  // summary/charts together so everything on the page stays in sync.
  // Defaults to EMPTY (no filter = show everything). Defaulting to "this
  // month" hid historical data right after an Excel import whenever the
  // sheet's dates fell outside the current month — which is the normal
  // case, since most imports are of past records.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [labSearch, setLabSearch] = useState("");

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ---------------------------------------------------------------------
  // Lab Data Entry
  // ---------------------------------------------------------------------
  const [labEntries, setLabEntries] = useState([]);
  const [labLoading, setLabLoading] = useState(true);
  const [labFormOpen, setLabFormOpen] = useState(false);
  const [editingLabEntry, setEditingLabEntry] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ---------------------------------------------------------------------
  // Expenses
  // ---------------------------------------------------------------------
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const dateParams = { start_date: startDate, end_date: endDate };

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/caredx/lab-entries/summary", { params: dateParams });
      setSummary(res.data);
    } catch {
      toast.error("Failed to load dashboard summary.");
    } finally {
      setSummaryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchLabEntries = useCallback(async () => {
    setLabLoading(true);
    try {
      const params = { ...dateParams };
      if (labSearch) params.search = labSearch;
      const res = await api.get("/caredx/lab-entries", { params });
      setLabEntries(res.data.entries);
    } catch {
      toast.error("Failed to load lab data entries.");
    } finally {
      setLabLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, labSearch]);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const res = await api.get("/caredx/expenses", { params: dateParams });
      setExpenses(res.data.expenses);
    } catch {
      toast.error("Failed to load expenses.");
    } finally {
      setExpensesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const refetchAll = useCallback(() => {
    fetchSummary();
    fetchLabEntries();
    fetchExpenses();
  }, [fetchSummary, fetchLabEntries, fetchExpenses]);

  useEffect(() => { refetchAll(); }, [refetchAll]);

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setLabSearch("");
  };

  // ---- Lab Data Entry actions -----------------------------------------
  const openNewLabEntry = () => { setEditingLabEntry(null); setLabFormOpen(true); };
  const openEditLabEntry = (entry) => { setEditingLabEntry(entry); setLabFormOpen(true); };

  const handleLabDelete = async (entry) => {
    if (!window.confirm(`Delete the lab entry for "${entry.patient_name}" dated ${entry.entry_date}?`)) return;
    try {
      await api.delete(`/caredx/lab-entries/${entry.id}`);
      toast.success("Lab entry deleted.");
      refetchAll();
    } catch {
      toast.error("Failed to delete lab entry.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xlsm")) {
      toast.error("Please select a .xlsx file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    setLastImportResult(null);
    try {
      const res = await api.post("/caredx/lab-entries/import", formData);
      setLastImportResult(res.data);
      toast.success(res.data.message);
      refetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || "Import failed. Please check the file format.";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleLabExport = async () => {
    try {
      const res = await api.get("/caredx/lab-entries/export", { params: dateParams, responseType: "blob" });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Caredx_Lab_Entries_${startDate || "all"}_to_${endDate || "time"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export lab entries.");
    }
  };

  // ---- Expenses actions -------------------------------------------------
  const openNewExpense = () => { setEditingExpense(null); setExpenseFormOpen(true); };
  const openEditExpense = (expense) => { setEditingExpense(expense); setExpenseFormOpen(true); };

  const handleExpenseDelete = async (expense) => {
    if (!window.confirm(`Delete the "${expense.category}" expense dated ${expense.expense_date}?`)) return;
    try {
      await api.delete(`/caredx/expenses/${expense.id}`);
      toast.success("Expense deleted.");
      refetchAll();
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  return (
    <div className="page">
      <Navbar title="Caredx Dashboard" roleColor={ROLE_COLOR} />

      <main className="page-main">
        {/* ---------------- Shared date filter ---------------- */}
        <div className="card filter-bar">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" />
          </div>
          <div className="form-group form-group--grow">
            <label className="form-label">Search Lab Entries</label>
            <input
              type="text"
              value={labSearch}
              onChange={(e) => setLabSearch(e.target.value)}
              placeholder="Search by patient, test, or employee"
              className="form-control"
            />
          </div>
          <div className="filter-actions">
            <button onClick={refetchAll} className="btn btn-primary">
              <Filter size={16} /> Apply Filter
            </button>
            <button onClick={handleReset} className="btn btn-secondary">
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        <p className="text-muted" style={{ fontSize: 12.5, marginTop: -8 }}>
          {startDate || endDate
            ? `Showing entries from ${startDate || "the beginning"} to ${endDate || "today"}.`
            : "Showing all entries (no date filter applied)."}
        </p>

        {/* ---------------- Stat cards ---------------- */}
        {summary && (
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-icon stat-icon--profit"><TrendingUp size={22} /></div>
              <div>
                <p className="stat-label">Total Amount Paid</p>
                <p className="stat-value">{formatCurrency(summary.total_amount_paid)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon stat-icon--income"><Wallet size={22} /></div>
              <div>
                <p className="stat-label">Total Cash</p>
                <p className="stat-value">{formatCurrency(summary.total_cash)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon stat-icon--entries"><CreditCard size={22} /></div>
              <div>
                <p className="stat-label">Total Online</p>
                <p className="stat-value">{formatCurrency(summary.total_online)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon stat-icon--team"><Landmark size={22} /></div>
              <div>
                <p className="stat-label">Paid to Other Labs</p>
                <p className="stat-value">{formatCurrency(summary.total_paid_to_other_labs)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon stat-icon--active"><TrendingUp size={22} /></div>
              <div>
                <p className="stat-label">Total Sales</p>
                <p className="stat-value">{formatCurrency(summary.total_sales)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon stat-icon--expense"><TrendingDown size={22} /></div>
              <div>
                <p className="stat-label">Expenses</p>
                <p className="stat-value">{formatCurrency(summary.total_expenses)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Charts ---------------- */}
        {summary && (
          <FinanceCharts trend={summary.trend} categoryBreakdown={summary.category_breakdown} />
        )}

        {/* ---------------- Lab Data Entry ---------------- */}
        <div className="section-header">
          <p className="section-title">Lab Data Entry</p>
          <div className="filter-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleFileSelected}
              className="file-input-hidden"
              id="lab-import-input"
            />
            <button onClick={handleImportClick} disabled={importing} className="btn btn-secondary">
              <Upload size={16} /> {importing ? "Importing..." : "Import Excel"}
            </button>
            <button onClick={handleLabExport} className="btn btn-secondary">
              <Download size={16} /> Export Excel
            </button>
            <button onClick={openNewLabEntry} className="btn btn-primary">
              <Plus size={16} /> Add Entry
            </button>
          </div>
        </div>

        {lastImportResult && (
          <div className="import-summary">
            <strong>Last import:</strong> {lastImportResult.imported} row(s) imported
            {lastImportResult.skipped > 0 && <>, {lastImportResult.skipped} row(s) skipped</>}.
            {lastImportResult.errors?.length > 0 && (
              <> First skipped row(s): {lastImportResult.errors.slice(0, 3).join(" ")}</>
            )}
          </div>
        )}

        {labLoading ? (
          <div className="card empty-state">Loading...</div>
        ) : (
          <CaredxLabTable entries={labEntries} onEdit={openEditLabEntry} onDelete={handleLabDelete} />
        )}

        {/* ---------------- Expenses ---------------- */}
        <div className="section-header">
          <p className="section-title">Expenses</p>
          <button onClick={openNewExpense} className="btn btn-primary">
            <Plus size={16} /> Add Expense
          </button>
        </div>

        {expensesLoading ? (
          <div className="card empty-state">Loading...</div>
        ) : (
          <CaredxExpenseTable expenses={expenses} onEdit={openEditExpense} onDelete={handleExpenseDelete} />
        )}
      </main>

      <CaredxLabEntryForm
        open={labFormOpen}
        onClose={() => setLabFormOpen(false)}
        onSaved={refetchAll}
        editingEntry={editingLabEntry}
      />

      <CaredxExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSaved={refetchAll}
        editingExpense={editingExpense}
      />
    </div>
  );
}