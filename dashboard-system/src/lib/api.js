// src/lib/api.js
const API_URL = "https://script.google.com/macros/s/AKfycbxoM2rTP7vIcg9TuhQ9OQYcZV7GSaGvY36rhXJ4aVr5wxY4iQsB42et4MSzEu1aSRzDWw/exec";

/** @param {string} email */
export async function fetchTasks(email) {
  const res = await fetch(`${API_URL}?action=getTasks`);
  if (!res.ok) throw new Error("Failed to load tasks");

  const data = await res.json();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize

  return (Array.isArray(data) ? data : [])
    .filter(row => {
      if (!row.Planned) return false;

      const planned = new Date(row.Planned);
      planned.setHours(0, 0, 0, 0);

      return (
        row.Email?.toLowerCase() === email?.toLowerCase() &&
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
      return dA.getTime() - dB.getTime();
    });
}


/** @param {string} taskId */
export async function completeTask(taskId) {
  const res = await fetch(`${API_URL}?action=markCompleted&task_id=${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error("Failed to complete task");
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Unknown error");
  return true;
}