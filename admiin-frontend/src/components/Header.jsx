import React from "react";

export default function Header() {
  return (
    <header style={{ display: "flex", alignItems: "center", padding: "1rem 2rem", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <img src="/src/assets/logo.png" alt="Logo" style={{ height: 40, marginRight: 16 }} />
      <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
    </header>
  );
}
