const DB_COOKS_KEY = "gharsemeal_cooks";
const DB_ORDERS_KEY = "gharsemeal_orders";
const DB_USERS_KEY = "gharsemeal_users";

// Mock Data
const initialCooks = [
  {
    id: 1,
    name: "Aunty Sarita (Sarita's Kitchen)",
    cuisine: "North Indian • Homestyle",
    price: 80, // per meal
    rating: 4.8,
    hygiene: 95,
    lat: 28.6130, // Random around Delhi center as demo
    lon: 77.2000,
    menu: ["Dal Makhani", "Jeera Rice", "Roti", "Salad"],
    recommended: true
  },
  {
    id: 2,
    name: "Meenakshi Ma'am",
    cuisine: "South Indian Special",
    price: 90,
    rating: 4.9,
    hygiene: 98,
    lat: 28.6145,
    lon: 77.2050,
    menu: ["Masala Dosa", "Sambar", "Coconut Chutney"],
    recommended: false
  },
  {
    id: 3,
    name: "Pooja's Tiffin Box",
    cuisine: "Healthy Bowls • Diet",
    price: 110,
    rating: 4.6,
    hygiene: 90,
    lat: 28.6110,
    lon: 77.2020,
    menu: ["Quinoa Pulao", "Paneer Bhurji", "Curd"],
    recommended: false
  }
];

