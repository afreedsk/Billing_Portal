import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Upload,
  Download,
  Plus,
  RefreshCw,
  Filter,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import Navbar from "../../components/Navbar.jsx";
import FinanceCharts from "../../components/FinanceCharts.jsx";

import CaredxLabTable from "../../components/CaredxLabTable.jsx";
import CaredxLabEntryForm from "../../components/CaredxLabEntryForm.jsx";

import CaredxExpenseTable from "../../components/CaredxExpenseTable.jsx";
import CaredxExpenseForm from "../../components/CaredxExpenseForm.jsx";

import api from "../../api/axios.js";

const ROLE_COLOR = "#be185d";

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

export default function CaredxDashboard() {
  // -------------------------------------------------------------------------
  // Shared filters
  // -------------------------------------------------------------------------

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [labSearch, setLabSearch] = useState("");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Lab entries
  // -------------------------------------------------------------------------

  const [labEntries, setLabEntries] = useState([]);
  const [labLoading, setLabLoading] = useState(true);

  const [labFormOpen, setLabFormOpen] =
    useState(false);

  const [editingLabEntry, setEditingLabEntry] =
    useState(null);

  const [importing, setImporting] =
    useState(false);

  const [lastImportResult, setLastImportResult] =
    useState(null);

  const fileInputRef = useRef(null);

  // -------------------------------------------------------------------------
  // Expenses
  // -------------------------------------------------------------------------

  const [expenses, setExpenses] =
    useState([]);

  const [expensesLoading, setExpensesLoading] =
    useState(true);

  const [expenseFormOpen, setExpenseFormOpen] =
    useState(false);

  const [editingExpense, setEditingExpense] =
    useState(null);

  // -------------------------------------------------------------------------
  // Shared API parameters
  // -------------------------------------------------------------------------

  const dateParams = {
    start_date: startDate,
    end_date: endDate,
  };

  // -------------------------------------------------------------------------
  // Fetch summary
  // -------------------------------------------------------------------------

  const fetchSummary = useCallback(
    async () => {
      setSummaryLoading(true);

      try {
        const response = await api.get(
          "/caredx/lab-entries/summary",
          {
            params: dateParams,
          }
        );

        setSummary(response.data);
      } catch (error) {
        console.error(
          "Summary error:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to load dashboard summary."
        );
      } finally {
        setSummaryLoading(false);
      }
    },
    [startDate, endDate]
  );

  // -------------------------------------------------------------------------
  // Fetch lab entries
  // -------------------------------------------------------------------------

  const fetchLabEntries = useCallback(
    async () => {
      setLabLoading(true);

      try {
        const params = {
          ...dateParams,
        };

        if (labSearch.trim()) {
          params.search =
            labSearch.trim();
        }

        const response = await api.get(
          "/caredx/lab-entries",
          {
            params,
          }
        );

        setLabEntries(
          Array.isArray(
            response.data?.entries
          )
            ? response.data.entries
            : []
        );
      } catch (error) {
        console.error(
          "Lab entries error:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to load lab data entries."
        );

        setLabEntries([]);
      } finally {
        setLabLoading(false);
      }
    },
    [startDate, endDate, labSearch]
  );

  // -------------------------------------------------------------------------
  // Fetch expenses
  // -------------------------------------------------------------------------

  const fetchExpenses = useCallback(
    async () => {
      setExpensesLoading(true);

      try {
        const response = await api.get(
          "/caredx/expenses",
          {
            params: dateParams,
          }
        );

        setExpenses(
          Array.isArray(
            response.data?.expenses
          )
            ? response.data.expenses
            : []
        );
      } catch (error) {
        console.error(
          "Expenses error:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to load expenses."
        );

        setExpenses([]);
      } finally {
        setExpensesLoading(false);
      }
    },
    [startDate, endDate]
  );

  // -------------------------------------------------------------------------
  // Fetch everything
  // -------------------------------------------------------------------------

  const refetchAll = useCallback(
    async () => {
      await Promise.all([
        fetchSummary(),
        fetchLabEntries(),
        fetchExpenses(),
      ]);
    },
    [
      fetchSummary,
      fetchLabEntries,
      fetchExpenses,
    ]
  );

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setLabSearch("");
    setLastImportResult(null);
  };

  // -------------------------------------------------------------------------
  // Lab actions
  // -------------------------------------------------------------------------

  const openNewLabEntry = () => {
    setEditingLabEntry(null);
    setLabFormOpen(true);
  };

  const openEditLabEntry = (entry) => {
    setEditingLabEntry(entry);
    setLabFormOpen(true);
  };

  const handleLabDelete = async (
    entry
  ) => {
    const confirmed = window.confirm(
      `Delete the lab entry for "${entry.patient_name}" dated ${entry.entry_date}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/caredx/lab-entries/${entry.id}`
      );

      toast.success(
        "Lab entry deleted."
      );

      await refetchAll();
    } catch (error) {
      console.error(
        "Delete lab entry error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to delete lab entry."
      );
    }
  };

  // -------------------------------------------------------------------------
  // Excel import
  // -------------------------------------------------------------------------

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file) {
      return;
    }

    const fileName =
      file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xlsm")
    ) {
      toast.error(
        "Please select a .xlsx or .xlsm file."
      );

      return;
    }

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    setImporting(true);
    setLastImportResult(null);

    try {
      const response = await api.post(
        "/caredx/lab-entries/import",
        formData
      );

      const result =
        response.data || {};

      setLastImportResult(
        result
      );

      toast.success(
        result.message ||
          "Excel imported successfully."
      );

      await refetchAll();
    } catch (error) {
      console.error(
        "Excel import error:",
        error
      );

      const errors =
        error.response?.data?.errors;

      const message = Array.isArray(
        errors
      )
        ? errors.join(" ")
        : error.response?.data?.message ||
          "Import failed. Please check the Excel file.";

      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Excel export
  // -------------------------------------------------------------------------

  const handleLabExport = async () => {
    try {
      const response = await api.get(
        "/caredx/lab-entries/export",
        {
          params: dateParams,
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;

      anchor.download =
        `Caredx_Lab_Entries_${
          startDate || "all"
        }_to_${
          endDate || "time"
        }.xlsx`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Excel export error:",
        error
      );

      toast.error(
        "Failed to export lab entries."
      );
    }
  };

  // -------------------------------------------------------------------------
  // Expense actions
  // -------------------------------------------------------------------------

  const openNewExpense = () => {
    setEditingExpense(null);
    setExpenseFormOpen(true);
  };

  const openEditExpense = (
    expense
  ) => {
    setEditingExpense(expense);
    setExpenseFormOpen(true);
  };

  const handleExpenseDelete =
    async (expense) => {
      const confirmed =
        window.confirm(
          `Delete the "${expense.category}" expense dated ${expense.expense_date}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await api.delete(
          `/caredx/expenses/${expense.id}`
        );

        toast.success(
          "Expense deleted."
        );

        await refetchAll();
      } catch (error) {
        console.error(
          "Delete expense error:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to delete expense."
        );
      }
    };

  return (
    <div className="page">
      <Navbar
        title="Caredx Dashboard"
        roleColor={ROLE_COLOR}
      />

      <main className="page-main">
        {/* ================================================================
            FILTER BAR
        ================================================================= */}

        <div className="card filter-bar">
          <div className="form-group">
            <label className="form-label">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              className="form-control"
            />
          </div>

          <div className="form-group form-group--grow">
            <label className="form-label">
              Search Lab Entries
            </label>

            <input
              type="text"
              value={labSearch}
              onChange={(event) =>
                setLabSearch(
                  event.target.value
                )
              }
              placeholder="Search by patient, test, or employee"
              className="form-control"
            />
          </div>

          <div className="filter-actions">
            <button
              type="button"
              onClick={refetchAll}
              className="btn btn-primary"
            >
              <Filter size={16} />
              Apply Filter
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>

        <p
          className="text-muted"
          style={{
            fontSize: 12.5,
            marginTop: -8,
          }}
        >
          {startDate || endDate
            ? `Showing entries from ${
                startDate || "the beginning"
              } to ${
                endDate || "today"
              }.`
            : "Showing all entries (no date filter applied)."}
        </p>

        {/* ================================================================
            SUMMARY CARDS
        ================================================================= */}

        {summaryLoading ? (
          <div className="card empty-state">
            Loading dashboard summary...
          </div>
        ) : (
          summary && (
            <div className="stat-grid">
              <div className="card stat-card">
                <div className="stat-icon stat-icon--income">
                  <TrendingUp size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Total Amount
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.total_amount_paid
                    )}
                  </p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon stat-icon--entries">
                  <Wallet size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Total Cash
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.total_cash
                    )}
                  </p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon stat-icon--team">
                  <CreditCard size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Total Online Amount
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.total_online
                    )}
                  </p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon stat-icon--active">
                  <Landmark size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Paid to Other Labs
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.total_paid_to_other_labs
                    )}
                  </p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon stat-icon--expense">
                  <TrendingDown size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Expenses
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.total_expenses
                    )}
                  </p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon stat-icon--profit">
                  <TrendingUp size={22} />
                </div>

                <div>
                  <p className="stat-label">
                    Profit
                  </p>

                  <p className="stat-value">
                    {formatCurrency(
                      summary.profit
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* ================================================================
            CHARTS
        ================================================================= */}

        {!summaryLoading &&
          summary && (
            <FinanceCharts
              trend={
                summary.trend || []
              }
              categoryBreakdown={
                summary.category_breakdown ||
                []
              }
            />
          )}

        {/* ================================================================
            LAB DATA ENTRY
        ================================================================= */}

        <div className="section-header">
          <p className="section-title">
            Lab Data Entry
          </p>

          <div className="filter-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={
                handleFileSelected
              }
              className="file-input-hidden"
              id="lab-import-input"
            />

            <button
              type="button"
              onClick={
                handleImportClick
              }
              disabled={importing}
              className="btn btn-secondary"
            >
              <Upload size={16} />

              {importing
                ? "Importing..."
                : "Import Excel"}
            </button>

            <button
              type="button"
              onClick={
                handleLabExport
              }
              className="btn btn-secondary"
            >
              <Download size={16} />
              Export Excel
            </button>

            <button
              type="button"
              onClick={
                openNewLabEntry
              }
              className="btn btn-primary"
            >
              <Plus size={16} />
              Add Entry
            </button>
          </div>
        </div>

        {/* Import result */}
        {lastImportResult && (
          <div className="import-summary">
            <strong>
              Last import:
            </strong>{" "}
            {lastImportResult.imported ||
              0}{" "}
            row(s) imported.

            {Number(
              lastImportResult.skipped || 0
            ) > 0 && (
              <>
                {" "}
                {
                  lastImportResult.skipped
                }{" "}
                row(s) skipped.
              </>
            )}

            {Array.isArray(
              lastImportResult.errors
            ) &&
              lastImportResult.errors
                .length > 0 && (
                <>
                  {" "}
                  First skipped row(s):{" "}
                  {lastImportResult.errors
                    .slice(0, 3)
                    .join(" ")}
                </>
              )}
          </div>
        )}

        {labLoading ? (
          <div className="card empty-state">
            Loading lab entries...
          </div>
        ) : (
          <CaredxLabTable
            entries={labEntries}
            onEdit={
              openEditLabEntry
            }
            onDelete={
              handleLabDelete
            }
          />
        )}

        {/* ================================================================
            EXPENSES
        ================================================================= */}

        <div className="section-header">
          <p className="section-title">
            Expenses
          </p>

          <button
            type="button"
            onClick={
              openNewExpense
            }
            className="btn btn-primary"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        {expensesLoading ? (
          <div className="card empty-state">
            Loading expenses...
          </div>
        ) : (
          <CaredxExpenseTable
            expenses={expenses}
            onEdit={
              openEditExpense
            }
            onDelete={
              handleExpenseDelete
            }
          />
        )}
      </main>

      {/* ================================================================
          LAB FORM
      ================================================================= */}

      <CaredxLabEntryForm
        open={labFormOpen}
        onClose={() =>
          setLabFormOpen(false)
        }
        onSaved={refetchAll}
        editingEntry={
          editingLabEntry
        }
      />

      {/* ================================================================
          EXPENSE FORM
      ================================================================= */}

      <CaredxExpenseForm
        open={expenseFormOpen}
        onClose={() =>
          setExpenseFormOpen(false)
        }
        onSaved={refetchAll}
        editingExpense={
          editingExpense
        }
      />
    </div>
  );
}