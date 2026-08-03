import React from "react";
import { Pencil, Trash2 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function CaredxExpenseTable({ expenses, onEdit, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="card empty-state">
        No expenses recorded for this filter. Click "Add Expense" to log one.
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Expenses Category</th>
            <th className="text-right">Expenses Amount</th>
            <th>Remarks</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td style={{ whiteSpace: "nowrap" }}>{exp.expense_date}</td>
              <td>{exp.category}</td>
              <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
              <td className="truncate" title={exp.remarks}>{exp.remarks || "—"}</td>
              <td>
                <div className="actions-cell">
                  <button onClick={() => onEdit(exp)} className="btn-icon" title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => onDelete(exp)} className="btn-icon btn-icon--danger" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
