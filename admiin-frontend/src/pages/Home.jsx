// Home page copied from main frontend for admin UI base
import React from 'react';
import Layout from '../components/Layout';


const Home = () => (
  <Layout>
    <div style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#007bff', marginBottom: 16 }}>Welcome to the Admin Panel</h1>
      <p style={{ color: '#444', marginBottom: 32 }}>
        Manage users, meetings, and system settings from this dashboard.<br/>
        Use the navigation above to access different admin features.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
        <a href="/dashboard" style={{ textDecoration: 'none' }}>
          <button>Go to Dashboard</button>
        </a>
        <a href="/settings" style={{ textDecoration: 'none' }}>
          <button>Settings</button>
        </a>
        <a href="/profile" style={{ textDecoration: 'none' }}>
          <button>Profile</button>
        </a>
      </div>
    </div>
  </Layout>
);

export default Home;
