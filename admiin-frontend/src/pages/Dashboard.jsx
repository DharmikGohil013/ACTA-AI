// Dashboard page copied from main frontend for admin UI base
import React from 'react';
import Layout from '../components/Layout';


const cardStyle = {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  padding: '1.5rem',
  flex: 1,
  minWidth: 180,
  textAlign: 'center',
};

const Dashboard = () => (
  <Layout>
    <div style={{ maxWidth: 900, margin: '2rem auto' }}>
      <h1 style={{ color: '#007bff', marginBottom: 24 }}>Admin Dashboard</h1>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Users</h2>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>--</div>
          <span style={{ color: '#888' }}>Total Users</span>
        </div>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Meetings</h2>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>--</div>
          <span style={{ color: '#888' }}>Total Meetings</span>
        </div>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 22 }}>System</h2>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>OK</div>
          <span style={{ color: '#888' }}>Status</span>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '2rem', minHeight: 180 }}>
        <h2 style={{ color: '#007bff', marginBottom: 16 }}>Recent Activity</h2>
        <p style={{ color: '#666' }}>No recent activity to display.</p>
      </div>
    </div>
  </Layout>
);

export default Dashboard;
