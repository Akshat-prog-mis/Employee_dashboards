// src/lib/auth.js
import EMPLOYEES from './employees.json';

// Get employee by email (case-insensitive)
function findEmployee(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return EMPLOYEES.find(emp => emp.email.toLowerCase() === normalized);
}

// Authenticate with email + password
export function authenticate(email, password) {
  const emp = findEmployee(email);
  if (!emp) return false;
  // ✅ Password must match exactly (case-sensitive)
  return emp.password === password;
}

// Save authenticated user
export function saveAuth(email) {
  localStorage.setItem("authenticated_user", email.toLowerCase());
}

// Get current user's email
export function getAuthUser() {
  return localStorage.getItem("authenticated_user");
}

// Get current user's full name
export function getEmployeeName() {
  const email = getAuthUser();
  const emp = findEmployee(email);
  return emp ? emp.name : "User";
}

// Clear authentication (logout)
export function clearAuth() {
  localStorage.removeItem("authenticated_user");
}