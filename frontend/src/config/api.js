// API Configuration
// Update this URL when deploying to production

// Development: http://localhost:3000
// Production: https://your-backend-name.onrender.com

// Remove trailing slash if present
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_URL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;

export default API_URL;
