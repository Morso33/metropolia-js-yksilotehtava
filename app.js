const API_BASE = 'https://media2.edu.metropolia.fi/restaurant/api/v1';
const UPLOAD_BASE = 'https://media2.edu.metropolia.fi/restaurant/uploads/';
const TOKEN_KEY = 'restaurant_app_token';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: null,
  restaurants: [],
  filteredRestaurants: [],
  selectedRestaurantId: '',
  nearestRestaurantId: '',
  userCoords: null,
};

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%25" height="100%25" fill="%23121824"/><circle cx="32" cy="24" r="11" fill="%23313c56"/><rect x="14" y="40" width="36" height="16" rx="8" fill="%23313c56"/></svg>';

const els = {
  notice: document.getElementById('notice'),
  authState: document.getElementById('auth-state'),
  logoutBtn: document.getElementById('logout-btn'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  tabs: [...document.querySelectorAll('[data-auth-tab]')],
  profileForm: document.getElementById('profile-form'),
  avatarForm: document.getElementById('avatar-form'),
  profileName: document.getElementById('profile-name'),
  profileEmail: document.getElementById('profile-email'),
  avatarPreview: document.getElementById('avatar-preview'),
  favouriteSelect: document.getElementById('favourite-select'),
  cityFilter: document.getElementById('city-filter'),
  companyFilter: document.getElementById('company-filter'),
  searchFilter: document.getElementById('search-filter'),
  restaurantCount: document.getElementById('restaurant-count'),
  restaurantList: document.getElementById('restaurant-list'),
  menuTitle: document.getElementById('menu-title'),
  dailyMenu: document.getElementById('daily-menu'),
  weeklyMenu: document.getElementById('weekly-menu'),
};

const showNotice = (message, isError = false) => {
  els.notice.textContent = message;
  els.notice.style.background = isError ? '#4a2530' : '#1f2d49';
  els.notice.style.borderColor = isError ? '#a6465e' : '#3d5d9f';
  els.notice.classList.add('show');
  setTimeout(() => els.notice.classList.remove('show'), 3200);
};

const getAvatarUrl = (avatar) => {
  if (!avatar) return '';
  return avatar.startsWith('http') ? avatar : `${UPLOAD_BASE}${avatar}`;
};

const api = async (path, options = {}) => {
  const { method = 'GET', body, auth = false, formData = false } = options;
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (formData ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Virhe: ${response.status}`;
    throw new Error(message);
  }
  return data;
};
