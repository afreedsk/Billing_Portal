import React from "react";
import FinanceDashboard from "../../components/FinanceDashboard.jsx";

export default function CorporateDashboard() {
  return (
    <FinanceDashboard
      department="Corporate"
      title="Corporate Management"
      roleColor="#1e293b" // dark slate
      paginateByCategory={true}
      itemsPerPage={30} // explicitly set 30 per page
    />
  );
}