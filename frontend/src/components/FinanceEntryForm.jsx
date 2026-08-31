// frontend/src/components/FinanceEntryForm.jsx
import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let itemKeyCounter = 0;
const nextItemKey = () => {
  itemKeyCounter += 1;
  return `item-${Date.now()}-${itemKeyCounter}`;
};

const emptyItem = () => ({
  _key: nextItemKey(),
  item_name: "",
  quantity: "1",
  unit_price: "",
});

const emptyEmployee = () => ({
  _key: nextItemKey(),
  exec_department: "",
  employee_name: "",
  salary_amount: "",
  allowance_amount: "",
  total: 0,
  remarks: "",
});

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number);
};

const apiOrigin = (api.defaults.baseURL || "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const invoiceHref = (entry) => {
  if (!entry?.invoice_url) return null;
  const token = localStorage.getItem("token");
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  if (entry.invoice_url.startsWith("http://") || entry.invoice_url.startsWith("https://")) {
    return `${entry.invoice_url}${entry.invoice_url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  }
  return `${apiOrigin}${entry.invoice_url}${tokenParam}`;
};

// Department mapping for dropdown display (keys vs labels)
const DEPARTMENTS_CONFIG = [
  { label: "Corporate Management", value: "Corporate" },
  { label: "Office Administration", value: "Adminstrationfunctionalunit" },
  { label: "CareDx", value: "Caredx" },
  { label: "IT Development", value: "IT" },
  { label: "IT Sales", value: "IT Sales" },
  { label: "MedTech", value: "MedTech" },
  { label: "PCM", value: "PCM" },
  { label: "Research Development", value: "ResearchDevelopment" },
  { label: "Dental", value: "Dental" },
];

// Mapping for Office Administration category fields
const OFFICE_ADMIN_CATEGORY_FIELDS = {
  "Travel & Entertainment (T&E)": { showEmployeeName: true, showVehicleType: true, labelName: "Employee/Person Name", labelVehicle: "Transport/Travel Type", showPurpose: true },
  "Marketing": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Office Supplies & Equipment": { showEmployeeName: true, showVehicleType: false, labelName: "Asset/Item Name", showPurpose: true },
  "General Operations": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Innovation": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Miscellaneous": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Business Services Revenue": { showEmployeeName: true, showVehicleType: false, labelName: "Service Name", showPurpose: false },
  "Supplies & Equipment": { showEmployeeName: true, showVehicleType: false, labelName: "Item/Equipment Name", showPurpose: true },
  "Guest Concierge": { showEmployeeName: true, showVehicleType: false, labelName: "Guest/Person Name", showPurpose: true },
  "Facilities & Overhead": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Consulting": { showEmployeeName: true, showVehicleType: false, labelName: "Consultant/Company Name", showPurpose: true },
  "Management Fees": { showEmployeeName: true, showVehicleType: false, labelName: "Vendor/Company Name", showPurpose: true },
  "Other": { showEmployeeName: true, showVehicleType: false, labelName: "Name/Item", showPurpose: true },
  "Outsourced Services": { showEmployeeName: true, showVehicleType: false, labelName: "Vendor/Company Name", showPurpose: true },
  "Events-Conferences-Training": { showEmployeeName: true, showVehicleType: false, labelName: "Event/Training Name", showPurpose: true },
};

// Mapping for IT Development category fields
const IT_CATEGORY_FIELDS = {
  "Travel & Entertainment (T&E)": { showEmployeeName: true, showVehicleType: true, labelName: "Employee/Person Name", labelVehicle: "Transport/Travel Type", showPurpose: true },
  "Marketing": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Supplies & Equipments": { showEmployeeName: true, showVehicleType: false, labelName: "Item/Equipment Name", showPurpose: true },
  "General Operations": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Innovation": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Miscellaneous": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Business Services Revenue": { showEmployeeName: true, showVehicleType: false, labelName: "Service Name", showPurpose: false },
  "Guest Concierge": { showEmployeeName: true, showVehicleType: false, labelName: "Guest/Person Name", showPurpose: true },
  "Facilities & Overhead": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Outsourced Services": { showEmployeeName: true, showVehicleType: false, labelName: "Vendor/Company Name", showPurpose: true },
  "Events-Conferences-Training": { showEmployeeName: true, showVehicleType: false, labelName: "Event/Training Name", showPurpose: true },
  "Consulting": { showEmployeeName: true, showVehicleType: false, labelName: "Consultant/Company Name", showPurpose: true },
  "Management Fees": { showEmployeeName: true, showVehicleType: false, labelName: "Vendor/Company Name", showPurpose: true },
  "Other": { showEmployeeName: true, showVehicleType: false, labelName: "Name/Item", showPurpose: true },
};

// IT Sales category fields
const IT_SALES_CATEGORY_FIELDS = {
  // Expense categories
  "Travel & Entertainment (T&E)": {
    showEmployeeName: true,
    showVehicleType: true,
    labelName: "Employee/Person Name",
    labelVehicle: "Transport/Travel Type",
    showPurpose: true,
  },
  "Marketing": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Sales Enablement & Tech Stack": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Legal/Administrative Expenses": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Vendor/Person Name",
    showPurpose: true,
  },
  "Outsourced Services": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Vendor/Company Name",
    showPurpose: true,
  },
  "Facilities & Overhead": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Supplies & Equipments": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Item/Equipment Name",
    showPurpose: true,
  },
  "Guest Concierge": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Guest/Person Name",
    showPurpose: true,
  },
  "Events-Conferences-Training": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Event/Training Name",
    showPurpose: true,
  },
  "Business Services Revenue": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Service Name",
    showPurpose: false,
  },
  "Miscellaneous": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "General Operations": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Innovation": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Supplies and Equipments": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Item/Equipment Name",
    showPurpose: true,
  },
  "Consulting": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Consultant/Company Name",
    showPurpose: true,
  },
  "Management Fees": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Vendor/Company Name",
    showPurpose: true,
  },
  "Other": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Name/Item",
    showPurpose: true,
  },
  // Income categories
  "Hardware Sales": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Customer/Client Name",
    showPurpose: true,
  },
  "Professional Services & Implementation": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Service/Project Name",
    showPurpose: true,
  },
  "Software Licenses & SaaS Subscriptions": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Product/Service Name",
    showPurpose: true,
  },
  "Managed Services & Support (MSP)": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Client/Service Name",
    showPurpose: true,
  },
  "Hardware & Infrastructure Reselling": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Customer/Client Name",
    showPurpose: true,
  },
  "Support & Maintenance": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Client/Service Name",
    showPurpose: true,
  },
  "Internal allocations": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Department/Team Name",
    showPurpose: true,
  },
};

// UPDATED MedTech category fields – matches the new category list
const MEDTECH_CATEGORY_FIELDS = {
  // Expense categories
  "Travel & Entertainment (T&E)": {
    showEmployeeName: true,
    showVehicleType: true,
    labelName: "Employee/Person Name",
    labelVehicle: "Transport/Travel Type",
    showPurpose: true,
  },
  "Marketing": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Supplies & Equipments": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Item/Equipment Name",
    showPurpose: true,
  },
  "Facilities & Overhead": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "General Operations": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Innovation": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Supplies and Equipments": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Item/Equipment Name",
    showPurpose: true,
  },
  "Guest Concierge": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Guest/Person Name",
    showPurpose: true,
  },
  "Business Services Revenue": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Service Name",
    showPurpose: false,
  },
  "Miscellaneous": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Employee/Person Name",
    showPurpose: true,
  },
  "Outsourced Services": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Vendor/Company Name",
    showPurpose: true,
  },
  "Events-Conferences-Training": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Event/Training Name",
    showPurpose: true,
  },
  // Income categories
  "B2B Revenue": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Client/Business Name",
    showPurpose: true,
  },
  "B2C Revenue": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Customer/Client Name",
    showPurpose: true,
  },
  "Other": {
    showEmployeeName: true,
    showVehicleType: false,
    labelName: "Name/Item",
    showPurpose: true,
  },
};

// Mapping for PCM category fields (updated – removed Office Supplies & Equipment)
const PCM_CATEGORY_FIELDS = {
  // Expense categories
  "Personnel & Payroll": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Outsourced Services": { showEmployeeName: true, showVehicleType: false, labelName: "Vendor/Company Name", showPurpose: true },
  "Facilities & Overhead": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Marketing": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  // "Office Supplies & Equipment" REMOVED – no longer in PCM
  "Guest Concierge": { showEmployeeName: true, showVehicleType: false, labelName: "Guest/Person Name", showPurpose: true },
  "Events-Conferences-Training": { showEmployeeName: true, showVehicleType: false, labelName: "Event/Training Name", showPurpose: true },
  "Business Services Revenue": { showEmployeeName: true, showVehicleType: false, labelName: "Service Name", showPurpose: false },
  "Miscellaneous": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "General Operations": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Innovation": { showEmployeeName: true, showVehicleType: false, labelName: "Employee/Person Name", showPurpose: true },
  "Supplies & Equipment": { showEmployeeName: true, showVehicleType: false, labelName: "Item/Equipment Name", showPurpose: true },
  "Other": { showEmployeeName: true, showVehicleType: false, labelName: "Name/Item", showPurpose: true },
  // Income categories (no special fields – fallback to standard)
};

export default function FinanceEntryForm({
  open,
  onClose,
  onSaved,
  department,
  options,
  editingEntry,
}) {
  const apiBase = String(department || "").toLowerCase().replace(/\s/g, '');

  const isOfficeAdmin = department === "Adminstrationfunctionalunit";
  const isIT = department === "IT";
  const isITSales = department === "IT Sales";
  const isMedTech = department === "MedTech";
  const isPCM = department === "PCM";
  const salaryCategoryName = options?.is_salary_category || "Payroll Salaries";

  const createEmptyForm = () => ({
    entry_type: "Income",
    category: options?.categories?.Income?.[0] || "",
    sub_category: "",
    generated_by: "",
    revenue_type: options?.revenue_types?.[0] || "",
    patient_name: "",
    patient_place: "",
    client_name: "",
    gst_number: "",
    gst_tax_percent: "",
    tax_invoice_number: "",
    amount: "",
    remarks: "",
    entry_date: today(),
    exec_department: "",
    employee_name: "",
    salary_amount: "",
    allowance_amount: "",
    vehicle_type: "",
    team: "",
  });

  const [form, setForm] = useState(createEmptyForm());
  const [otherCategory, setOtherCategory] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [removeInvoice, setRemoveInvoice] = useState(false);
  const [saving, setSaving] = useState(false);

  // Multi-employee state for Payroll Salaries (for any dept that supports it)
  const [employees, setEmployees] = useState([emptyEmployee()]);

  // Determine if current category is the salary category (for any dept)
  const isSalaryCategory = !isOfficeAdmin && !isIT && !isITSales && !isMedTech && !isPCM && form.category === salaryCategoryName;

  // For IT, we may have special fields (but salary is disabled)
  const itFieldConfig = isIT ? IT_CATEGORY_FIELDS[form.category] : null;
  const showITFields = isIT && itFieldConfig && form.category !== salaryCategoryName;
  const isITSalaryCategory = isIT && form.category === salaryCategoryName;

  // For IT Sales, we may have special fields (but salary is disabled)
  const itSalesFieldConfig = isITSales ? IT_SALES_CATEGORY_FIELDS[form.category] : null;
  const showITSalesFields = isITSales && itSalesFieldConfig && form.category !== salaryCategoryName;
  const isITSalesSalaryCategory = isITSales && form.category === salaryCategoryName;

  // For MedTech, we may have special fields (but salary is disabled)
  const medTechFieldConfig = isMedTech ? MEDTECH_CATEGORY_FIELDS[form.category] : null;
  const showMedTechFields = isMedTech && medTechFieldConfig && form.category !== salaryCategoryName;
  const isMedTechSalaryCategory = isMedTech && form.category === salaryCategoryName;

  // For PCM, we may have special fields (but salary is disabled)
  const pcmFieldConfig = isPCM ? PCM_CATEGORY_FIELDS[form.category] : null;
  const showPCMFields = isPCM && pcmFieldConfig && form.category !== salaryCategoryName;
  const isPCMSalaryCategory = isPCM && form.category === salaryCategoryName;

  // For Office Admin, we may have special fields – must be declared before usingCategoryFields
  const officeFieldConfig = isOfficeAdmin ? OFFICE_ADMIN_CATEGORY_FIELDS[form.category] : null;
  const showOfficeFields = isOfficeAdmin && officeFieldConfig;

  // Determine if using category-specific fields (skip items validation)
  const usingCategoryFields = showOfficeFields || showITFields || showITSalesFields || showMedTechFields || showPCMFields;

  useEffect(() => {
    if (!open) return;

    // Helper to populate the form from an entry
    const populateForm = (entry) => {
      const categoryList = options?.categories?.[entry.entry_type] || [];
      const isCustomCategory = categoryList.includes("Others") && !categoryList.includes(entry.category);

      setForm({
        entry_type: entry.entry_type || "Income",
        category: isCustomCategory ? "Others" : entry.category || "",
        sub_category: entry.sub_category || "",
        generated_by: entry.generated_by || "",
        revenue_type: entry.revenue_type || options?.revenue_types?.[0] || "",
        patient_name: entry.patient_name || "",
        patient_place: entry.patient_place || "",
        client_name: entry.client_name || "",
        gst_number: entry.gst_number || "",
        gst_tax_percent: entry.gst_tax_percent !== undefined && entry.gst_tax_percent !== null ? String(entry.gst_tax_percent) : "",
        tax_invoice_number: entry.tax_invoice_number || "",
        amount: entry.amount !== undefined && entry.amount !== null ? String(entry.amount) : "",
        remarks: entry.remarks || "",
        entry_date: entry.entry_date || today(),
        exec_department: entry.exec_department || "",
        employee_name: entry.employee_name || "",
        salary_amount: entry.salary_amount !== undefined && entry.salary_amount !== null ? String(entry.salary_amount) : "",
        allowance_amount: entry.allowance_amount !== undefined && entry.allowance_amount !== null ? String(entry.allowance_amount) : "",
        vehicle_type: entry.vehicle_type || "",
        team: entry.team || "",
      });
      setOtherCategory(isCustomCategory ? entry.category : "");
      if (Array.isArray(entry.items) && entry.items.length > 0) {
        setItems(entry.items.map((item) => ({
          _key: nextItemKey(),
          item_name: item.item_name || "",
          quantity: String(item.quantity ?? "1"),
          unit_price: String(item.unit_price ?? ""),
        })));
      } else {
        setItems([emptyItem()]);
      }
      setEmployees([emptyEmployee()]);
      setInvoiceFile(null);
      setRemoveInvoice(false);
    };

    // If we have editingEntry, populate immediately (even without options)
    if (editingEntry) {
      populateForm(editingEntry);
    } else {
      // New entry: reset to empty
      setForm(createEmptyForm());
      setOtherCategory("");
      setItems([emptyItem()]);
      setEmployees([emptyEmployee()]);
      setInvoiceFile(null);
      setRemoveInvoice(false);
    }

    // When options finally load, re‑populate to pick up any dropdown defaults
    // (but only if we are still editing the same entry)
    if (options && editingEntry) {
      // Re‑run to set correct revenue_type, etc.
      populateForm(editingEntry);
    }
  }, [editingEntry, open, options]);

  if (!open || !options) return null;

  const categoryOptionsForType = options?.categories?.[form.entry_type] || [];
  const revenueTypes = options?.revenue_types || [];
  const gstRequired = (options?.gst_required_categories || []).includes(form.category);
  const isOthersCategory = form.category === "Others";

  // Office Admin salary restriction
  const isOfficeAdminSalary = isOfficeAdmin && form.category === salaryCategoryName;

  const handleTypeChange = (event) => {
    const newType = event.target.value;
    const firstCategory = options?.categories?.[newType]?.[0] || "";
    setForm((prev) => ({ ...prev, entry_type: newType, category: firstCategory }));
    setOtherCategory("");
    if (!isSalaryCategory) setEmployees([emptyEmployee()]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, category: value }));
    if (value !== "Others") setOtherCategory("");
    // Reset employees if not salary
    if (value !== salaryCategoryName) {
      setEmployees([emptyEmployee()]);
    } else {
      if (employees.length === 0) setEmployees([emptyEmployee()]);
    }
  };

  // Employee handlers (for salary)
  const handleEmployeeChange = (key, field, value) => {
    setEmployees(prev =>
      prev.map(emp => {
        if (emp._key !== key) return emp;
        const updated = { ...emp, [field]: value };
        if (field === "salary_amount" || field === "allowance_amount") {
          const sal = parseFloat(updated.salary_amount) || 0;
          const allow = parseFloat(updated.allowance_amount) || 0;
          updated.total = sal + allow;
        }
        return updated;
      })
    );
  };

  const handleAddEmployee = () => setEmployees(prev => [...prev, emptyEmployee()]);
  const handleRemoveEmployee = (key) => {
    if (employees.length === 1) {
      toast.error("At least one employee is required.");
      return;
    }
    setEmployees(prev => prev.filter(emp => emp._key !== key));
  };

  // Item handlers
  const handleItemChange = (key, field, value) => {
    setItems(prev =>
      prev.map(item => {
        if (item._key !== key) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, emptyItem()]);
  };

  const handleRemoveItem = (key) => {
    if (items.length === 1) {
      toast.error("At least one item is required.");
      return;
    }
    setItems(prev => prev.filter(item => item._key !== key));
  };

  const salaryTotal = employees.reduce((sum, emp) => sum + (emp.total || 0), 0);

  const itemsTotal = options?.show_items
    ? items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return sum + qty * price;
      }, 0)
    : 0;

  const baseAmount = isSalaryCategory ? salaryTotal : (options?.show_items && !usingCategoryFields ? itemsTotal : Number(form.amount) || 0);
  const gstTaxPercentValue = Number(form.gst_tax_percent) || 0;
  const gstTaxAmount = options?.show_gst_tax ? Number(((baseAmount * gstTaxPercentValue) / 100).toFixed(2)) : 0;
  const grandTotal = Number((baseAmount + gstTaxAmount).toFixed(2));

  const handleInvoiceChange = (event) => {
    const file = event.target.files?.[0] || null;
    setInvoiceFile(file);
    setRemoveInvoice(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.entry_date) {
      toast.error("Please select the entry date.");
      return;
    }
    if (!form.category) {
      toast.error("Please select a category.");
      return;
    }

    // Office Admin: salary category is forbidden
    if (isOfficeAdmin && form.category === salaryCategoryName) {
      toast.error("Salary must be entered by Corporate Management only.");
      return;
    }

    // IT: salary category is disabled
    if (isITSalaryCategory) {
      toast.error("Salaries must be entered by Corporate Management only.");
      return;
    }

    // IT Sales: salary category is disabled
    if (isITSalesSalaryCategory) {
      toast.error("Salaries must be entered by Corporate Management only.");
      return;
    }

    // MedTech: salary category is disabled
    if (isMedTechSalaryCategory) {
      toast.error("Salaries must be entered by Corporate Management only.");
      return;
    }

    // PCM: salary category is disabled
    if (isPCMSalaryCategory) {
      toast.error("Salaries must be entered by Corporate Management only.");
      return;
    }

    // Salary category validation (for other depts that have it)
    if (isSalaryCategory) {
      let valid = true;
      for (const emp of employees) {
        if (!emp.exec_department) {
          toast.error("Please select a department for all employees.");
          valid = false;
          break;
        }
        if (!emp.employee_name.trim()) {
          toast.error("Please enter employee name for all employees.");
          valid = false;
          break;
        }
        const sal = parseFloat(emp.salary_amount) || 0;
        const allow = parseFloat(emp.allowance_amount) || 0;
        if (sal <= 0 && allow <= 0) {
          toast.error(`For ${emp.employee_name || 'employee'}, at least one of Salary or TADA must be greater than 0.`);
          valid = false;
          break;
        }
      }
      if (!valid) return;
      return submitSalaryEntries();
    }

    // Office Admin specific validations
    if (isOfficeAdmin && officeFieldConfig) {
      if (officeFieldConfig.showEmployeeName && !form.employee_name.trim()) {
        toast.error(`Please enter ${officeFieldConfig.labelName || 'name'}.`);
        return;
      }
      if (officeFieldConfig.showVehicleType && !form.vehicle_type.trim()) {
        toast.error(`Please enter ${officeFieldConfig.labelVehicle || 'vehicle type'}.`);
        return;
      }
      if (officeFieldConfig.showPurpose && !form.remarks.trim()) {
        toast.error("Please enter the purpose.");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    // IT specific validations (excluding salary)
    if (isIT && showITFields) {
      if (itFieldConfig.showEmployeeName && !form.employee_name.trim()) {
        toast.error(`Please enter ${itFieldConfig.labelName || 'name'}.`);
        return;
      }
      if (itFieldConfig.showVehicleType && !form.vehicle_type.trim()) {
        toast.error(`Please enter ${itFieldConfig.labelVehicle || 'vehicle type'}.`);
        return;
      }
      if (itFieldConfig.showPurpose && !form.remarks.trim()) {
        toast.error("Please enter the purpose.");
        return;
      }
      if (!form.remarks.trim()) {
        toast.error("Remarks are required.");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    // IT Sales specific validations (excluding salary)
    if (isITSales && showITSalesFields) {
      if (itSalesFieldConfig.showEmployeeName && !form.employee_name.trim()) {
        toast.error(`Please enter ${itSalesFieldConfig.labelName || 'name'}.`);
        return;
      }
      if (itSalesFieldConfig.showVehicleType && !form.vehicle_type.trim()) {
        toast.error(`Please enter ${itSalesFieldConfig.labelVehicle || 'vehicle type'}.`);
        return;
      }
      if (itSalesFieldConfig.showPurpose && !form.remarks.trim()) {
        toast.error("Please enter the purpose.");
        return;
      }
      if (!form.remarks.trim()) {
        toast.error("Remarks are required.");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
      // Additional validation for Income: generated_by is required
      if (form.entry_type === "Income" && !form.generated_by.trim()) {
        toast.error("Please enter the employee name (Generated By) for Income entries.");
        return;
      }
    }

    // MedTech specific validations (excluding salary)
    if (isMedTech && showMedTechFields) {
      if (medTechFieldConfig.showEmployeeName && !form.employee_name.trim()) {
        toast.error(`Please enter ${medTechFieldConfig.labelName || 'name'}.`);
        return;
      }
      if (medTechFieldConfig.showVehicleType && !form.vehicle_type.trim()) {
        toast.error(`Please enter ${medTechFieldConfig.labelVehicle || 'vehicle type'}.`);
        return;
      }
      if (medTechFieldConfig.showPurpose && !form.remarks.trim()) {
        toast.error("Please enter the purpose.");
        return;
      }
      if (!form.remarks.trim()) {
        toast.error("Remarks are required.");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    // PCM specific validations (excluding salary)
    if (isPCM && showPCMFields) {
      if (pcmFieldConfig.showEmployeeName && !form.employee_name.trim()) {
        toast.error(`Please enter ${pcmFieldConfig.labelName || 'name'}.`);
        return;
      }
      if (pcmFieldConfig.showVehicleType && !form.vehicle_type.trim()) {
        toast.error(`Please enter ${pcmFieldConfig.labelVehicle || 'vehicle type'}.`);
        return;
      }
      if (pcmFieldConfig.showPurpose && !form.remarks.trim()) {
        toast.error("Please enter the purpose.");
        return;
      }
      if (!form.remarks.trim()) {
        toast.error("Remarks are required.");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    // Non-salary, non-office-admin, non-IT, non-IT Sales, non-MedTech, non-PCM validations (standard)
    // Skip these when using category-specific fields
    if (!isOfficeAdmin && !isIT && !isITSales && !isMedTech && !isPCM && !usingCategoryFields && options.show_generated_by && !form.generated_by.trim()) {
      toast.error("Please enter the employee name (Generated By).");
      return;
    }
    if (!usingCategoryFields && options.show_patient_fields && !form.patient_name.trim()) {
      toast.error("Please enter the patient name.");
      return;
    }
    if (options.show_gst_number && gstRequired && !form.gst_number.trim()) {
      toast.error(`GST Number is required for ${form.category} entries.`);
      return;
    }
    if (isOthersCategory && !otherCategory.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    let cleanItems = [];
    if (options.show_items && !usingCategoryFields) {
      cleanItems = items
        .map((item) => {
          const qty = Number(item.quantity);
          const price = Number(item.unit_price);
          return { item_name: item.item_name.trim(), quantity: qty, unit_price: price };
        })
        .filter((item) => item.item_name);
      if (cleanItems.length === 0) {
        toast.error("Add at least one item.");
        return;
      }
    } else {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    submitSingleEntry();
  };

  const submitSingleEntry = async () => {
    setSaving(true);
    try {
      let body;
      let config = {};

      if (options.show_invoice) {
        const formData = new FormData();
        Object.keys(form).forEach(key => {
          if (form[key] !== null && form[key] !== undefined) {
            formData.append(key, form[key]);
          }
        });
        if (isOthersCategory) formData.append("other_category", otherCategory.trim());
        if (isOfficeAdmin) {
          formData.append("employee_name", form.employee_name || "");
          formData.append("vehicle_type", form.vehicle_type || "");
        }
        if (isIT && showITFields) {
          formData.append("employee_name", form.employee_name || "");
          formData.append("purpose", form.purpose || "");
          formData.append("vehicle_type", form.vehicle_type || "");
        }
        if (isITSales && showITSalesFields) {
          formData.append("employee_name", form.employee_name || "");
          formData.append("purpose", form.purpose || "");
          formData.append("vehicle_type", form.vehicle_type || "");
          formData.append("client_name", form.client_name || "");
          formData.append("gst_number", form.gst_number || "");
          formData.append("generated_by", form.generated_by || "");
        }
        if (isMedTech && showMedTechFields) {
          formData.append("employee_name", form.employee_name || "");
          formData.append("purpose", form.purpose || "");
          formData.append("vehicle_type", form.vehicle_type || "");
        }
        if (isPCM && showPCMFields) {
          formData.append("employee_name", form.employee_name || "");
          formData.append("purpose", form.purpose || "");
          formData.append("vehicle_type", form.vehicle_type || "");
        }
        if (options.show_items && !usingCategoryFields) {
          formData.append("items", JSON.stringify(cleanItems));
          formData.append("amount", itemsTotal);
        } else {
          formData.append("amount", parseFloat(form.amount) || 0);
        }
        if (invoiceFile) formData.append("invoice", invoiceFile);
        // Include team for IT Sales
        if (isITSales) {
          formData.append("team", form.team || "");
        }
        body = formData;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        body = { ...form };
        body.amount = parseFloat(form.amount) || 0;
        if (isOthersCategory) body.other_category = otherCategory.trim();
        if (isOfficeAdmin) {
          body.employee_name = form.employee_name || null;
          body.vehicle_type = form.vehicle_type || null;
        }
        if (isIT && showITFields) {
          body.employee_name = form.employee_name || null;
          body.purpose = form.purpose || null;
          body.vehicle_type = form.vehicle_type || null;
        }
        if (isITSales && showITSalesFields) {
          body.employee_name = form.employee_name || null;
          body.purpose = form.purpose || null;
          body.vehicle_type = form.vehicle_type || null;
          // client_name, gst_number, generated_by already in form
        }
        if (isMedTech && showMedTechFields) {
          body.employee_name = form.employee_name || null;
          body.purpose = form.purpose || null;
          body.vehicle_type = form.vehicle_type || null;
        }
        if (isPCM && showPCMFields) {
          body.employee_name = form.employee_name || null;
          body.purpose = form.purpose || null;
          body.vehicle_type = form.vehicle_type || null;
        }
        // Include team for IT Sales
        if (isITSales) {
          body.team = form.team || null;
        }
        if (!options.show_generated_by) delete body.generated_by;
        if (!options.show_revenue_type) delete body.revenue_type;
        if (!options.show_patient_fields) {
          delete body.patient_name;
          delete body.patient_place;
        }
        if (!options.show_client_name) delete body.client_name;
        if (!options.show_gst_number) delete body.gst_number;
        if (!options.show_gst_tax) delete body.gst_tax_percent;
        if (!options.show_tax_invoice_number) delete body.tax_invoice_number;
        if (options.show_items && !usingCategoryFields) {
          body.items = cleanItems;
          body.amount = itemsTotal;
        } else {
          body.amount = form.amount;
          delete body.items;
        }
        if (removeInvoice && editingEntry) {
          body.remove_invoice = "true";
        }
      }

      const url = `/${apiBase}/entries`;
      if (editingEntry) {
        await api.put(`${url}/${editingEntry.id}`, body, config);
        toast.success("Entry updated successfully.");
      } else {
        await api.post(url, body, config);
        toast.success("Entry added successfully.");
      }
      if (typeof onSaved === "function") await onSaved();
      onClose();
    } catch (error) {
      console.error("Finance entry error:", error);
      const errors = error.response?.data?.errors;
      const message = Array.isArray(errors)
        ? errors.join(" ")
        : error.response?.data?.message || "Something went wrong while saving the entry.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const submitSalaryEntries = async () => {
    setSaving(true);
    try {
      const payload = {
        entries: employees.map(emp => ({
          exec_department: emp.exec_department,
          employee_name: emp.employee_name.trim(),
          salary_amount: parseFloat(emp.salary_amount) || 0,
          allowance_amount: parseFloat(emp.allowance_amount) || 0,
          remarks: emp.remarks || "",
          entry_date: form.entry_date,
        }))
      };
      const url = `/${apiBase}/entries`;
      await api.post(url, payload);
      toast.success(`Added ${payload.entries.length} salary entries.`);
      if (typeof onSaved === "function") await onSaved();
      onClose();
    } catch (error) {
      console.error("Salary entry error:", error);
      const errors = error.response?.data?.errors;
      const message = Array.isArray(errors)
        ? errors.join(" ")
        : error.response?.data?.message || "Something went wrong while saving salary entries.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Render function for standard fields (used as fallback for departments without special config)
  const renderStandardFields = () => {
    return (
      <>
        {options.show_client_name && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input name="client_name" value={form.client_name} onChange={handleChange} placeholder="Enter the client name" className="form-control" />
            </div>
            {options.show_gst_number && (
              <div className="form-group">
                <label className="form-label">GST Number {gstRequired ? `(required for ${form.category})` : "(optional)"}</label>
                <input name="gst_number" value={form.gst_number} onChange={handleChange} placeholder="e.g. 22AAAAA0000A1Z5" className="form-control" />
              </div>
            )}
          </div>
        )}

        {(options.show_gst_tax || options.show_tax_invoice_number) && (
          <div className="form-row">
            {options.show_gst_tax && (
              <div className="form-group">
                <label className="form-label">GST Tax (%)</label>
                <input type="number" min="0" max="100" step="0.01" name="gst_tax_percent" value={form.gst_tax_percent} onChange={handleChange} placeholder="e.g. 18" className="form-control" />
              </div>
            )}
            {options.show_tax_invoice_number && (
              <div className="form-group">
                <label className="form-label">Tax Invoice Number</label>
                <input name="tax_invoice_number" value={form.tax_invoice_number} onChange={handleChange} placeholder="e.g. INV-2026-0142" className="form-control" />
              </div>
            )}
          </div>
        )}

        {options.show_patient_fields && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Patient Name</label>
              <input name="patient_name" value={form.patient_name} onChange={handleChange} placeholder="e.g. Ramesh Kumar" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Patient Place</label>
              <input name="patient_place" value={form.patient_place} onChange={handleChange} placeholder="e.g. Guntur" className="form-control" />
            </div>
          </div>
        )}

        {(options.show_generated_by || options.show_revenue_type) && (
          <div className="form-row">
            {options.show_generated_by && (
              <div className="form-group">
                <label className="form-label">Generated By</label>
                <input name="generated_by" value={form.generated_by} onChange={handleChange} placeholder="e.g. John Mathew" className="form-control" />
              </div>
            )}
            {options.show_revenue_type && (
              <div className="form-group">
                <label className="form-label">Revenue Type</label>
                <select name="revenue_type" value={form.revenue_type} onChange={handleChange} className="form-control">
                  {revenueTypes.map((rt) => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {options.show_items && (
          <div className="form-group">
            <label className="form-label">Items</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item) => (
                <div key={item._key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 32px", gap: 8, alignItems: "center" }}>
                  <input value={item.item_name} onChange={(e) => handleItemChange(item._key, "item_name", e.target.value)} placeholder="Item name" className="form-control" />
                  <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(item._key, "quantity", e.target.value)} placeholder="Qty" className="form-control" />
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(item._key, "unit_price", e.target.value)} placeholder="Unit price" className="form-control" />
                  <button type="button" className="btn-icon btn-icon--danger" onClick={() => handleRemoveItem(item._key)} title="Remove item" disabled={items.length === 1}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={15} /> Add New Item
            </button>
            <div style={{ marginTop: 12, textAlign: "right" }}>
              {options.show_gst_tax ? (
                <>
                  <div style={{ fontSize: 13, color: "var(--color-ink-500)" }}>Subtotal: {formatCurrency(baseAmount)}</div>
                  <div style={{ fontSize: 13, color: "var(--color-ink-500)" }}>GST Tax ({gstTaxPercentValue || 0}%): {formatCurrency(gstTaxAmount)}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>Total Amount: {formatCurrency(grandTotal)}</div>
                </>
              ) : (
                <div style={{ fontWeight: 600 }}>Total Amount: {formatCurrency(itemsTotal)}</div>
              )}
            </div>
          </div>
        )}

        {!options.show_items && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} className="form-control" />
            </div>
          </div>
        )}

        {!options.show_items && options.show_gst_tax && (
          <p className="text-muted" style={{ textAlign: "right", fontSize: 13, marginTop: -8 }}>
            GST Tax ({gstTaxPercentValue || 0}%): {formatCurrency(gstTaxAmount)}
            {" · "}
            <strong style={{ color: "var(--color-ink-800)" }}>Total: {formatCurrency(grandTotal)}</strong>
          </p>
        )}

        {options.show_invoice && (
          <div className="form-group">
            <label className="form-label">Invoice</label>
            {editingEntry && editingEntry.invoice_url && !removeInvoice && (
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <a href={invoiceHref(editingEntry)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FileText size={15} /> <span>View current invoice</span>
                </a>
                <button type="button" className="btn-icon btn-icon--danger" onClick={() => setRemoveInvoice(true)} title="Remove invoice">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
            {removeInvoice && <p className="text-muted" style={{ marginBottom: 8, fontSize: 13 }}>Current invoice will be removed when you save.</p>}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" onChange={handleInvoiceChange} className="form-control" />
            <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Accepted: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX.</p>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={3} placeholder="Optional notes about this entry" className="form-control" />
        </div>
      </>
    );
  };

  // Render function for Office Admin category fields
  const renderOfficeAdminFields = () => {
    if (!showOfficeFields) return null;
    const config = officeFieldConfig;
    return (
      <>
        {config.showEmployeeName && (
          <div className="form-group">
            <label className="form-label">{config.labelName || "Name"}</label>
            <input
              name="employee_name"
              value={form.employee_name || ""}
              onChange={handleChange}
              placeholder={`Enter ${config.labelName || "name"}`}
              className="form-control"
            />
          </div>
        )}
        {config.showVehicleType && (
          <div className="form-group">
            <label className="form-label">{config.labelVehicle || "Vehicle Type"}</label>
            <input
              name="vehicle_type"
              value={form.vehicle_type || ""}
              onChange={handleChange}
              placeholder="e.g. Car, Bike, Cab"
              className="form-control"
            />
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>
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
        </div>
        {config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Purpose / Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Enter purpose or additional notes"
              className="form-control"
            />
          </div>
        )}
        {!config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes"
              className="form-control"
            />
          </div>
        )}
      </>
    );
  };

  // Render function for IT category fields
  const renderITFields = () => {
    if (!showITFields) return null;
    const config = itFieldConfig;
    return (
      <>
        {config.showEmployeeName && (
          <div className="form-group">
            <label className="form-label">{config.labelName || "Name"}</label>
            <input
              name="employee_name"
              value={form.employee_name || ""}
              onChange={handleChange}
              placeholder={`Enter ${config.labelName || "name"}`}
              className="form-control"
            />
          </div>
        )}
        {config.showVehicleType && (
          <div className="form-group">
            <label className="form-label">{config.labelVehicle || "Vehicle Type"}</label>
            <input
              name="vehicle_type"
              value={form.vehicle_type || ""}
              onChange={handleChange}
              placeholder="e.g. Car, Bike, Cab"
              className="form-control"
            />
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>
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
        </div>
        {config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input
              name="purpose"
              value={form.purpose || ""}
              onChange={handleChange}
              placeholder="Brief purpose"
              className="form-control"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Remarks <span style={{ color: "red" }}>*</span></label>
          <textarea
            name="remarks"
            value={form.remarks || ""}
            onChange={handleChange}
            rows={3}
            placeholder="Detailed remarks (required)"
            className="form-control"
            required
          />
        </div>
      </>
    );
  };

  // UPDATED renderITSalesFields with generated_by
  const renderITSalesFields = () => {
    if (!showITSalesFields) return null;
    const config = itSalesFieldConfig;
    return (
      <>
        {config.showEmployeeName && (
          <div className="form-group">
            <label className="form-label">{config.labelName || "Name"}</label>
            <input
              name="employee_name"
              value={form.employee_name || ""}
              onChange={handleChange}
              placeholder={`Enter ${config.labelName || "name"}`}
              className="form-control"
            />
          </div>
        )}
        {config.showVehicleType && (
          <div className="form-group">
            <label className="form-label">{config.labelVehicle || "Vehicle Type"}</label>
            <input
              name="vehicle_type"
              value={form.vehicle_type || ""}
              onChange={handleChange}
              placeholder="e.g. Car, Bike, Cab"
              className="form-control"
            />
          </div>
        )}

        {/* generated_by field - required for Income */}
        <div className="form-group">
          <label className="form-label">Generated By {form.entry_type === "Income" && <span style={{ color: "red" }}>*</span>}</label>
          <input
            name="generated_by"
            value={form.generated_by || ""}
            onChange={handleChange}
            placeholder="Enter employee name"
            className="form-control"
          />
        </div>

        {/* Client Name and GST Number fields */}
        <div className="form-row">
          {options.show_client_name && (
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input
                name="client_name"
                value={form.client_name || ""}
                onChange={handleChange}
                placeholder="Enter the client name"
                className="form-control"
              />
            </div>
          )}
          {options.show_gst_number && (
            <div className="form-group">
              <label className="form-label">
                GST Number {gstRequired ? `(required for ${form.category})` : "(optional)"}
              </label>
              <input
                name="gst_number"
                value={form.gst_number || ""}
                onChange={handleChange}
                placeholder="e.g. 22AAAAA0000A1Z5"
                className="form-control"
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>
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
        </div>
        {config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input
              name="purpose"
              value={form.purpose || ""}
              onChange={handleChange}
              placeholder="Brief purpose"
              className="form-control"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Remarks <span style={{ color: "red" }}>*</span></label>
          <textarea
            name="remarks"
            value={form.remarks || ""}
            onChange={handleChange}
            rows={3}
            placeholder="Detailed remarks (required)"
            className="form-control"
            required
          />
        </div>
      </>
    );
  };

  // Render function for MedTech category fields
  const renderMedTechFields = () => {
    if (!showMedTechFields) return null;
    const config = medTechFieldConfig;
    return (
      <>
        {config.showEmployeeName && (
          <div className="form-group">
            <label className="form-label">{config.labelName || "Name"}</label>
            <input
              name="employee_name"
              value={form.employee_name || ""}
              onChange={handleChange}
              placeholder={`Enter ${config.labelName || "name"}`}
              className="form-control"
            />
          </div>
        )}
        {config.showVehicleType && (
          <div className="form-group">
            <label className="form-label">{config.labelVehicle || "Vehicle Type"}</label>
            <input
              name="vehicle_type"
              value={form.vehicle_type || ""}
              onChange={handleChange}
              placeholder="e.g. Car, Bike, Cab"
              className="form-control"
            />
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>
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
        </div>
        {config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input
              name="purpose"
              value={form.purpose || ""}
              onChange={handleChange}
              placeholder="Brief purpose"
              className="form-control"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Remarks <span style={{ color: "red" }}>*</span></label>
          <textarea
            name="remarks"
            value={form.remarks || ""}
            onChange={handleChange}
            rows={3}
            placeholder="Detailed remarks (required)"
            className="form-control"
            required
          />
        </div>
      </>
    );
  };

  // Render function for PCM category fields
  const renderPCMFields = () => {
    if (!showPCMFields) return null;
    const config = pcmFieldConfig;
    return (
      <>
        {config.showEmployeeName && (
          <div className="form-group">
            <label className="form-label">{config.labelName || "Name"}</label>
            <input
              name="employee_name"
              value={form.employee_name || ""}
              onChange={handleChange}
              placeholder={`Enter ${config.labelName || "name"}`}
              className="form-control"
            />
          </div>
        )}
        {config.showVehicleType && (
          <div className="form-group">
            <label className="form-label">{config.labelVehicle || "Vehicle Type"}</label>
            <input
              name="vehicle_type"
              value={form.vehicle_type || ""}
              onChange={handleChange}
              placeholder="e.g. Car, Bike, Cab"
              className="form-control"
            />
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="form-control"
            />
          </div>
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
        </div>
        {config.showPurpose && (
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input
              name="purpose"
              value={form.purpose || ""}
              onChange={handleChange}
              placeholder="Brief purpose"
              className="form-control"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Remarks <span style={{ color: "red" }}>*</span></label>
          <textarea
            name="remarks"
            value={form.remarks || ""}
            onChange={handleChange}
            rows={3}
            placeholder="Detailed remarks (required)"
            className="form-control"
            required
          />
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{editingEntry ? "Edit Finance Entry" : "New Finance Entry"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Department</label>
            <input value={department || ""} disabled className="form-control" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select name="entry_type" value={form.entry_type} onChange={handleTypeChange} className="form-control">
                {(options.entry_types || []).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" value={form.category} onChange={handleCategoryChange} className="form-control">
                {categoryOptionsForType
                  .filter(cat => !(isOfficeAdmin && cat === salaryCategoryName))
                  .map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            </div>
          </div>

          {isOthersCategory && (
            <div className="form-group">
              <label className="form-label">Other Category Name</label>
              <input value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} placeholder="Enter a category name" className="form-control" />
            </div>
          )}

          {/* Office Admin: Salary category message */}
          {isOfficeAdmin && form.category === salaryCategoryName && (
            <div className="alert alert-info" style={{ background: "#f0f0ff", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <strong>⚠️ Salary must be entered by Corporate Management only.</strong>
              <p style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                Please use the Corporate Management dashboard to add salary records for Office Administration employees.
              </p>
            </div>
          )}

          {/* Team field for IT Sales */}
          {isITSales && !isITSalesSalaryCategory && (
            <div className="form-group">
              <label className="form-label">Team</label>
              <input
                name="team"
                value={form.team || ""}
                onChange={handleChange}
                placeholder="e.g. Sales Team, Enterprise Sales, B2B Team"
                className="form-control"
              />
            </div>
          )}

          {/* IT: Salary category message */}
          {isITSalaryCategory && (
            <div className="alert alert-info" style={{ background: "#f0f0ff", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <strong>⚠️ Salaries must be entered by Corporate Management only.</strong>
              <p style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                Please use the Corporate Management dashboard to add salary records for IT Development employees.
              </p>
            </div>
          )}

          {/* IT Sales: Salary category message */}
          {isITSalesSalaryCategory && (
            <div className="alert alert-info" style={{ background: "#f0f0ff", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <strong>⚠️ Salaries must be entered by Corporate Management only.</strong>
              <p style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                Please use the Corporate Management dashboard to add salary records for IT Sales employees.
              </p>
            </div>
          )}

          {/* MedTech: Salary category message */}
          {isMedTechSalaryCategory && (
            <div className="alert alert-info" style={{ background: "#f0f0ff", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <strong>⚠️ Salaries must be entered by Corporate Management only.</strong>
              <p style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                Please use the Corporate Management dashboard to add salary records for MedTech employees.
              </p>
            </div>
          )}

          {/* PCM: Salary category message */}
          {isPCMSalaryCategory && (
            <div className="alert alert-info" style={{ background: "#f0f0ff", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <strong>⚠️ Salaries must be entered by Corporate Management only.</strong>
              <p style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                Please use the Corporate Management dashboard to add salary records for PCM employees.
              </p>
            </div>
          )}

          {/* ========== SALARY CATEGORY (for other departments) ========== */}
          {isSalaryCategory && (
            <div className="form-group">
              <label className="form-label">Employees</label>
              {employees.map((emp, index) => (
                <div key={emp._key} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12, position: "relative" }}>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Department</label>
                      <select
                        value={emp.exec_department}
                        onChange={(e) => handleEmployeeChange(emp._key, "exec_department", e.target.value)}
                        className="form-control"
                      >
                        <option value="">Select Department</option>
                        {(options.exec_departments || []).map((deptKey) => {
                          const deptLabel = DEPARTMENTS_CONFIG.find(d => d.value === deptKey)?.label || deptKey;
                          return <option key={deptKey} value={deptKey}>{deptLabel}</option>;
                        })}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Employee Name</label>
                      <input
                        value={emp.employee_name}
                        onChange={(e) => handleEmployeeChange(emp._key, "employee_name", e.target.value)}
                        placeholder="Employee name"
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Salary (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={emp.salary_amount}
                        onChange={(e) => handleEmployeeChange(emp._key, "salary_amount", e.target.value)}
                        placeholder="0.00"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">TADA (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={emp.allowance_amount}
                        onChange={(e) => handleEmployeeChange(emp._key, "allowance_amount", e.target.value)}
                        placeholder="0.00"
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Total (Salary + TADA)</label>
                      <input value={formatCurrency(emp.total)} disabled className="form-control" style={{ backgroundColor: "#f3f4f6" }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Remarks</label>
                      <input
                        value={emp.remarks || ""}
                        onChange={(e) => handleEmployeeChange(emp._key, "remarks", e.target.value)}
                        placeholder="Optional"
                        className="form-control"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={() => handleRemoveEmployee(emp._key)}
                    style={{ position: "absolute", top: 8, right: 8 }}
                    title="Remove employee"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={handleAddEmployee} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={15} /> Add Employee
              </button>

              {/* ========== DATE PICKER ADDED HERE ========== */}
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="date"
                    name="entry_date"
                    value={form.entry_date}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  {/* Empty placeholder for alignment */}
                </div>
              </div>

              <div style={{ marginTop: 12, textAlign: "right", fontWeight: "bold" }}>
                Total Salary Expense: {formatCurrency(salaryTotal)}
              </div>
            </div>
          )}

          {/* OFFICE ADMIN FIELDS */}
          {isOfficeAdmin && !isOfficeAdminSalary && (
            <>
              {officeFieldConfig && (
                <>
                  {officeFieldConfig.showEmployeeName && (
                    <div className="form-group">
                      <label className="form-label">{officeFieldConfig.labelName || "Name"}</label>
                      <input
                        name="employee_name"
                        value={form.employee_name || ""}
                        onChange={handleChange}
                        placeholder={`Enter ${officeFieldConfig.labelName || "name"}`}
                        className="form-control"
                      />
                    </div>
                  )}
                  {officeFieldConfig.showVehicleType && (
                    <div className="form-group">
                      <label className="form-label">{officeFieldConfig.labelVehicle || "Vehicle Type"}</label>
                      <input
                        name="vehicle_type"
                        value={form.vehicle_type || ""}
                        onChange={handleChange}
                        placeholder="e.g. Car, Bike, Cab"
                        className="form-control"
                      />
                    </div>
                  )}
                  {officeFieldConfig.showPurpose && (
                    <div className="form-group">
                      <label className="form-label">Purpose / Remarks</label>
                      <textarea
                        name="remarks"
                        value={form.remarks || ""}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Enter purpose or additional notes"
                        className="form-control"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="form-control"
                  />
                </div>
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
              </div>
              {!officeFieldConfig?.showPurpose && (
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks || ""}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Optional notes"
                    className="form-control"
                  />
                </div>
              )}
            </>
          )}

          {/* IT FIELDS (excluding salary) – fallback to standard fields if no special config */}
          {isIT && !isITSalaryCategory && (
            showITFields ? renderITFields() : renderStandardFields()
          )}

          {/* IT SALES FIELDS (excluding salary) – uses updated renderITSalesFields */}
          {isITSales && !isITSalesSalaryCategory && (
            showITSalesFields ? renderITSalesFields() : renderStandardFields()
          )}

          {/* MEDTECH FIELDS (excluding salary) – fallback to standard fields */}
          {isMedTech && !isMedTechSalaryCategory && (
            showMedTechFields ? renderMedTechFields() : renderStandardFields()
          )}

          {/* PCM FIELDS (excluding salary) – fallback to standard fields */}
          {isPCM && !isPCMSalaryCategory && (
            showPCMFields ? renderPCMFields() : renderStandardFields()
          )}

          {/* STANDARD FIELDS (for non-salary, non-office-admin, non-IT, non-IT Sales, non-MedTech, non-PCM) */}
          {!isSalaryCategory && !isOfficeAdmin && !isIT && !isITSales && !isMedTech && !isPCM && renderStandardFields()}

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving || isITSalaryCategory || isITSalesSalaryCategory || isMedTechSalaryCategory || isPCMSalaryCategory || isOfficeAdminSalary} className="btn btn-primary">
              {saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}