/**
 * GharSeMeal - Application Logic
 */

// --- STATE MANAGEMENT ---
const INITIAL_STATE = {
  wallet: 500,
  mealsEaten: 12,
  savedZomato: 1440,
  runnerBadge: 2,
  userType: null, // 'student' or 'cook'
  currentUser: null,
  
  // Dummy Data
  cooks: [
    { id: 1, name: "Amma's Kitchen", cookName: "Lakshmi Rao", cuisine: "North Indian", rating: 4.9, hygiene: 98, distance: "0.5 km", price: 80, lat: 28.6139, lng: 77.2090, isAI: true,
      menu: [
        { id: 101, name: "Chole Bhature", price: 80, isVeg: true },
        { id: 102, name: "Chicken Curry Meal", price: 120, isVeg: false }
      ]
    },
    { id: 2, name: "Punjabi Hearth", cookName: "Gurpreet Singh", cuisine: "North Indian", rating: 4.7, hygiene: 95, distance: "1.2 km", price: 150, lat: 28.6250, lng: 77.2180,
      menu: [
        { id: 201, name: "Rajma Chawal", price: 100, isVeg: true },
        { id: 202, name: "Butter Chicken & Roti", price: 150, isVeg: false }
      ]
    }
  ],
  transactions: [
    { id: 1, date: "Today, 1:00 PM", desc: "Lunch - Amma's Kitchen", amt: -80 },
    { id: 2, date: "Yesterday", desc: "Wallet Top-up", amt: 500 }
  ],
  cookProfile: {
    kitchenName: "Aunty's Kitchen", cookName: "Aunty", rating: 4.8, hygiene: 100, menu: [], earningsToday: 0, ordersToday: 0, activeOrders: []
  }
};

let appState = JSON.parse(localStorage.getItem('gharSeMealState'));
if (!appState) {
  appState = INITIAL_STATE;
  saveState();
} else {
  // Force update to use New Delhi cooks
  appState.cooks = INITIAL_STATE.cooks;
  saveState();
}

function saveState() {
  localStorage.setItem('gharSeMealState', JSON.stringify(appState));
}

// --- ROUTING ---
function navigateTo(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
    onPageLoad(pageId);
  }
}

function onPageLoad(pageId) {
  updateNav();
  if (pageId === 'student-dashboard') {
    renderStudentDashboard();
    initMap();
  } else if (pageId === 'cook-profile') {
    renderCookProfile(appState.currentCookView || 1);
  } else if (pageId === 'booking-page') {
    renderBookingPage();
  } else if (pageId === 'meal-tracker') {
    renderMealTracker();
  } else if (pageId === 'cook-dashboard') {
    renderCookDashboard();
  }
}

function updateNav() {
  const studentLinks = document.getElementById('nav-student-links');
  const cookLinks = document.getElementById('nav-cook-links');
  
  studentLinks.classList.add('hidden');
  cookLinks.classList.add('hidden');
  
  if (appState.userType === 'student') studentLinks.classList.remove('hidden');
  if (appState.userType === 'cook') cookLinks.classList.remove('hidden');
}

// --- AUTH ---
function handleStudentLogin(e) {
  e.preventDefault();
  const email = document.getElementById('student-email').value;
  appState.userType = 'student';
  appState.currentUser = { name: email.split('@')[0], email };
  saveState();
  navigateTo('student-dashboard');
}

function handleCookLogin(e) {
  e.preventDefault();
  const kitchen = document.getElementById('cook-auth-id').value;
  appState.userType = 'cook';
  
  // Create dummy profile if empty
  if (!appState.cookProfile.kitchenName || appState.cookProfile.kitchenName === "Aunty's Kitchen") {
    appState.cookProfile.kitchenName = kitchen;
    appState.cookProfile.cookName = "Chef";
  }
  
  saveState();
  navigateTo('cook-dashboard');
}

function logout() {
  appState.userType = null;
  appState.currentUser = null;
  saveState();
  navigateTo('landing-page');
}

// --- STUDENT DASHBOARD ---
let mapInstance = null;

