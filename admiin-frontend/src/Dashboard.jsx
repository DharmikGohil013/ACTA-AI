import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [apiEndpoints, setApiEndpoints] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);
  const [analysisData, setAnalysisData] = useState({});

  useEffect(() => {
    // Example endpoints, replace with your actual backend endpoints
    setApiEndpoints([
      "/api/users",
      "/api/meetings",
      "/api/analysis",
      "/api/login",
      "/api/schedule",
      "/api/transcribe",
      "/api/speaker-id"
    ]);

    // Fetch user count
    axios.get("/api/users/count").then(res => setUserCount(res.data.count)).catch(() => setUserCount(0));
    // Fetch meeting count
    axios.get("/api/meetings/count").then(res => setMeetingCount(res.data.count)).catch(() => setMeetingCount(0));
    // Fetch analysis data
    axios.get("/api/analysis").then(res => setAnalysisData(res.data)).catch(() => setAnalysisData({}));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Dashboard</h1>
      <section>
        <h2>API Endpoints</h2>
        <ul>
          {apiEndpoints.map((ep) => (
            <li key={ep}>{ep}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Stats</h2>
        <p>Users Present: {userCount}</p>
        <p>Meetings Done: {meetingCount}</p>
      </section>
      <section>
        <h2>Analysis Data</h2>
        <pre>{JSON.stringify(analysisData, null, 2)}</pre>
      </section>
    </div>
  );
}
