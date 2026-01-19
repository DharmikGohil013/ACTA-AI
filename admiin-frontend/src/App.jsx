import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import Dashboard from "./Dashboard";
import Header from "./components/Header";
import "./style.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <SignIn onSignIn={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/" />
          }
        />
      </Routes>
    </>
  );
}