function initMap() {
  if (!document.getElementById('chefs-map')) return;
  
  // Only init once
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 100);
    return;
  }
  
  mapInstance = L.map('chefs-map').setView([28.6139, 77.2090], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  // Add markers
  appState.cooks.forEach(cook => {
    const marker = L.circleMarker([cook.lat, cook.lng], {
      color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.8, radius: 8
    }).addTo(mapInstance);
    
    marker.bindPopup(`<b>${cook.name}</b><br>★ ${cook.rating} | ${cook.distance}<br><button onclick="viewCook(${cook.id})" class="btn btn-primary btn-sm mt-1 pb-1 pt-1">View</button>`);
  });
}

function renderStudentDashboard() {
  // Setup Wallet
  document.getElementById('wallet-balance-display').textContent = appState.wallet;
  document.getElementById('stat-meals-eaten').textContent = appState.mealsEaten;
  document.getElementById('stat-saved').textContent = '₹' + appState.savedZomato;
  document.getElementById('stat-runner').textContent = appState.runnerBadge + 'x';
  
  const name = appState.currentUser ? appState.currentUser.name : 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('student-greeting').textContent = `${greeting}, ${name}!`;

  renderTransactions();
  renderNearbyCooks();
}

function renderTransactions() {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';
  appState.transactions.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div class="font-bold">${t.desc}</div>
        <div class="text-sm text-secondary">${t.date}</div>
      </div>
      <div class="txn-amount ${t.amt < 0 ? 'negative' : 'positive'}">
        ${t.amt < 0 ? '' : '+'}₹${Math.abs(t.amt)}
      </div>
    `;
    list.appendChild(li);
  });
}

function addMoney(amount) {
  appState.wallet += amount;
  appState.transactions.unshift({
    id: Date.now(),
    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    desc: `Wallet Top-up`,
    amt: amount
  });
  saveState();
  document.getElementById('wallet-balance-display').textContent = appState.wallet;
  renderTransactions();
  alert(`₹${amount} added locally to your wallet!`);
}

function renderNearbyCooks() {
  const container = document.getElementById('nearby-cooks-list');
  container.className = "grid-2";
  container.innerHTML = '';
  
  appState.cooks.forEach(cook => {
    const ui = document.createElement('div');
    ui.className = 'cook-preview-card card';
    ui.onclick = () => viewCook(cook.id);
    ui.innerHTML = `
      <div class="cook-preview-img placeholder-image" style="background-image: url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80')">
        ${cook.isAI ? '<div class="ai-badge">✨ AI Recommended</div>' : ''}
        <div style="position: absolute; bottom: 10px; right: 10px; background: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">₹${cook.price} / meal</div>
      </div>
      <div class="cook-preview-content">
        <div class="cook-preview-header">
          <h3 class="m-0">${cook.name}</h3>
          <span class="badge badge-accent">★ ${cook.rating}</span>
        </div>
        <p class="text-sm text-secondary m-0 mb-2">by ${cook.cookName}</p>
        <div class="flex-row justify-between text-sm mt-auto">
          <span><span class="text-secondary">Cuisine:</span> <b>${cook.cuisine}</b></span>
          <span><span class="text-secondary">Hygiene:</span> <b class="text-success">${cook.hygiene}%</b></span>
        </div>
        <button class="btn btn-outline w-100 mt-3 btn-sm">View Menu</button>
      </div>
    `;
    container.appendChild(ui);
  });
}

// --- COOK PROFILE & BOOKING ---
function viewCook(id) {
  appState.currentCookView = id;
  saveState();
  navigateTo('cook-profile');
}

function renderCookProfile(id) {
  const cook = appState.cooks.find(c => c.id === id);
  if(!cook) return;
  
  document.getElementById('view-cook-name').textContent = cook.name;
  document.getElementById('view-cook-rating').textContent = cook.rating;
  document.getElementById('view-cook-hygiene').textContent = cook.hygiene;
  document.getElementById('view-cook-price').textContent = '₹' + cook.price;
  
  const menuList = document.getElementById('view-cook-menu');
  menuList.innerHTML = '';
  cook.menu.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <span class="${item.isVeg ? 'veg-tag' : 'non-veg-tag'}"></span>
        <span class="font-bold">${item.name}</span>
      </div>
      <span class="text-primary font-bold">₹${item.price}</span>
    `;
    menuList.appendChild(li);
  });
}