const app = {
  map: null,
  markers: [],
  selectedCookId: null,
  activeView: 'view-landing',
  currentUser: null,
  authMode: { student: 'login', cook: 'login' },
  
  init() {
    // Scaffold DB
    if (!localStorage.getItem(DB_COOKS_KEY)) {
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(initialCooks));
    } else {
      const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
      const uniqueCooks = [];
      const seen = new Set();
      for (const c of cooks) {
        if (!seen.has(c.name)) {
          uniqueCooks.push(c);
          seen.add(c.name);
        }
      }
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(uniqueCooks));
    }
    
    if (!localStorage.getItem(DB_ORDERS_KEY)) {
      localStorage.setItem(DB_ORDERS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_USERS_KEY)) {
      localStorage.setItem(DB_USERS_KEY, JSON.stringify([]));
    }
    
    // Auto-set today in date picker
    document.getElementById('b-date').valueAsDate = new Date();
  },

  showView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    this.activeView = viewId;

    if (viewId === 'view-student-dashboard') {
      this.initStudentDashboard();
    } else if (viewId === 'view-cook-dashboard') {
      this.initCookDashboard();
    } else if (viewId === 'view-student-tracker') {
      this.initTrackerView();
    }
  },

  loginAs(role) {
    if (role === 'student') {
      this.showView('view-student-auth');
    } else {
      this.showView('view-cook-auth');
    }
  },

  toggleAuthMode(role) {
    this.authMode[role] = this.authMode[role] === 'login' ? 'signup' : 'login';
    const isSignup = this.authMode[role] === 'signup';
    
    document.getElementById(`${role}-signup-fields`).style.display = isSignup ? 'block' : 'none';
    document.getElementById(`${role}-auth-title`).textContent = isSignup ? 'Create an account' : 'Login to your account';
    document.getElementById(`${role}-auth-btn`).textContent = isSignup ? 'Sign Up' : 'Login';
    document.getElementById(`${role}-toggle-text`).textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
    document.getElementById(`${role}-toggle-link`).textContent = isSignup ? 'Login' : 'Sign up';
  },

  handleAuth(e, role) {
    e.preventDefault();
    const mode = this.authMode[role];
    const prefix = role === 'student' ? 'auth-s' : 'auth-c';
    
    const name = document.getElementById(`${prefix}-name`).value.trim();
    const password = document.getElementById(`${prefix}-pass`).value;
    
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
    
    if (mode === 'signup') {
      let newUser = { id: Date.now(), role, name, password };
      if (role === 'student') {
        newUser.college = document.getElementById(`${prefix}-college`).value.trim();
        newUser.address = document.getElementById(`${prefix}-address`).value.trim();
      }
      
      users.push(newUser);
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
      this.currentUser = newUser;
      
      // Update form toggle and reset
      this.authMode[role] = 'login';
      this.toggleAuthMode(role); // reverse back for next time
      this.toggleAuthMode(role); // toggle back to logic
    } else {
      // Login
      const user = users.find(u => u.role === role && u.name === name && u.password === password);
      if (!user) {
        alert("Invalid name or password.");
        return;
      }
      this.currentUser = user;
    }
    
    e.target.reset();
    
    // Navigate correctly based on role
    // Since currentUser is ID'd properly we can use it to fetch the actual cook info later
    if (role === 'student') {
        document.getElementById('student-badge').textContent = this.currentUser.name;
    }
    this.showView(role === 'student' ? 'view-student-dashboard' : 'view-cook-dashboard');
  },

  logout() {
    this.currentUser = null;
    this.showView('view-landing');
  },

  initStudentDashboard() {
    this.initMap();
    this.renderCooks();
    
    // Greeting
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    
    if (this.currentUser) {
      document.getElementById('student-greeting').textContent = `${greeting}, ${this.currentUser.name.split(' ')[0]}!`;
      
      const mealsEaten = this.currentUser.mealsEaten || 12;
      const runnerCount = this.currentUser.runnerCount || 2;
      document.getElementById('stat-meals').textContent = mealsEaten;
      document.getElementById('stat-saved').textContent = mealsEaten * 120;
      document.getElementById('stat-runner').textContent = runnerCount;

      if(this.currentUser.walletBalance === undefined) {
        this.currentUser.walletBalance = 500;
        this.currentUser.walletHistory = [];
        this.updateCurrentUser();
      }
      this.renderWalletStats();
    }
  },

  initMap() {
    // Leaflet needs to be ready, wrap in a tiny timeout to ensure DOM visibility
    setTimeout(() => {
      if (this.map) {
         this.map.invalidateSize(); // Fixes tile loading issue if container was hidden
         return; 
      }
      // Demo center
      const centerLat = 28.6130;
      const centerLon = 77.2025;
      
      this.map = L.map('leaflet-map').setView([centerLat, centerLon], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // Student icon (blue dot)
      L.circleMarker([centerLat, centerLon], {
        color: '#2563EB',
        fillColor: '#2563EB',
        fillOpacity: 0.8,
        radius: 8
      }).addTo(this.map).bindPopup("<b>You are here</b><br>(PG Hostel)");

      const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
      cooks.forEach(cook => {
        L.marker([cook.lat, cook.lon])
          .addTo(this.map)
          .bindPopup(`<b>${cook.name}</b><br>₹${cook.price}/meal`);
      });
    }, 100);
  },

  renderCooks() {
    const listEl = document.getElementById('cook-list');
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    listEl.innerHTML = '';
    
    const searchTerm = (document.getElementById('filter-search')?.value || '').toLowerCase();
    const filterCuisine = (document.getElementById('filter-cuisine')?.value || '').toLowerCase();

    const filteredCooks = cooks.filter(cook => {
      const matchSearch = cook.name.toLowerCase().includes(searchTerm) || 
                          cook.menu.some(m => m.toLowerCase().includes(searchTerm));
      const matchCuisine = filterCuisine === '' || cook.cuisine.toLowerCase().includes(filterCuisine);
      return matchSearch && matchCuisine;
    });

    if (filteredCooks.length === 0) {
      listEl.innerHTML = '<p style="text-align:center; color:var(--gray-500); padding:20px;">No cooks found matching your criteria.</p>';
      return;
    }

    filteredCooks.forEach(cook => {
      const card = document.createElement('div');
      card.className = `cook-card ${cook.recommended ? 'recommended' : ''}`;
      
      let badgeHtml = cook.recommended ? `<div class="tag-recommended">✦ AI Recommended</div>` : '';
      
      card.innerHTML = `
        <div class="cook-card-banner"></div>
        ${badgeHtml}
        <div class="cook-card-content">
          <div class="cook-header">
            <div class="cook-name">${cook.name}</div>
            <div class="cook-rating">★ ${cook.rating}</div>
          </div>
          <div class="cook-cuisine">${cook.cuisine}</div>
          <div class="hygiene-badge">Hygiene Score: ${cook.hygiene}%</div>
          <div class="cook-footer">
            <div class="cook-price">₹${cook.price} <span style="font-size:0.8rem; font-weight:normal; color:var(--gray-500);">/ meal</span></div>
            <button class="btn btn-primary" onclick="app.viewCookProfile(${cook.id})" style="padding: 10px 20px; font-size:0.9rem;">View Menu</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  },

  viewCookProfile(id) {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cook = cooks.find(c => c.id === id);
    this.selectedCookId = id;
    
    const profileEl = document.getElementById('cook-profile-content');
    
    const menuLi = cook.menu.map(item => `<li>${item}</li>`).join('');
    
    const reviewsHtml = (cook.reviews || [
      { name: "Rahul S.", rating: 5, comment: "Just like home! Saving my life during exams." },
      { name: "Priya M.", rating: 4, comment: "Great portions, very hygienic and tasty." }
    ]).map(r => `
      <div style="border-bottom: 1px solid var(--gray-200); padding-bottom:10px; margin-bottom:10px; font-size:0.9rem;">
        <strong>${r.name}</strong> <span style="color:var(--saffron);">★ ${r.rating}</span>
        <p style="color:var(--gray-500); margin-top:4px;">"${r.comment}"</p>
      </div>
    `).join('');

    profileEl.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h3 style="color: var(--navy); margin-bottom: 5px;">${cook.name}</h3>
        <p style="color: var(--saffron); font-weight: bold;">★ ${cook.rating} <span style="color: var(--gray-500); font-weight: normal; margin-left:10px;">Hygiene: ${cook.hygiene}%</span></p>
        <hr style="border: 0; border-top: 1px solid var(--gray-200); margin: 15px 0;">
        <h4 style="margin-bottom: 10px;">Today's Menu</h4>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 20px; color: var(--gray-800);">
          ${menuLi}
        </ul>
        <h3 style="margin-bottom: 20px;">Price: ₹${cook.price}/meal</h3>
        <button class="btn btn-primary w-100" onclick="app.showBookingForm()">Book a Meal</button>
        <a href="https://wa.me/91${cook.phone || '000000000'}" target="_blank" class="btn btn-secondary w-100" style="margin-top:15px; background:#25D366; color:white; display:flex; justify-content:center; align-items:center; gap:8px; text-decoration:none;">🟢 Contact on WhatsApp</a>
        
        <div style="margin-top: 30px;">
          <h4 style="margin-bottom: 15px; color: var(--navy);">Student Reviews</h4>
          ${reviewsHtml}
          
          <div id="leave-review-section" style="margin-top: 15px;">
             <button class="btn btn-secondary w-100" style="background:var(--off-white); color:var(--navy); border:1px solid var(--gray-200);" onclick="document.getElementById('review-form').style.display='block'; this.style.display='none';">💬 Leave a Review</button>
             
             <div id="review-form" style="display:none; background:var(--off-white); padding:15px; border-radius:8px; border:1px solid var(--gray-200);">
               <label style="font-size:0.85rem; font-weight:bold;">Rating (1-5)</label>
               <input type="number" id="new-review-rating" min="1" max="5" value="5" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid var(--gray-200); border-radius:4px;">
               
               <label style="font-size:0.85rem; font-weight:bold;">Comment</label>
               <textarea id="new-review-comment" rows="2" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid var(--gray-200); border-radius:4px;" placeholder="How was the food?"></textarea>
               
               <button class="btn btn-primary w-100" style="padding:10px;" onclick="app.submitReview(${cook.id})">Post Review</button>
             </div>
          </div>
        </div>
      </div>
    `;
    
    this.showView('view-cook-profile');
  },

  submitReview(cookId) {
    const rating = document.getElementById('new-review-rating').value;
    const comment = document.getElementById('new-review-comment').value.trim();
    if (!comment) return;
    
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cookIndex = cooks.findIndex(c => c.id === cookId);
    if(cookIndex > -1){
      if(!cooks[cookIndex].reviews) {
         cooks[cookIndex].reviews = [
            { name: "Rahul S.", rating: 5, comment: "Just like home! Saving my life during exams." },
            { name: "Priya M.", rating: 4, comment: "Great portions, very hygienic and tasty." }
         ];
      }
      cooks[cookIndex].reviews.unshift({
         name: this.currentUser ? this.currentUser.name : "Anonymous",
         rating: parseInt(rating),
         comment: comment
      });
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    }
    
    this.viewCookProfile(cookId); // re-render
  },

  showBookingForm() {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cook = cooks.find(c => c.id === this.selectedCookId);
    
    const bookingDetails = document.getElementById('booking-details');
    bookingDetails.innerHTML = `<h4 style="margin-bottom:10px; color: var(--navy);">Ordering from: ${cook.name}</h4><p>Standard Meal Price: ₹${cook.price}</p>`;
    
    // Reset form states
    document.getElementById('b-runner').checked = false;
    document.getElementById('b-plan').value = 'meal';
    
    const weeklyList = document.getElementById('b-weekly-list');
    if (weeklyList) {
       const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
       weeklyList.innerHTML = days.map(day => `
         <div style="display:flex; align-items:center; margin-bottom:8px; background:var(--off-white); padding:10px; border-radius:8px; flex-wrap:wrap;">
           <div style="width:50px; font-weight:bold; color:var(--navy);">${day}</div>
           <label style="margin-right:15px; display:flex; align-items:center; gap:7px; cursor:pointer;">
             <input type="checkbox" class="wk-slot" style="accent-color:var(--saffron); transform:scale(1.2); cursor:pointer;" data-day="${day}" data-slot="breakfast" onchange="app.calculateTotal()"> <span style="padding-top:2px;">Breakfast 8AM</span>
           </label>
           <label style="margin-right:15px; display:flex; align-items:center; gap:7px; cursor:pointer;">
             <input type="checkbox" class="wk-slot" style="accent-color:var(--saffron); transform:scale(1.2); cursor:pointer;" data-day="${day}" data-slot="lunch" onchange="app.calculateTotal()" checked> <span style="padding-top:2px;">Lunch 1PM</span>
           </label>
           <label style="display:flex; align-items:center; gap:7px; cursor:pointer;">
             <input type="checkbox" class="wk-slot" style="accent-color:var(--saffron); transform:scale(1.2); cursor:pointer;" data-day="${day}" data-slot="dinner" onchange="app.calculateTotal()" checked> <span style="padding-top:2px;">Dinner 8PM</span>
           </label>
         </div>
       `).join('');
    }

    this.showView('view-booking');
    this.calculateTotal();
  },

  calculateTotal() {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cook = cooks.find(c => c.id === this.selectedCookId);
    if(!cook) return;
    
    let basePrice = cook.price;
    const plan = document.getElementById('b-plan').value;
    const isRunner = document.getElementById('b-runner').checked;
    
    let total = basePrice;
    
    if (plan === 'week') {
      document.getElementById('b-weekly-grid').style.display = 'block';
      const checkedCount = document.querySelectorAll('.wk-slot:checked').length;
      total = (basePrice * checkedCount) * 0.9;
      document.getElementById('b-weekly-summary').textContent = `${checkedCount} meals selected = ₹${total.toFixed(0)} total`;
    } else {
      document.getElementById('b-weekly-grid').style.display = 'none';
    }
    
    if (isRunner) {
      total = 0;
    }
    
    document.getElementById('b-total-amount').textContent = isRunner ? '₹0 (Runner Bonus!)' : `₹${total.toFixed(0)}`;
    this.currentBookingTotal = isRunner ? 0 : total;
    this.checkWalletDeficit();
  },

  checkWalletDeficit() {
    if(!this.currentUser) return;
    const method = document.getElementById('b-pay-method').value;
    const alertEl = document.getElementById('b-wallet-alert');
    const submitBtn = document.getElementById('b-submit-btn');
    const bal = this.currentUser.walletBalance || 0;
    document.getElementById('b-wallet-amt').textContent = bal;
    
    if(method === 'wallet' && bal < this.currentBookingTotal) {
       alertEl.style.display = 'block';
       submitBtn.disabled = true;
       submitBtn.style.opacity = '0.5';
    } else {
       alertEl.style.display = 'none';
       submitBtn.disabled = false;
       submitBtn.style.opacity = '1';
    }
  },

  handleBookingSubmit(e) {
    e.preventDefault();
    const method = document.getElementById('b-pay-method').value;
    if(method === 'wallet' && this.currentBookingTotal > 0) {
       this.currentUser.walletBalance -= this.currentBookingTotal;
       this.currentUser.walletHistory = this.currentUser.walletHistory || [];
       this.currentUser.walletHistory.unshift({
          date: document.getElementById('b-date').value || new Date().toISOString().split('T')[0],
          amount: -this.currentBookingTotal,
          desc: `Booking: ${document.getElementById('b-plan').value.toUpperCase()} Plan`
       });
       this.updateCurrentUser();
    }

    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cook = cooks.find(c => c.id === this.selectedCookId);
    
    const date = document.getElementById('b-date').value;
    const time = document.getElementById('b-time').value;
    const plan = document.getElementById('b-plan').value;
    const isRunner = document.getElementById('b-runner').checked;
    
    const order = {
      id: Date.now(),
      cookId: cook.id,
      cookName: cook.name,
      date,
      time,
      plan,
      isRunner,
      status: 'Pending'
    };
    
    const orders = JSON.parse(localStorage.getItem(DB_ORDERS_KEY));
    orders.push(order);
    localStorage.setItem(DB_ORDERS_KEY, JSON.stringify(orders));
    
    const orderIdCode = order.id.toString().slice(-4);
    document.getElementById('success-cook').textContent = cook.name;
    document.getElementById('success-meal').textContent = document.getElementById('b-plan').value.toUpperCase();
    document.getElementById('success-time').textContent = time;
    document.getElementById('success-date').textContent = date;
    document.getElementById('success-code').textContent = '#' + orderIdCode;
    
    let totalText = document.getElementById('b-total-amount').textContent;
    document.getElementById('success-total').textContent = totalText;
    
    this.showView('view-booking-success');
  },

  wizardDishes: [],

  toggleCookFormMode(mode) {
    if (mode === 'login') {
      document.getElementById('cook-login-view').style.display = 'block';
      document.getElementById('cook-signup-view').style.display = 'none';
    } else {
      document.getElementById('cook-login-view').style.display = 'none';
      document.getElementById('cook-signup-view').style.display = 'block';
      this.wizardDishes = [];
      document.getElementById('cs-dish-list').innerHTML = '';
      this.cookWizardNext(1);
    }
  },

  addDishToWizard() {
    const dishInput = document.getElementById('cs-newdish-name');
    const typeInput = document.getElementById('cs-newdish-type');
    const dishName = dishInput.value.trim();
    if (!dishName) return;
    
    if (this.wizardDishes.length >= 5) {
      alert("You can only add up to 5 dishes initially.");
      return;
    }
    
    const titleCaseDish = dishName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    this.wizardDishes.push({ name: titleCaseDish, type: typeInput.value });
    dishInput.value = '';
    
    const listHtml = this.wizardDishes.map((d) => `<li style="margin-bottom:8px;">${d.name} <span style="font-size:0.8rem; opacity:0.8; margin-left:5px;">(${d.type})</span></li>`).join('');
    document.getElementById('cs-dish-list').innerHTML = listHtml;
  },

  cookWizardNext(step) {
    if (step === 2) {
      const name = document.getElementById('cs-kname').value.trim();
      const phone = document.getElementById('cs-phone').value.trim();
      if (!name || !phone) {
        alert("Please fill Basic Info.");
        return;
      }
    }
    if (step === 3) {
      const price = document.getElementById('cs-price').value.trim();
      if (this.wizardDishes.length === 0 || !price) {
        alert("Please add at least 1 dish and set a price.");
        return;
      }
      this.renderCookPreview();
    }
    
    document.getElementById('cs-step-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('cs-step-2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('cs-step-3').style.display = step === 3 ? 'block' : 'none';
  },

  renderCookPreview() {
    const kName = document.getElementById('cs-kname').value;
    const price = document.getElementById('cs-price').value;
    const area = document.getElementById('cs-area').value;
    const dishStr = this.wizardDishes.map(d => `${d.name} ${d.type==='Veg'?'🟢':'🔴'}`).join(', ');
    
    document.getElementById('cs-preview-card').innerHTML = `
      <div class="cook-card" style="pointer-events:none;">
        <div class="cook-header">
           <div class="cook-name">${kName}</div>
           <div class="cook-rating">★ 5.0</div>
        </div>
        <div class="cook-cuisine" style="color:var(--gray-800);">${dishStr}</div>
        <div class="cook-cuisine">Locality: ${area} | Hygiene Score: 100%</div>
        <div class="cook-footer">
           <div class="cook-price">₹${price} <span style="font-size:0.8rem; font-weight:normal;">/ meal</span></div>
           <button class="btn btn-secondary" style="padding: 8px 16px;">View Menu</button>
        </div>
      </div>
    `;
  },

  submitCookSignup() {
    const kName = document.getElementById('cs-kname').value.trim();
    const fullName = document.getElementById('cs-name').value.trim();
    const phone = document.getElementById('cs-phone').value.trim();
    const area = document.getElementById('cs-area').value.trim();
    const pass = document.getElementById('cs-pwd').value.trim();
    const price = parseInt(document.getElementById('cs-price').value);
    const dishStr = this.wizardDishes.map(d => `${d.name} ${d.type==='Veg'?'🟢':'🔴'}`).join(', ');

    const newCook = {
      id: Date.now(),
      role: 'cook',
      phone: phone,
      password: pass,
      name: kName,
      fullName: fullName,
      address: area,
      cuisine: dishStr
    };
    
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
    users.push(newCook);
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    cooks.push({
      id: newCook.id,
      name: newCook.name,
      cuisine: dishStr,
      price: price,
      phone: phone, // Save mapped phone
      rating: 5.0,
      hygiene: 100,
      lat: 28.6130 + (Math.random() * 0.01),
      lon: 77.2000 + (Math.random() * 0.01),
      menu: this.wizardDishes.map(d => `${d.name} (${d.type})`),
      recommended: false
    });
    localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    
    this.currentUser = newCook;
    this.showView('view-cook-dashboard');
  },
  
  handleCookLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('cl-phone').value.trim();
    const pass = document.getElementById('cl-pwd').value.trim();
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
    
    const valid = users.find(u => u.phone === phone && u.password === pass && u.role === 'cook');
    if (valid) {
      this.currentUser = valid;
      this.showView('view-cook-dashboard');
    } else {
      alert("Invalid credentials.");
    }
  },

  initCookDashboard() {
    this.renderOrders();
    this.renderManageMenu();
    
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const me = cooks.find(c => c.name === this.currentUser?.name) || cooks[0];
    if(me) {
      document.getElementById('cook-badge').textContent = me.name;
    }
    
    const ordersItem = JSON.parse(localStorage.getItem(DB_ORDERS_KEY)) || [];
    let todayE = 0;
    let weekE = 0;
    let ordersToday = 0;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    ordersItem.forEach(o => {
      const c = cooks.find(ck => ck.id === parseInt(o.cookId) || ck.name === o.cookName);
      if(c && c.name === this.currentUser?.name && o.status === 'Accepted') {
         let amt = parseInt(c.price);
         if (o.plan === 'week') amt = (amt * 7) * 0.9;
         if (o.isRunner === true || o.isRunner === 'true') amt = 0;
         
         weekE += amt; // Mock data assumes existing orders belong to this week
         if (o.date === todayStr || !o.date) {
            todayE += amt;
            ordersToday++;
         }
      }
    });
    
    document.getElementById('cook-earn-today').textContent = todayE.toFixed(0);
    document.getElementById('cook-earn-week').textContent = weekE.toFixed(0);
    document.getElementById('cook-orders-today').textContent = ordersToday;
  },

  renderManageMenu() {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const myCook = cooks.find(c => c.name === this.currentUser?.name) || cooks[0];
    const menuList = document.getElementById('cook-menu-list');
    
    menuList.innerHTML = myCook.menu.map((m, idx) => `
      <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <span>${m}</span>
        <button onclick="app.removeMenuItem(${idx})" style="background:transparent; border:none; color:var(--saffron); cursor:pointer; font-weight:bold; font-size:1.1rem;" title="Remove">✕</button>
      </li>
    `).join('');
  },

  addMenuItem() {
    const input = document.getElementById('new-menu-item');
    const val = input.value.trim();
    if (!val) return;
    
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cookIndex = cooks.findIndex(c => c.name === this.currentUser?.name);
    if (cookIndex > -1) {
      cooks[cookIndex].menu.push(val);
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    } else {
      cooks[0].menu.push(val);
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    }
    
    input.value = '';
    this.renderManageMenu();
  },

  removeMenuItem(idx) {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cookIndex = cooks.findIndex(c => c.name === this.currentUser?.name);
    if (cookIndex > -1) {
      cooks[cookIndex].menu.splice(idx, 1);
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    } else {
      cooks[0].menu.splice(idx, 1);
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
    }
    
    this.renderManageMenu();
  },

  renderOrders() {
    const ordersItem = JSON.parse(localStorage.getItem(DB_ORDERS_KEY)) || [];
    const htmlEl = document.getElementById('incoming-orders-list');
    
    if (ordersItem.length === 0) {
      htmlEl.innerHTML = '<p>No incoming orders yet.</p>';
      return;
    }
    
    // Sort descending by id
    ordersItem.sort((a,b) => b.id - a.id);
    
    htmlEl.innerHTML = ordersItem.map(o => `
        <div class="order-card" style="position:relative;">
          <p><strong>Order ID:</strong> #${o.id.toString().slice(-4)}</p>
          <p><strong>Time:</strong> ${o.time} (${o.date})</p>
          <p><strong>Plan:</strong> ${o.plan.toUpperCase()} ${o.isRunner ? '<span class="user-badge" style="background:#2563EB;">Runner pickup</span>' : ''}</p>
          
          <div style="margin-top:12px;">
            ${o.status === 'Pending' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem;" onclick="app.updateOrderStatus(${o.id}, 'Accepted')">Accept Order</button>` : ''}
            ${o.status === 'Accepted' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#3B82F6;" onclick="app.updateOrderStatus(${o.id}, 'Ready')">Mark Ready</button>` : ''}
            ${o.status === 'Ready' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#10B981;" onclick="app.updateOrderStatus(${o.id}, 'Complete')">Mark Complete</button>` : ''}
            ${o.status === 'Complete' ? `<span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; display: inline-block;">✅ Completed</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },
  
  updateOrderStatus(orderId, newStatus) {
    const orders = JSON.parse(localStorage.getItem(DB_ORDERS_KEY));
    const idx = orders.findIndex(o => o.id === orderId);
    if(idx > -1) {
      orders[idx].status = newStatus;
      localStorage.setItem(DB_ORDERS_KEY, JSON.stringify(orders));
    }
    this.renderOrders();
    this.initCookDashboard(); // refresh stats!
  },

  initTrackerView() {
    if (!this.currentUser) return;
    if (!this.currentUser.tracker) {
      this.currentUser.tracker = [
        { day: 'Mon', breakfast: null, lunch: { cook: 'Aunty Sarita', status: 'Picked Up', price: 100 }, dinner: { cook: "Meenakshi Ma'am", status: 'Picked Up', price: 100 } },
        { day: 'Tue', breakfast: null, lunch: { cook: 'Aunty Sarita', status: 'Picked Up', price: 100 }, dinner: { cook: 'Aunty Sarita', status: 'Missed', price: 100 } },
        { day: 'Wed', breakfast: null, lunch: { cook: "Pooja's Tiffin Box", status: 'Scheduled', price: 110 }, dinner: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 } },
        { day: 'Thu', breakfast: null, lunch: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 }, dinner: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 } },
        { day: 'Fri', breakfast: null, lunch: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 }, dinner: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 } },
        { day: 'Sat', breakfast: null, lunch: null, dinner: { cook: 'Aunty Sarita', status: 'Scheduled', price: 100 } },
        { day: 'Sun', breakfast: null, lunch: { cook: "Meenakshi Ma'am", status: 'Scheduled', price: 100 }, dinner: null },
      ];
      this.updateCurrentUser();
    }
    this.renderTracker();
  },

  renderTracker() {
    const listEl = document.getElementById('tracker-calendar-list');
    let html = '';
    let scheduledCount = 0;
    
    this.currentUser.tracker.forEach((dayData, dayIdx) => {
       html += `<div class="tracker-day" style="background:var(--white); border-radius:8px; box-shadow:var(--shadow); padding:15px; margin-bottom:12px;">
         <h4 style="color:var(--navy); margin-bottom:10px; border-bottom:1px solid var(--gray-200); padding-bottom:5px;">${dayData.day}</h4>
       `;
       
       ['breakfast', 'lunch', 'dinner'].forEach(type => {
         const meal = dayData[type];
         if (meal) {
            scheduledCount++;
            let badgeColor = meal.status === 'Picked Up' ? 'background:#10B981;color:white;' : 
                             meal.status === 'Missed' ? 'background:#EF4444;color:white;' : 
                             meal.status === 'Skipped (No Charge)' ? 'background:transparent; color:var(--gray-500); text-decoration:line-through; border:1px solid var(--gray-500);' :
                             'background:var(--saffron);color:white;';
            
            html += `
              <div class="meal-slot" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="${meal.status === 'Skipped (No Charge)' ? 'opacity:0.6;' : ''}">
                  <div style="font-weight:bold; font-size:0.9rem; text-transform:capitalize;">${type}</div>
                  <div style="font-size:0.8rem; color:var(--gray-500);">👨‍🍳 ${meal.cook}</div>
                </div>
                <div style="text-align:right;">
                  <span style="${badgeColor} padding:3px 8px; border-radius:12px; font-size:0.7rem; font-weight:bold;">${meal.status}</span>
                  ${meal.status === 'Scheduled' ? `<br><button onclick="app.markMealPickedUp(${dayIdx}, '${type}')" style="margin-top:5px; background:var(--navy); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Pick Up</button> <button onclick="app.skipMeal(${dayIdx}, '${type}')" style="margin-top:5px; background:var(--gray-200); color:var(--navy); border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Skip</button>` : ''}
                </div>
              </div>
            `;
         } else {
            html += `<div style="font-size:0.85rem; color:var(--gray-500); margin-bottom:10px;">${type.charAt(0).toUpperCase() + type.slice(1)}: No meal scheduled</div>`;
         }
       });
       html += `</div>`;
    });
    
    listEl.innerHTML = html;
    
    document.getElementById('tracker-total-meals').textContent = scheduledCount;
    document.getElementById('tracker-amount-saved').textContent = scheduledCount * 120;
  },

  skipMeal(dayIdx, type) {
    const hoursBound = { breakfast: 8, lunch: 13, dinner: 20 };
    const now = new Date();
    const mealHour = hoursBound[type.toLowerCase()];
    const target = new Date();
    target.setHours(mealHour, 0, 0, 0);
    
    const diffHours = (target - now) / 1000 / 60 / 60;
    const meal = this.currentUser.tracker[dayIdx][type];
    
    if (diffHours >= 2 || diffHours < -10) { 
       alert("Early Skip! Full Refund added to Wallet.");
       meal.status = 'Skipped (No Charge)';
       this.currentUser.walletBalance += (meal.price || 100);
       this.currentUser.walletHistory.unshift({ date: new Date().toISOString().split('T')[0], amount: (meal.price || 100), desc: `Refund: Skipped ${type}` });
    } else {
       alert(`Late skip! Less than 2 hours before ${type}. No refund applied.`);
       meal.status = 'Missed';
       this.currentUser.walletHistory.unshift({ date: new Date().toISOString().split('T')[0], amount: 0, desc: `Late Skip Penalty: ${type}` });
    }
    this.updateCurrentUser();
    this.renderTracker();
    this.initStudentDashboard(); // sync dashboard stats
  },

  renderWalletStats() {
     const hList = document.getElementById('wallet-history-list');
     if (hList) {
        let hHtml = (this.currentUser.walletHistory || []).map(tx => `
           <div style="display:flex; justify-content:space-between; padding:15px; background:var(--white); border-radius:8px; box-shadow:var(--shadow); margin-bottom:10px;">
             <div><p style="font-size:0.85rem; color:var(--gray-500); margin:0 0 5px;">${tx.date}</p><p style="font-weight:bold; color:var(--navy); margin:0;">${tx.desc}</p></div>
             <div style="font-size:1.2rem; font-weight:bold; color:${tx.amount > 0 ? '#10B981' : '#EF4444'}">${tx.amount > 0 ? '+' : ''}₹${Math.abs(tx.amount)}</div>
           </div>
        `).join('');
        hList.innerHTML = hHtml || '<p style="text-align:center;color:var(--gray-500);">No transactions yet.</p>';
     }
     const balStr = document.getElementById('wallet-balance');
     if (balStr) {
        balStr.textContent = this.currentUser.walletBalance;
        document.getElementById('wallet-warning').style.display = this.currentUser.walletBalance < 100 ? 'block' : 'none';
     }
  },

  addWalletFunds(amt) {
     this.currentUser.walletBalance += amt;
     this.currentUser.walletHistory.unshift({ date: new Date().toISOString().split('T')[0], amount: amt, desc: 'Added via Mock Gateway' });
     this.updateCurrentUser();
     alert(`₹${amt} added to Wallet successfully!`);
     this.showView('view-student-dashboard');
  },

  markMealPickedUp(dayIdx, type) {
    this.currentUser.tracker[dayIdx][type].status = 'Picked Up';
    this.currentUser.mealsEaten = (this.currentUser.mealsEaten || 12) + 1;
    this.updateCurrentUser();
    this.renderTracker();
    this.initStudentDashboard(); 
  },

  updateCurrentUser() {
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
    const idx = users.findIndex(u => u.id === this.currentUser.id);
    if(idx > -1) {
      users[idx] = this.currentUser;
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
