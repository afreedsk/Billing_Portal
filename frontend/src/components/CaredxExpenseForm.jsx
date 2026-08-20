import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  expense_date: today(),
  category: "",
  amount: "",
  remarks: "",
});

export default function CaredxExpenseForm({ open, onClose, onSaved, editingExpense }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingExpense) {
      setForm({
        expense_date: editingExpense.expense_date,
        category: editingExpense.category || "",
        amount: editingExpense.amount ?? "",
        remarks: editingExpense.remarks || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [editingExpense, open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category.trim()) {
      toast.error("Please enter an expense category.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        await api.put(`/caredx/expenses/${editingExpense.id}`, form);
        toast.success("Expense updated.");
      } else {
        await api.post("/caredx/expenses", form);
        toast.success("Expense added.");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.errors?.join(" ") || err.response?.data?.message || "Something went wrong.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{editingExpense ? "Edit Expense" : "New Expense"}</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="expense_date" value={form.expense_date} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Expenses Category</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Lab Chemicals, Syringe Box, etc."
              className="form-control"
              list="expense-category-suggestions"
            />
            <datalist id="expense-category-suggestions">
              <option value="Lab Chemicals" />
              <option value="Lab Equipment" />
              <option value="Syringe Box" />
              <option value="Sample Bottles" />
              <option value="Pamphlets Distribution" />
              <option value="Salaries" />
              <option value="Rent" />
              <option value="Utilities" />
              <option value="Maintenance" />
              <option value="Office Supplies" />
              <option value="Travel" />
              <option value="Training" />
              <option value="Insurance" />
              <option value="Licensing" />
              <option value="Other" />
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes about this expense"
              className="form-control"
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}