// --- BOOKING LOGIC ---
let bookingTotal = 0;
let scheduleTotalMeals = 0;

function renderBookingPage() {
  const cook = appState.cooks.find(c => c.id === appState.currentCookView);
  if(!cook) return;
  
  document.getElementById('booking-cook-name').textContent = cook.name;
  document.getElementById('booking-base-price').textContent = cook.price;
  document.getElementById('booking-wallet-bal').textContent = appState.wallet;
  
  // Set default date to today
  document.getElementById('booking-date').valueAsDate = new Date();
  
  // Render Scheduler Grid
  const grid = document.getElementById('scheduler-grid');
  grid.innerHTML = '';
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  days.forEach((day, index) => {
    const isSun = day === 'Sun';
    const ui = document.createElement('div');
    ui.className = 'scheduler-day';
    
    // Default selection
    const bSel = isSun ? 'selected' : '';
    const lSel = 'selected';
    const dSel = 'selected';
    
    ui.innerHTML = `
      <div class="sc-day-header">${day}</div>
      <div class="sc-meals">
        <div class="sc-meal-slot ${bSel}" onclick="toggleMealSlot(this)">Brk</div>
        <div class="sc-meal-slot ${lSel}" onclick="toggleMealSlot(this)">Lun</div>
        <div class="sc-meal-slot ${dSel}" onclick="toggleMealSlot(this)">Din</div>
      </div>
    `;
    grid.appendChild(ui);
  });
  
  toggleWeeklyScheduler(); // Calculate initial
  checkWalletBalance();
}

function toggleMealSlot(el) {
  el.classList.toggle('selected');
  calculateTotal();
}

function toggleWeeklyScheduler() {
  const plan = document.getElementById('booking-plan-type').value;
  const scheduler = document.getElementById('weekly-scheduler');
  const dateGroup = document.getElementById('date-picker-group');
  const timeGroup = document.getElementById('time-picker-group');
  
  if (plan === 'week') {
    scheduler.classList.remove('hidden');
    dateGroup.classList.add('hidden');
    timeGroup.classList.add('hidden');
  } else {
    scheduler.classList.add('hidden');
    dateGroup.classList.remove('hidden');
    timeGroup.classList.remove('hidden');
  }
  calculateTotal();
}

function calculateTotal() {
  const cook = appState.cooks.find(c => c.id === appState.currentCookView);
  const basePrice = cook ? cook.price : 80;
  const plan = document.getElementById('booking-plan-type').value;
  const isRunner = document.getElementById('booking-runner').checked;
  
  if (plan === 'meal') {
    bookingTotal = basePrice;
    scheduleTotalMeals = 1;
  } else {
    const selectedSlots = document.querySelectorAll('.sc-meal-slot.selected').length;
    scheduleTotalMeals = selectedSlots;
    bookingTotal = selectedSlots * basePrice;
    document.getElementById('scheduler-meal-count').textContent = selectedSlots;
  }
  
  if (isRunner) {
    bookingTotal = 0;
  }
  
  document.getElementById('booking-total').textContent = bookingTotal;
  checkWalletBalance();
}

function checkWalletBalance() {
  const method = document.getElementById('booking-payment-method').value;
  const warn = document.getElementById('wallet-warning');
  const btn = document.getElementById('btn-confirm-booking');
  
  if (method === 'wallet' && appState.wallet < bookingTotal) {
    warn.classList.remove('hidden');
    btn.disabled = true;
    btn.style.opacity = 0.5;
  } else {
    warn.classList.add('hidden');
    btn.disabled = false;
    btn.style.opacity = 1;
  }
}

