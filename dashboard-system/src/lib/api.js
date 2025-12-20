// src/lib/api.js
import { getAuthUser } from "./auth.js";

// API URLs
const API_URL = "https://script.google.com/macros/s/AKfycbxoM2rTP7vIcg9TuhQ9OQYcZV7GSaGvY36rhXJ4aVr5wxY4iQsB42et4MSzEu1aSRzDWw/exec";
const BIS_API_URL = "https://script.google.com/macros/s/AKfycbzhhJ23A2VZkiumm2pCh1q5aLjDpbchviIBdQ61n8slWHA7_wpQYPvw-dZrYqVl_zjS/exec";
const SYSTEMS_API_URL = "https://script.google.com/macros/s/AKfycbwpx2eTMnFxg9WBBo9Pzf-sq8FNz8yCz-Xo4jfGQRXoLz44hS5p1yLrLVRTjzyEikb2ug/exec";

// ✅ Helper: Get current user email (consistent across all functions)
function getCurrentUserEmail() {
  return getAuthUser();
}

/**
 * Fetch personal tasks (filtered by current user)
 */
export async function fetchTasks() {
  const email = getCurrentUserEmail();
  if (!email) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}?action=getTasks`);
  if (!res.ok) throw new Error("Failed to load tasks");

  const data = await res.json();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (Array.isArray(data) ? data : [])
    .filter(row => {
      if (!row.Planned) return false;
      const planned = new Date(row.Planned);
      planned.setHours(0, 0, 0, 0);
      return (
        row.Email?.toLowerCase() === email.toLowerCase() &&
        !row.Actual &&
        (!row["Task Status"] || row["Task Status"] === "Due") &&
        planned <= today
      );
    })
    .map(row => ({
      id: String(row["Task ID"] || ""),
      name: String(row.Task || "(No title)"),
      planned: new Date(row.Planned).toLocaleDateString("en-GB")
    }))
    .sort((a, b) => {
      const dA = new Date(a.planned.split("/").reverse().join("-"));
      const dB = new Date(b.planned.split("/").reverse().join("-"));
      return dA - dB;
    });
}

/**
 * Complete a task
 */
export async function completeTask(taskId) {
  const res = await fetch(`${API_URL}?action=markCompleted&task_id=${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error("Failed to complete task");
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Unknown error");
  return true;
}

/**
 * Fetch BIS tasks (filtered by current user)
 */
export async function fetchBisTasks() {
  const email = getCurrentUserEmail();
  if (!email) throw new Error("Not authenticated");

  const res = await fetch(`${BIS_API_URL}?action=getBisTasks`);
  if (!res.ok) throw new Error("Failed to load BIS tasks");
  const data = await res.json();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (Array.isArray(data) ? data : [])
    .filter(row => 
      row["Doer Email"]?.toLowerCase() === email.toLowerCase() &&
      row.Planned &&
      (new Date(row.Planned).setHours(0,0,0,0) <= now.getTime())
    )
    .map(row => {
      const plannedDate = new Date(row.Planned);
      const delayMs = Date.now() - plannedDate.getTime();
      const delayHours = delayMs > 0 ? Math.floor(delayMs / (1000 * 60 * 60)) : 0;
      
      return {
        id: String(row["Unique Keys"] || ""),
        planned: plannedDate.toLocaleString("en-IN", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', ''),
        step: String(row.Step || ""),
        description: String(row.How || ""),
        markDoneUrl: String(row.Link || ""),
        fmsLink: String(row["FMS Link"] || ""),
        fmsName: String(row["FMS Name"] || ""),
        timeDelayHrs: delayHours
      };
    })
    .sort((a, b) => new Date(b.planned) - new Date(a.planned));
}

/**
 * Fetch systems (filtered by current user)
 */
export async function fetchSystems() {
  const email = getCurrentUserEmail();
  if (!email) return { launcher: [], mySystem: [] };

  try {
    const res = await fetch(`${SYSTEMS_API_URL}?action=getSystems`);
    const text = await res.text();
    
    // Handle HTML errors (CORS/permission issues)
    if (text.trim().startsWith("<")) {
      throw new Error("Server returned HTML (check deployment permissions)");
    }
    
    const data = JSON.parse(text);
    const launcher = [];
    const mySystem = [];

    (Array.isArray(data) ? data : [])
      .filter(row => {
        const rowEmail = String(row["Doer Email"] || "").trim().toLowerCase();
        return (
          rowEmail === email.toLowerCase() &&
          row["System Name"] && 
          row["System URL"] && 
          (row["Starter/ Performer"] === "S" || row["Starter/ Performer"] === "P")
        );
      })
      .forEach(row => {
        const item = {
          name: String(row["System Name"] || ""),
          url: String(row["System URL"] || ""),
          description: String(row["Description"] || ""),
          associatedLink: row["Associated Links"] ? String(row["Associated Links"]) : null
        };

        if (row["Starter/ Performer"] === "S") {
          launcher.push(item);
        } else if (row["Starter/ Performer"] === "P") {
          mySystem.push(item);
        }
      });

    return { launcher, mySystem };
  } catch (err) {
    console.error("❌ fetchSystems error:", err);
    throw new Error("Failed to load systems: " + err.message);
  }
}