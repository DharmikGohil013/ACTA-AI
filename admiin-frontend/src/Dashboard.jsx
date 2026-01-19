import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [apiEndpoints, setApiEndpoints] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);
  const [analysisData, setAnalysisData] = useState({});
  const [envContent, setEnvContent] = useState("");
  const [envMessage, setEnvMessage] = useState("");

  useEffect(() => {
    // Example endpoints, replace with your actual backend endpoints
    setApiEndpoints([
      "/api/users",
      "/api/meetings",
      "/api/analysis",
      "/api/login",
      "/api/schedule",
      "/api/transcribe",
      "/api/speaker-id",
      "/api/admin/env",
      "/api/users/count",
      "/api/meetings/count"
    ]);

    // Fetch user count
    axios.get("http://localhost:3000/api/users/count").then(res => setUserCount(res.data.count)).catch(() => setUserCount(0));
    // Fetch meeting count
    axios.get("http://localhost:3000/api/meetings/count").then(res => setMeetingCount(res.data.count)).catch(() => setMeetingCount(0));
    // Fetch analysis data
    axios.get("http://localhost:3000/api/analysis").then(res => setAnalysisData(res.data)).catch(() => setAnalysisData({}));
    // Fetch .env content
    axios.get("http://localhost:3000/api/admin/env").then(res => setEnvContent(res.data.content)).catch(() => setEnvContent(""));
  }, []);

  const handleEnvSave = () => {
    axios.post("http://localhost:3000/api/admin/env", { content: envContent })
      .then(res => setEnvMessage("Environment variables updated successfully"))
      .catch(err => setEnvMessage("Failed to update environment variables"));
  };

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
      <section>
        <h2>Environment Variables (.env)</h2>
        <textarea
          value={envContent}
          onChange={(e) => setEnvContent(e.target.value)}
          rows={20}
          cols={80}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <br />
        <button onClick={handleEnvSave}>Save Changes</button>
        {envMessage && <p>{envMessage}</p>}
      </section>
    </div>
  );
}
