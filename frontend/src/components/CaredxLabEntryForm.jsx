// frontend/src/components/CaredxLabEntryForm.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const NUMERIC_FIELDS = [
  "total_amount_paid",
  "cash",
  "online",
  "paid_to_other_labs",
  "rmp",
  "salaries_expense",
  "referral_amount",
  "sales",
];

const createEmptyForm = () => ({
  entry_date: today(),
  patient_name: "",
  test_name: "",
  employee_name: "",
  total_amount_paid: "",
  cash: "",
  online: "",
  paid_to_other_labs: "",
  rmp: "",
  salaries_expense: "",
  expense_details: "",
  referral_by: "",
  referral_amount: "",
  sales: "",
});

export default function CaredxLabEntryForm({ open, onClose, onSaved, editingEntry }) {
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);

  // Populate form whenever the modal opens (new entry) or the editing target changes
  useEffect(() => {
    if (!open) return;

    if (editingEntry) {
      setForm({
        entry_date: editingEntry.entry_date || today(),
        patient_name: editingEntry.patient_name || "",
        test_name: editingEntry.test_name || "",
        employee_name: editingEntry.employee_name || "",
        total_amount_paid:
          editingEntry.total_amount_paid != null ? String(editingEntry.total_amount_paid) : "",
        cash: editingEntry.cash != null ? String(editingEntry.cash) : "",
        online: editingEntry.online != null ? String(editingEntry.online) : "",
        paid_to_other_labs:
          editingEntry.paid_to_other_labs != null ? String(editingEntry.paid_to_other_labs) : "",
        rmp: editingEntry.rmp != null ? String(editingEntry.rmp) : "",
        salaries_expense:
          editingEntry.salaries_expense != null ? String(editingEntry.salaries_expense) : "",
        expense_details: editingEntry.expense_details || "",
        referral_by: editingEntry.referral_by || "",
        referral_amount:
          editingEntry.referral_amount != null ? String(editingEntry.referral_amount) : "",
        sales: editingEntry.sales != null ? String(editingEntry.sales) : "",
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [open, editingEntry]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.entry_date) {
      toast.error("Please select the entry date.");
      return;
    }
    if (!form.patient_name.trim()) {
      toast.error("Please enter the patient name.");
      return;
    }
    if (!form.test_name.trim()) {
      toast.error("Please enter the test name.");
      return;
    }

    const payload = { ...form };
    NUMERIC_FIELDS.forEach((field) => {
      const value = Number(payload[field]);
      payload[field] = Number.isFinite(value) ? value : 0;
    });

    setSaving(true);
    try {
      if (editingEntry) {
        await api.put(`/caredx/lab-entries/${editingEntry.id}`, payload);
        toast.success("Lab entry updated.");
      } else {
        await api.post("/caredx/lab-entries", payload);
        toast.success("Lab entry added.");
      }

      if (typeof onSaved === "function") {
        await onSaved();
      }
      onClose();
    } catch (error) {
      console.error("Caredx lab entry save error:", error);
      const errors = error.response?.data?.errors;
      const message = Array.isArray(errors)
        ? errors.join(" ")
        : error.response?.data?.message || "Something went wrong while saving the lab entry.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{editingEntry ? "Edit Lab Entry" : "New Lab Entry"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="entry_date"
                value={form.entry_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Employee Name</label>
              <input
                name="employee_name"
                value={form.employee_name}
                onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Patient Name</label>
              <input
                name="patient_name"
                value={form.patient_name}
                onChange={handleChange}
                placeholder="e.g. Ramesh Kumar"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Test Name</label>
              <input
                name="test_name"
                value={form.test_name}
                onChange={handleChange}
                placeholder="e.g. HLA Typing"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Amount Paid (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="total_amount_paid"
                value={form.total_amount_paid}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cash (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="cash"
                value={form.cash}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Online (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="online"
                value={form.online}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Paid to Other Labs (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="paid_to_other_labs"
                value={form.paid_to_other_labs}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">RMP (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="rmp"
                value={form.rmp}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salaries Expense (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="salaries_expense"
                value={form.salaries_expense}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Referral By</label>
              <input
                name="referral_by"
                value={form.referral_by}
                onChange={handleChange}
                placeholder="Optional"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Referral Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="referral_amount"
                value={form.referral_amount}
                onChange={handleChange}
                placeholder="0.00"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sales (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="sales"
              value={form.sales}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expense Details</label>
            <textarea
              name="expense_details"
              value={form.expense_details}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes about expenses tied to this entry"
              className="form-control"
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}