function handleBooking(e) {
  e.preventDefault();
  
  const method = document.getElementById('booking-payment-method').value;
  const plan = document.getElementById('booking-plan-type').value;
  const cook = appState.cooks.find(c => c.id === appState.currentCookView);
  
  if (method === 'wallet' && bookingTotal > 0) {
    appState.wallet -= bookingTotal;
    appState.transactions.unshift({
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      desc: `${plan === 'week' ? 'Weekly Sub' : 'Meal'} - ${cook.name}`,
      amt: -bookingTotal
    });
  }
  
  const isRunner = document.getElementById('booking-runner').checked;
  if (isRunner) {
    appState.runnerBadge += 1;
  }
  
  appState.mealsEaten += scheduleTotalMeals;
  appState.savedZomato += scheduleTotalMeals * 120; // 120 saved per meal vs zomato
  
  saveState();
  
  // Show Confirm Info
  document.getElementById('confirm-cook-name').textContent = cook.name;
  document.getElementById('confirm-meal-type').textContent = plan === 'week' ? 'Weekly Plan' : document.getElementById('booking-meal-type').options[document.getElementById('booking-meal-type').selectedIndex].text;
  document.getElementById('confirm-time').textContent = plan === 'week' ? 'Flexible' : document.getElementById('booking-time').options[document.getElementById('booking-time').selectedIndex].text;
  document.getElementById('confirm-date').textContent = plan === 'week' ? 'Starting Next Week' : document.getElementById('booking-date').value;
  document.getElementById('confirm-code').textContent = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('confirm-total').textContent = isRunner ? '₹0 — Runner Bonus!' : ('₹' + bookingTotal);
  
  navigateTo('booking-confirm');
}

// --- MEAL TRACKER ---
function renderMealTracker() {
  const cal = document.getElementById('tracker-calendar');
  cal.innerHTML = '';
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  days.forEach((day, i) => {
    const isPast = i < 3;
    const isToday = i === 3;
    
    // dummy status logic
    let lStatus = isPast ? 'picked' : 'scheduled';
    let dStatus = isPast ? 'picked' : 'scheduled';
    if(i === 1) dStatus = 'missed'; // Example missed
    
    const ui = document.createElement('div');
    ui.className = 'tracker-day';
    
    // Status badges generator
    const getBadge = (status) => {
      if(status === 'picked') return `<span class="td-status status-picked">✓ Picked Up</span>`;
      if(status === 'missed') return `<span class="td-status status-missed">✕ Missed</span>`;
      return `<span class="td-status status-scheduled">⏳ Scheduled</span>`;
    };
    
    const getBtn = (status) => {
      if(status === 'scheduled') return `<button class="btn btn-outline btn-sm w-100 mt-1" onclick="this.innerHTML='Marked ✓'; this.disabled=true;">Mark Picked Up</button>`;
      return '';
    };

    ui.innerHTML = `
      <div class="td-header ${isToday ? 'bg-primary' : ''}">${day} ${isToday ? '(Today)' : ''}</div>
      <div class="td-slot">
        <p class="text-sm m-0 mb-1"><b>Lunch</b> (1:00 PM)</p>
        ${getBadge(lStatus)}
        <p class="text-sm text-secondary m-0">Aunty's Kitchen</p>
        ${getBtn(lStatus)}
      </div>
      <div class="td-slot">
        <p class="text-sm m-0 mb-1"><b>Dinner</b> (8:00 PM)</p>
        ${getBadge(dStatus)}
        <p class="text-sm text-secondary m-0">Aunty's Kitchen</p>
        ${getBtn(dStatus)}
      </div>
    `;
    cal.appendChild(ui);
  });
}

// --- COOK REGISTRATION ---
function showCookRegistration() {
  document.getElementById('cook-login-view').classList.add('hidden');
  document.getElementById('cook-register-view').classList.remove('hidden');
}

