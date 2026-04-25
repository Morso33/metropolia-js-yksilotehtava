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

const enableAuthedControls = (isAuthed) => {
  [...els.profileForm.elements].forEach((el) => {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      el.disabled = !isAuthed;
    }
  });
  [...els.avatarForm.elements].forEach((el) => {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') el.disabled = !isAuthed;
  });
  els.logoutBtn.hidden = !isAuthed;
};

const renderAuthState = () => {
  if (!state.user) {
    els.authState.textContent = 'Ei kirjautunut';
    els.profileName.textContent = 'Ei kirjautunut';
    els.profileEmail.textContent = 'Kirjaudu hallitaksesi profiilia.';
    els.avatarPreview.src = AVATAR_PLACEHOLDER;
    enableAuthedControls(false);
    return;
  }

  els.authState.textContent = `Kirjautunut: ${state.user.username}`;
  els.profileName.textContent = state.user.username || '-';
  els.profileEmail.textContent = state.user.email || '';
  els.avatarPreview.src = getAvatarUrl(state.user.avatar) || AVATAR_PLACEHOLDER;
  els.profileForm.username.value = state.user.username || '';
  els.profileForm.email.value = state.user.email || '';
  els.profileForm.password.value = '';
  els.profileForm.favouriteRestaurant.value = state.user.favouriteRestaurant || '';
  enableAuthedControls(true);
};

const extractRestaurants = (payload) =>
  Array.isArray(payload) ? payload : payload?.restaurants || [];

const buildFilterOptions = () => {
  const cities = [...new Set(state.restaurants.map((r) => r.city).filter(Boolean))].sort();
  const companies = [...new Set(state.restaurants.map((r) => r.company).filter(Boolean))].sort();

  els.cityFilter.innerHTML = '<option value="">Kaikki kaupungit</option>';
  cities.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    els.cityFilter.append(option);
  });

  els.companyFilter.innerHTML = '<option value="">Kaikki tarjoajat</option>';
  companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    els.companyFilter.append(option);
  });
};



const isValidFormValue = (value) =>
  typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined;

const applyFilters = () => {
  const city = els.cityFilter.value.toLowerCase();
  const company = els.companyFilter.value.toLowerCase();
  const search = els.searchFilter.value.trim().toLowerCase();

  state.filteredRestaurants = state.restaurants.filter((r) => {
    const cityMatch = !city || r.city?.toLowerCase() === city;
    const companyMatch = !company || r.company?.toLowerCase() === company;
    const searchMatch =
      !search ||
      r.name?.toLowerCase().includes(search) ||
      r.address?.toLowerCase().includes(search);
    return cityMatch && companyMatch && searchMatch;
  });

  els.restaurantCount.textContent = `${state.filteredRestaurants.length} ravintolaa`;
  renderRestaurantList();
  populateFavouriteSelect();
};

const favouriteButtonLabel = (id) =>
  state.user?.favouriteRestaurant === id ? 'Suosikki' : 'Aseta suosikiksi';

const renderRestaurantList = () => {
  els.restaurantList.innerHTML = '';
  state.filteredRestaurants.forEach((restaurant) => {
    const card = document.createElement('article');
    card.className = 'restaurant-card';
    if (restaurant._id === state.nearestRestaurantId) card.classList.add('nearest');
    if (restaurant._id === state.selectedRestaurantId) card.classList.add('selected');

    card.innerHTML = `
      <div class="card-head">
        <strong>${restaurant.name || '-'}</strong>
        <span class="badge">${restaurant.company || 'N/A'}</span>
      </div>
      <div class="muted">${restaurant.address || ''}, ${restaurant.city || ''}</div>
      <div class="muted">${restaurant.phone || ''}</div>
      ${restaurant._id === state.nearestRestaurantId ? '<div class="badge ok">Lähin</div>' : ''}
      <div class="actions">
        <button type="button" data-action="show" data-id="${restaurant._id}">Näytä menut</button>
        <button type="button" data-action="fav" data-id="${restaurant._id}" ${state.user ? '' : 'disabled'}>
          ${favouriteButtonLabel(restaurant._id)}
        </button>
      </div>
    `;

    els.restaurantList.append(card);
  });
};

const renderDailyMenu = (data) => {
  const courses = data?.courses || [];
  if (!courses.length) {
    els.dailyMenu.textContent = 'Päivän menua ei saatavilla.';
    return;
  }
  els.dailyMenu.innerHTML = courses
    .map(
      (c) => `<div class="menu-item">
        <strong>${c.name || '-'}</strong><br>
        <span class="muted">${c.price || '-'}</span><br>
        <span class="muted">${c.diets || ''}</span>
      </div>`,
    )
    .join('');
};

const renderWeeklyMenu = (data) => {
  const days = data?.days || [];
  if (!days.length) {
    els.weeklyMenu.textContent = 'Viikon menua ei saatavilla.';
    return;
  }
  els.weeklyMenu.innerHTML = days
    .map((day) => {
      const items = (day.courses || [])
        .map(
          (c) => `<div class="menu-item">
            <strong>${c.name || '-'}</strong><br>
            <span class="muted">${c.price || '-'}</span> · <span class="muted">${c.diets || ''}</span>
          </div>`,
        )
        .join('');
      return `<section class="menu-item"><strong>${day.date || ''}</strong>${items || '<div class="muted">Ei ruokalajeja</div>'}</section>`;
    })
    .join('');
};

