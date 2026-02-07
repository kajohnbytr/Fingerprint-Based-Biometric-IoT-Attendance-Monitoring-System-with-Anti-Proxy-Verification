import axios from 'axios';

// Base URL for your backend
const API_URL = 'http://localhost:5000/api/users';

// Register user
export const registerUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/register`, {
      email,
      password,
    });
    
    // Save token to localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password,
    });
    
    // Save token to localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

// Get current user (protected route)
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to get user';
  }
};

// Logout
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Get stored token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Get stored user
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};