function nextRegStep(step) {
  document.querySelectorAll('.reg-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(`reg-step-${step}`).classList.remove('hidden');
  document.getElementById('cook-reg-progress').style.width = `${(step / 3) * 100}%`;
  
  if (step === 3) {
    // Populate preview
    document.getElementById('preview-k-name').textContent = document.getElementById('reg-kitchen-name').value || 'My Kitchen';
    document.getElementById('preview-c-name').textContent = 'by ' + (document.getElementById('reg-cook-name').value || 'Cook');
    document.getElementById('preview-price').textContent = document.getElementById('reg-dish-price').value || '80';
  }
}

function finishCookRegistration() {
  appState.userType = 'cook';
  appState.cookProfile.kitchenName = document.getElementById('reg-kitchen-name').value;
  appState.cookProfile.cookName = document.getElementById('reg-cook-name').value;
  
  // Add first dish
  appState.cookProfile.menu = [{
    id: Date.now(),
    name: document.getElementById('reg-dish-name').value,
    price: document.getElementById('reg-dish-price').value,
    isVeg: document.getElementById('reg-is-veg').checked
  }];
  
  saveState();
  navigateTo('cook-dashboard');
}

// --- COOK DASHBOARD ---
function renderCookDashboard() {
  document.getElementById('cd-kitchen-name').textContent = appState.cookProfile.kitchenName || "Your Kitchen";
  document.getElementById('cd-earn-today').textContent = appState.cookProfile.earningsToday || 0;
  document.getElementById('cd-earn-week').textContent = (appState.cookProfile.earningsToday || 0) * 4; // dummy math
  document.getElementById('cd-orders-today').textContent = appState.cookProfile.ordersToday || 0;
  
  renderCookMenu();
  renderCookOrders();
}

function renderCookMenu() {
  const list = document.getElementById('cd-menu-list');
  list.innerHTML = '';
  appState.cookProfile.menu.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="flex-row gap-2 align-center">
        <span class="${item.isVeg ? 'veg-tag' : 'non-veg-tag'}"></span>
        <span class="font-bold">${item.name}</span>
      </div>
      <div class="flex-row gap-2 align-center">
        <span class="text-primary font-bold">₹${item.price}</span>
        <button class="btn btn-outline btn-sm text-danger" style="padding: 2px 8px;" onclick="removeDish(${item.id})">×</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function addDish(e) {
  e.preventDefault();
  const name = document.getElementById('new-dish-name').value;
  const price = document.getElementById('new-dish-price').value;
  
  appState.cookProfile.menu.push({
    id: Date.now(),
    name: name,
    price: parseInt(price),
    isVeg: true // Simplified for demo
  });
  
  saveState();
  document.getElementById('new-dish-name').value = '';
  document.getElementById('new-dish-price').value = '';
  renderCookMenu();
}

function removeDish(id) {
  appState.cookProfile.menu = appState.cookProfile.menu.filter(i => i.id !== id);
  saveState();
  renderCookMenu();
}

function renderCookOrders() {
  const container = document.getElementById('cd-orders-container');
  // Dummy active orders
  const orders = [
    { id: 'ORD-8492', time: '1:00 PM', type: 'MEAL', isRunner: false, status: 0 },
    { id: 'ORD-8493', time: '1:30 PM', type: 'WEEKLY', isRunner: true, status: 1 }
  ];
  
  document.getElementById('cd-active-orders').textContent = orders.length;
  
  container.innerHTML = '';
  orders.forEach((o, i) => {
    const ui = document.createElement('div');
    ui.className = 'order-item';
    
    // Status flow UI
    const statuses = ['Accept Order', 'Mark Ready', 'Completed'];
    let btnClass = 'btn-outline';
    if(o.status === 0) btnClass = 'btn-primary';
    if(o.status === 1) btnClass = 'btn-secondary';
    if(o.status === 2) btnClass = 'btn-green shadow-none';
    
    ui.innerHTML = `
      <div class="flex-row justify-between align-start mb-2">
        <div>
          <h4 class="m-0">${o.id}</h4>
          <p class="text-sm text-secondary m-0">${o.time} • ${o.type}</p>
        </div>
        ${o.isRunner ? '<span class="badge badge-accent">🏃 Runner (Bulk)</span>' : ''}
      </div>
      <button class="btn ${btnClass} w-100 btn-sm" onclick="advanceOrder(this, ${o.status})">
        ${statuses[o.status]}
      </button>
    `;
    container.appendChild(ui);
  });
}

window.advanceOrder = function(btn, status) {
  const nextStatuses = ['Mark Ready', 'Completed', 'Completed'];
  btn.textContent = nextStatuses[status];
  
  if (status === 0) {
    btn.className = 'btn btn-secondary w-100 btn-sm';
    btn.onclick = () => advanceOrder(btn, 1);
  } else if (status === 1) {
    btn.className = 'btn btn-green w-100 btn-sm';
    btn.textContent = '✓ Completed';
    btn.onclick = null;
    
    // Update earnings
    appState.cookProfile.earningsToday += 80;
    appState.cookProfile.ordersToday += 1;
    saveState();
    
    document.getElementById('cd-earn-today').textContent = appState.cookProfile.earningsToday;
    document.getElementById('cd-orders-today').textContent = appState.cookProfile.ordersToday;
  }
};