const selectRestaurant = async (id) => {
  state.selectedRestaurantId = id;
  const restaurant = state.restaurants.find((r) => r._id === id);
  els.menuTitle.textContent = `Ruokalistat — ${restaurant?.name || ''}`;
  renderRestaurantList();
  renderMap();

  els.dailyMenu.textContent = 'Ladataan...';
  els.weeklyMenu.textContent = 'Ladataan...';
  try {
    const [daily, weekly] = await Promise.all([
      api(`/restaurants/daily/${id}/fi`),
      api(`/restaurants/weekly/${id}/fi`),
    ]);
    renderDailyMenu(daily);
    renderWeeklyMenu(weekly);
  } catch (error) {
    renderDailyMenu(null);
    renderWeeklyMenu(null);
    showNotice(error.message, true);
  }
};

const populateFavouriteSelect = () => {
  const currentValue = state.user?.favouriteRestaurant || '';
  els.favouriteSelect.innerHTML = '<option value="">Valitse ravintola</option>';
  state.filteredRestaurants.forEach((restaurant) => {
    const option = document.createElement('option');
    option.value = restaurant._id;
    option.textContent = `${restaurant.name} (${restaurant.city || '-'})`;
    els.favouriteSelect.append(option);
  });
  els.favouriteSelect.value = currentValue;
};

const loadRestaurants = async () => {
  const payload = await api('/restaurants');
  state.restaurants = extractRestaurants(payload);
  buildFilterOptions();
  updateNearestRestaurant();
  applyFilters();
};

const refreshCurrentUser = async () => {
  if (!state.token) {
    state.user = null;
    renderAuthState();
    return;
  }
  try {
    const result = await api('/users/token', { auth: true });
    state.user = result?.data || result;
  } catch {
    state.token = '';
    localStorage.removeItem(TOKEN_KEY);
    state.user = null;
  }
  renderAuthState();
  renderRestaurantList();
  populateFavouriteSelect();
};

const updateFavouriteRestaurant = async (restaurantId) => {
  if (!state.user) return;
  await api('/users', {
    method: 'PUT',
    auth: true,
    body: { favouriteRestaurant: restaurantId },
  });
  state.user.favouriteRestaurant = restaurantId;
  renderAuthState();
  renderRestaurantList();
  showNotice('Suosikkiravintola päivitetty.');
};

const setupEvents = () => {
  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const login = tab.dataset.authTab === 'login';
      els.tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      els.loginForm.classList.toggle('hidden', !login);
      els.registerForm.classList.toggle('hidden', login);
    });
  });

  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(els.loginForm).entries());
    try {
      const result = await api('/auth/login', { method: 'POST', body });
      state.token = result.token;
      localStorage.setItem(TOKEN_KEY, state.token);
      await refreshCurrentUser();
      showNotice('Kirjautuminen onnistui.');
    } catch (error) {
      showNotice(error.message, true);
    }
  });

  els.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(els.registerForm).entries());
    try {
      await api('/users', { method: 'POST', body });
      showNotice('Tili luotu. Voit nyt kirjautua.');
      els.tabs[0].click();
      els.registerForm.reset();
    } catch (error) {
      showNotice(error.message, true);
    }
  });

  els.profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.user) return;
    const values = Object.fromEntries(new FormData(els.profileForm).entries());
    const body = Object.fromEntries(Object.entries(values).filter(([, value]) => isValidFormValue(value)));
    try {
      const result = await api('/users', { method: 'PUT', auth: true, body });
      state.user = result?.data || { ...state.user, ...body };
      renderAuthState();
      renderRestaurantList();
      showNotice('Profiili päivitetty.');
    } catch (error) {
      showNotice(error.message, true);
    }
  });

  els.avatarForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = els.avatarForm.avatar.files?.[0];
    if (!file) {
      showNotice('Valitse kuva ladattavaksi.', true);
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const result = await api('/users/avatar', {
        method: 'POST',
        auth: true,
        formData: true,
        body: formData,
      });
      const updated = result?.data || {};
      state.user = { ...state.user, ...updated };
      renderAuthState();
      showNotice('Profiilikuva ladattu.');
      els.avatarForm.reset();
    } catch (error) {
      showNotice(error.message, true);
    }
  });

  els.logoutBtn.addEventListener('click', () => {
    state.token = '';
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    renderAuthState();
    renderRestaurantList();
    showNotice('Kirjauduit ulos.');
  });

  els.cityFilter.addEventListener('change', applyFilters);
  els.companyFilter.addEventListener('change', applyFilters);
  els.searchFilter.addEventListener('input', applyFilters);

  els.restaurantList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    if (action === 'show') {
      await selectRestaurant(id);
    } else if (action === 'fav') {
      try {
        await updateFavouriteRestaurant(id);
      } catch (error) {
        showNotice(error.message, true);
      }
    }
  });
};


const init = async () => {
  setupEvents();
  renderAuthState();
  try {
    await Promise.all([loadRestaurants(), refreshCurrentUser()]);
    tryResolveUserLocation();
  } catch (error) {
    showNotice(`Alustus epäonnistui: ${error.message}`, true);
  }
};
init();
console.log("LOAD")