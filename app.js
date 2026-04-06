// Use Firebase with local file support
const isLocalFile = window.location.protocol === 'file:';

const firebaseConfig = {
  apiKey: "AIzaSyCmrT8rF_nmybhxRZL265kHv0zXGgfAoy0",
  authDomain: "gharsemeal-1033a.firebaseapp.com",
  projectId: "gharsemeal-1033a",
  storageBucket: "gharsemeal-1033a.firebasestorage.app",
  messagingSenderId: "265826374232",
  appId: "1:265826374232:web:04404977f61b4a2bde302d"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const DB_COOKS_KEY = "gharsemeal_cooks";
const DB_ORDERS_KEY = "gharsemeal_orders";
const DB_USERS_KEY = "gharsemeal_users";// Mock Data
const initialCooks = [
  {
    id: 1,
    name: "Aunty Sarita's Kitchen",
    cuisine: "North Indian",
    price: 80,
    rating: 4.9,
    hygiene: 95,
    lat: 28.6139,
    lon: 77.2090,
    menu: ["Dal Makhani", "Jeera Rice", "Roti", "Salad"],
    recommended: true
  },
  {
    id: 2,
    name: "Meenakshi Ma'am's Tiffin",
    cuisine: "South Indian",
    price: 70,
    rating: 4.7,
    hygiene: 98,
    lat: 28.6200,
    lon: 77.2150,
    menu: ["Masala Dosa", "Sambar", "Coconut Chutney"],
    recommended: false
  },
  {
    id: 3,
    name: "Pooja's Kitchen",
    cuisine: "Gujarati",
    price: 75,
    rating: 4.8,
    hygiene: 96,
    lat: 28.6100,
    lon: 77.2200,
    menu: ["Dhokla", "Thepla", "Aloo Sabzi"],
    recommended: false
  }
];

const app = {
  map: null,
  markers: [],
  selectedCookId: null,
  activeView: 'landing',
  currentUser: null,
  authMode: { student: 'login', cook: 'login' },
  
  init() {
    this.updateGlobalHeader();
    
    // Auto-set today in date picker
    document.getElementById('b-date').valueAsDate = new Date();

    auth.onAuthStateChanged(user => {
      if (user) {
        db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
             this.currentUser = { uid: user.uid, ...doc.data() };
             this.showView('studentDashboard');
          } else {
             db.collection('cooks').doc(user.uid).get().then(cookDoc => {
                if (cookDoc.exists) {
                   this.currentUser = { uid: user.uid, ...cookDoc.data() };
                   this.showView('cookDashboard');
                }
             })
          }
        });
      } else {
        this.currentUser = null;
        this.showView('landing');
      }
    });
  },

  showView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    this.activeView = viewId;

    if (viewId === 'studentDashboard') {
      this.initStudentDashboard();
    } else if (viewId === 'cookDashboard') {
      this.initCookDashboard();
    } else if (viewId === 'mealTracker') {
      this.initTrackerView();
    }
  },

  loginAs(role) {
    if (role === 'student') {
      this.showView('studentLogin');
    } else {
      this.showView('cookLogin');
    }
  },

  loginAsStudent(forceMode) {
    this.toggleAuthMode(forceMode || 'login');
    this.showView('studentLogin');
  },

  loginAsCook(forceMode) {
    this.toggleCookFormMode(forceMode || 'login');
    this.showView('cookLogin');
  },

  toggleCookFormMode(mode) {
    document.getElementById('cook-login-view').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('cook-signup-view').style.display = mode === 'signup' ? 'block' : 'none';
  },

  toggleAuthMode(forceMode) {
    if (typeof forceMode === 'string') {
       this.authMode['student'] = forceMode;
    } else {
       this.authMode['student'] = this.authMode['student'] === 'login' ? 'signup' : 'login';
    }
    const isSignup = this.authMode['student'] === 'signup';
    
    document.getElementById('auth-name-group').style.display = isSignup ? 'block' : 'none';
    document.getElementById('auth-title').textContent = isSignup ? 'Create an account' : 'Welcome Back';
    document.getElementById('auth-submit-btn').textContent = isSignup ? 'Sign Up' : 'Login to Dashboard';
    document.getElementById('auth-toggle-text').textContent = isSignup ? 'Already have an account?' : "New to GharSeMeal?";
    document.getElementById('auth-toggle-link').textContent = isSignup ? 'Login' : 'Create an account';
  },

  handleAuthSubmit(e) {
    e.preventDefault();
    const mode = this.authMode['student'];
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim() || email.split('@')[0];
    
    document.getElementById('auth-submit-btn').textContent = "Loading...";
    
    if (mode === 'signup') {
      auth.createUserWithEmailAndPassword(email, password)
      .then(cred => {
         return db.collection('users').doc(cred.user.uid).set({
           name, email, role: 'student',
           walletBalance: 500, mealsEaten: 0, runnerCount: 0,
           createdAt: firebase.firestore.FieldValue.serverTimestamp()
         });
      })
      .then(() => {
         e.target.reset();
         document.getElementById('auth-submit-btn').textContent = "Sign Up";
      })
      .catch(err => {
         if (isLocalFile || err.code === 'auth/network-request-failed') {
            console.warn("Using LocalStorage fallback for Student Signup.");
            const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
            const mockUid = 'local_' + Date.now();
            const newUser = { id: mockUid, name, email, role: 'student', walletBalance: 500, mealsEaten: 0 };
            users.push(newUser);
            localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
            app.currentUser = newUser;
            app.initStudentDashboard();
            app.showView('studentDashboard');
            e.target.reset();
         } else {
            alert(err.message);
         }
         document.getElementById('auth-submit-btn').textContent = "Sign Up";
      });
    } else {
      auth.signInWithEmailAndPassword(email, password)
      .then(() => {
         e.target.reset();
         document.getElementById('auth-submit-btn').textContent = "Login to Dashboard";
      })
      .catch(err => {
         if (isLocalFile || err.code === 'auth/network-request-failed') {
            console.warn("Using LocalStorage fallback for Student Login.");
            const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
            const user = users.find(u => u.email === email);
            if (user) {
               app.currentUser = user;
               app.initStudentDashboard();
               app.showView('studentDashboard');
            } else {
               alert("User not found in local backup. Please Sign Up.");
            }
         } else {
            alert(err.message);
         }
         document.getElementById('auth-submit-btn').textContent = "Login to Dashboard";
      });
    }
  },

  logout() {
    auth.signOut().then(() => {
       this.currentUser = null;
       this.showView('landing');
    });
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
         this.map.remove();
         this.map = null;
      }
      // Demo center
      const centerLat = 28.6130;
      const centerLon = 77.2025;
      
      this.map = L.map('map').setView([centerLat, centerLon], 15);
      
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

      const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY)) || initialCooks;
      cooks.forEach(cook => {
        L.marker([cook.lat, cook.lon])
          .addTo(this.map)
          .bindPopup(`<b>${cook.name || cook.kitchenName}</b><br>₹${cook.price || cook.pricePerMeal}/meal`);
      });
    }, 100);
  },

  renderCooks() {
    const listEl = document.getElementById('cook-list');
    db.collection('cooks').get()
      .then(snapshot => {
         let cooks = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
         if (cooks.length === 0) {
            console.warn("Firestore cooks collection empty. Loading seed data fallback.");
            cooks = initialCooks;
         }
         listEl.innerHTML = '';
         
         const searchTerm = (document.getElementById('filter-search')?.value || '').toLowerCase();
         const filterCuisine = (document.getElementById('filter-cuisine')?.value || '').toLowerCase();

         const filteredCooks = cooks.filter(cook => {
           const cookName = cook.kitchenName || cook.cookName || cook.name || '';
           const matchSearch = cookName.toLowerCase().includes(searchTerm) || 
                               (cook.menu || []).some(m => m.toLowerCase().includes(searchTerm));
           const matchCuisine = filterCuisine === '' || (cook.cuisine || '').toLowerCase().includes(filterCuisine);
           return matchSearch && matchCuisine;
         });

         if (filteredCooks.length === 0) {
           listEl.innerHTML = '<p style="text-align:center; color:var(--gray-500); padding:20px;">No cooks found matching your criteria.</p>';
           return;
         }

         filteredCooks.forEach(cook => {
           const cookName = cook.kitchenName || cook.cookName || cook.name || 'Cook';
           const rating = cook.rating || 5.0;
           const hygiene = cook.hygiene || 100;
           const card = document.createElement('div');
           card.className = `cook-card ${cook.recommended ? 'recommended' : ''}`;
           
           let badgeHtml = cook.recommended ? `<div class="tag-recommended">✦ AI Recommended</div>` : '';
           
           card.innerHTML = `
             <div class="cook-card-banner"></div>
             ${badgeHtml}
             <div class="cook-card-content">
               <div class="cook-header">
                 <div class="cook-name">${cookName}</div>
                 <div class="cook-rating">★ ${rating}</div>
               </div>
               <div class="cook-cuisine">${cook.cuisine || ''}</div>
               <div class="hygiene-badge">Hygiene Score: ${hygiene}%</div>
               <div class="cook-footer">
                 <div class="cook-price">₹${cook.pricePerMeal || cook.price || 100} <span style="font-size:0.8rem; font-weight:normal; color:var(--gray-500);">/ meal</span></div>
                 <button class="btn btn-primary" onclick="app.showCookProfile('${cook.id}')" style="padding: 10px 20px; font-size:0.9rem;">View Menu</button>
               </div>
             </div>
           `;
            listEl.appendChild(card);
         });
      })
      .catch(err => {
         console.warn("Using LocalStorage fallback for Cook Cards.");
         const stringCooks = localStorage.getItem(DB_COOKS_KEY);
         const cooks = stringCooks ? JSON.parse(stringCooks) : initialCooks;
         if(!stringCooks) localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
         
         listEl.innerHTML = '';
         cooks.forEach(cook => {
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
                <div class="cook-cuisine">${cook.cuisine || ''}</div>
                <div class="hygiene-badge">Hygiene Score: ${cook.hygiene || 100}%</div>
                <div class="cook-footer">
                  <div class="cook-price">₹${cook.price} <span style="font-size:0.8rem; font-weight:normal; color:var(--gray-500);">/ meal</span></div>
                  <button class="btn btn-primary" onclick="app.showCookProfile('${cook.id}')" style="padding: 10px 20px; font-size:0.9rem;">View Menu</button>
                </div>
              </div>
            `;
            listEl.appendChild(card);
         });
      });
  },

  showCookProfile(id) {
    db.collection('cooks').doc(id).get().then(doc => {
      if(!doc.exists) return;
      const cook = {id: doc.id, ...doc.data()};
      this.selectedCookId = id;
      
      const cookName = cook.kitchenName || cook.cookName || cook.name || 'Cook';
      const rating = cook.rating || 5.0;
      const price = cook.pricePerMeal || cook.price || 100;
      
      document.getElementById('cp-name').textContent = cookName;
      document.getElementById('cp-rating').textContent = rating;
      document.getElementById('cp-avatar').textContent = cookName.charAt(0);
      document.getElementById('cp-price').textContent = `₹${price}`;
      
      const menu = cook.menu || [];
      const menuHtml = menu.map(item => `
        <div class="card" style="padding:15px; display:flex; gap:15px; border:1px solid var(--gray-200); box-shadow:none;">
           <div style="width:60px; height:60px; background:var(--gray-200); border-radius:12px;"></div>
           <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                 <div style="font-weight:800; font-size:1.1rem; color:var(--secondary);">${item}</div>
                 <div style="color:var(--primary); font-weight:700;">₹${price}</div>
              </div>
           </div>
        </div>
      `).join('');
      
      document.getElementById('cp-menu-grid').innerHTML = menuHtml;
    
    const reviewsHtml = (cook.reviews || [
      { name: "Rahul S.", rating: 5, comment: "Just like home! Saving my life during exams." },
      { name: "Priya M.", rating: 4, comment: "Great portions, very hygienic and tasty." }
    ]).map(r => `
      <div style="border-bottom: 1px solid var(--gray-200); padding-bottom:10px; margin-bottom:10px; font-size:0.9rem;">
        <strong>${r.name}</strong> <span style="color:var(--saffron);">★ ${r.rating}</span>
        <p style="color:var(--gray-500); margin-top:4px;">"${r.comment}"</p>
      </div>
    `).join('');
    
    document.getElementById('cp-reviews-list').innerHTML = reviewsHtml;
    
    this.showView('cookProfile');
    })
    .catch(err => {
       console.warn("Using LocalStorage fallback for Cook Profile.");
       const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY) || '[]');
       const cook = cooks.find(c => c.id.toString() === id.toString());
       if(!cook) return;
       
       this.selectedCookId = cook.id;
       document.getElementById('cp-name').textContent = cook.name;
       document.getElementById('cp-rating').textContent = cook.rating || 5.0;
       document.getElementById('cp-avatar').textContent = cook.name.charAt(0);
       document.getElementById('cp-price').textContent = `₹${cook.price}`;
       
       const menuHtml = (cook.menu || []).map(item => `
        <div class="card" style="padding:15px; display:flex; gap:15px; border:1px solid var(--gray-200); box-shadow:none;">
           <div style="width:60px; height:60px; background:var(--gray-200); border-radius:12px;"></div>
           <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                 <div style="font-weight:800; font-size:1.1rem; color:var(--secondary);">${item}</div>
                 <div style="color:var(--primary); font-weight:700;">₹${cook.price}</div>
              </div>
           </div>
        </div>
       `).join('');
       document.getElementById('cp-menu-grid').innerHTML = menuHtml;
       this.showView('cookProfile');
    });
  },

  submitReview() {
    const cookId = this.selectedCookId;
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

  currentCookName: '',
  currentCookPrice: 100,

  showBookingForm() {
    db.collection('cooks').doc(this.selectedCookId).get().then(doc => {
      const cook = doc.data();
      this.currentCookName = cook.kitchenName || cook.cookName || cook.name || 'Cook';
      this.currentCookPrice = cook.pricePerMeal || cook.price || 100;
      
      const bookingDetails = document.getElementById('booking-details');
      bookingDetails.innerHTML = `<h4 style="margin-bottom:10px; color: var(--navy);">Ordering from: ${this.currentCookName}</h4><p>Standard Meal Price: ₹${this.currentCookPrice}</p>`;
      
      // Reset form states
      document.getElementById('b-runner').checked = false;
      document.getElementById('b-plan').value = 'meal';
      
      const weeklyList = document.getElementById('b-weekly-list');
      if (weeklyList) {
         const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
         weeklyList.innerHTML = days.map(day => {
           const isSunday = day === 'Sun';
           return `
           <div class="booking-day-col">
             <div style="font-weight:800; color:var(--secondary); font-size:1.1rem; border-bottom:2px solid #E2E4E9; padding-bottom:10px;">${day}</div>
             <label class="meal-check-slot">
               <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">BRKFST</span>
               <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="breakfast" onchange="app.calculateTotal()" ${isSunday ? 'checked' : ''}>
             </label>
             <label class="meal-check-slot">
               <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">LUNCH</span>
               <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="lunch" onchange="app.calculateTotal()" checked>
             </label>
             <label class="meal-check-slot">
               <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">DINNER</span>
               <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="dinner" onchange="app.calculateTotal()" checked>
             </label>
           </div>
         `}).join('');
      }

      this.showView('booking');
      this.calculateTotal();
    })
    .catch(err => {
       console.warn("Using LocalStorage fallback for showBookingForm.");
       const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY) || '[]');
       const cook = cooks.find(c => c.id.toString() === this.selectedCookId.toString());
       if(!cook) return;
       
       this.currentCookName = cook.name || 'Cook';
       this.currentCookPrice = cook.price || 100;
       
       const bookingDetails = document.getElementById('booking-details');
       bookingDetails.innerHTML = `<h4 style="margin-bottom:10px; color: var(--navy);">Ordering from: ${this.currentCookName}</h4><p>Standard Meal Price: ₹${this.currentCookPrice}</p>`;
       
       document.getElementById('b-runner').checked = false;
       document.getElementById('b-plan').value = 'meal';
       
       const weeklyList = document.getElementById('b-weekly-list');
       if (weeklyList) {
          const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          weeklyList.innerHTML = days.map(day => {
            const isSunday = day === 'Sun';
            return `
            <div class="booking-day-col">
              <div style="font-weight:800; color:var(--secondary); font-size:1.1rem; border-bottom:2px solid #E2E4E9; padding-bottom:10px;">${day}</div>
              <label class="meal-check-slot">
                <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">BRKFST</span>
                <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="breakfast" onchange="app.calculateTotal()" ${isSunday ? 'checked' : ''}>
              </label>
              <label class="meal-check-slot">
                <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">LUNCH</span>
                <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="lunch" onchange="app.calculateTotal()" checked>
              </label>
              <label class="meal-check-slot">
                <span style="font-size:0.8rem; font-weight:700; color:var(--gray-500);">DINNER</span>
                <input type="checkbox" class="wk-slot" data-day="${day}" data-slot="dinner" onchange="app.calculateTotal()" checked>
              </label>
            </div>
          `}).join('');
       }

       this.showView('booking');
       this.calculateTotal();
    });
  },

  calculateTotal() {
    let basePrice = this.currentCookPrice;
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

  confirmBooking(e) {
    if(e) e.preventDefault();
    const method = document.getElementById('b-pay-method').value;
    
    if(method === 'wallet' && this.currentBookingTotal > 0) {
      if(!this.currentUser || this.currentUser.walletBalance < this.currentBookingTotal) return;
      db.collection('users').doc(auth?.currentUser?.uid || this.currentUser.id).update({
        walletBalance: firebase.firestore.FieldValue.increment(-this.currentBookingTotal)
      }).catch(err => {
         if (isLocalFile) {
            this.currentUser.walletBalance -= this.currentBookingTotal;
            this.updateCurrentUser();
         }
      });
    }

    const date = document.getElementById('b-date').value;
    const time = document.getElementById('b-time').value;
    const plan = document.getElementById('b-plan').value;
    const isRunner = document.getElementById('b-runner').checked;
    const bookingCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    db.collection('bookings').add({
      studentId: auth.currentUser.uid,
      cookId: this.selectedCookId,
      cookName: this.currentCookName,
      mealType: plan.toUpperCase(),
      date,
      pickupTime: time,
      planType: plan,
      totalAmount: this.currentBookingTotal,
      bookingCode,
      status: 'pending',
      isRunner,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      document.getElementById('success-cook').textContent = this.currentCookName;
      document.getElementById('success-meal').textContent = plan.toUpperCase();
      document.getElementById('success-time').textContent = time;
      document.getElementById('success-date').textContent = date;
      document.getElementById('success-code').textContent = '#' + bookingCode;
      
      let totalText = document.getElementById('b-total-amount').textContent;
      document.getElementById('success-total').textContent = totalText;
      
      this.showView('booking-success');
    }).catch(err => {
       if (isLocalFile || err.code === 'auth/network-request-failed' || err.message.includes('offline')) {
          console.warn("Using LocalStorage fallback for Bookings.");
          const orders = JSON.parse(localStorage.getItem(DB_ORDERS_KEY) || '[]');
          orders.push({
             id: Date.now(),
             studentId: this.currentUser.id,
             cookId: this.selectedCookId,
             cookName: this.currentCookName,
             mealType: plan.toUpperCase(),
             date,
             time, plan,
             totalAmount: this.currentBookingTotal,
             bookingCode,
             status: 'Pending',
             isRunner
          });
          localStorage.setItem(DB_ORDERS_KEY, JSON.stringify(orders));
          
          document.getElementById('success-cook').textContent = this.currentCookName;
          document.getElementById('success-meal').textContent = plan.toUpperCase();
          document.getElementById('success-time').textContent = time;
          document.getElementById('success-date').textContent = date;
          document.getElementById('success-code').textContent = '#' + bookingCode;
          document.getElementById('success-total').textContent = document.getElementById('b-total-amount').textContent;
          this.showView('booking-success');
       } else {
          alert("Error: " + err.message);
       }
    });
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

  handleCookSignup() {
    const kitchenName = document.getElementById('cs-kname').value.trim();
    const cookName = document.getElementById('cs-name').value.trim();
    const phone = document.getElementById('cs-phone').value.trim();
    const area = document.getElementById('cs-area').value.trim();
    const email = document.getElementById('cs-phone').value.trim() + "@cook.com"; // dummy email from phone or require email
    const password = document.getElementById('cs-pwd').value.trim() || 'password';
    const pricePerMeal = parseInt(document.getElementById('cs-price').value);
    const cuisine = this.wizardDishes.map(d => `${d.name} ${d.type==='Veg'?'🟢':'🔴'}`).join(', ');
    const menu = this.wizardDishes.map(d => `${d.name} (${d.type})`);

    const clEmail = document.getElementById('cl-email')?.value || email; // We use email field in cooklogin
    const actualEmail = document.getElementById('cs-email')?.value || "test@test.com";

    // Use cook signup snippet
    const userEmail = prompt("Enter email for your chef account:", "");
    if(!userEmail) return;

    auth.createUserWithEmailAndPassword(userEmail, password)
    .then(cred => db.collection('cooks').doc(cred.user.uid).set({
      kitchenName, cookName, area, phone, cuisine,
      pricePerMeal, menu, rating: 5.0, role: 'cook',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }))
    .then(() => {
       alert("Live success!");
    })
    .catch(err => {
       if (isLocalFile || err.code === 'auth/network-request-failed') {
          console.warn("Using LocalStorage fallback for Cook Signup.");
          const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY) || '[]');
          const newCook = { id: Date.now(), email: userEmail, kitchenName, cookName, name: cookName, area, phone, cuisine, price: pricePerMeal, menu, rating: 5.0, role: 'cook' };
          cooks.push(newCook);
          localStorage.setItem(DB_COOKS_KEY, JSON.stringify(cooks));
          app.currentUser = newCook;
          app.initCookDashboard();
          app.showView('cookDashboard');
       } else {
          alert("Error: " + err.message);
       }
    });
  },
  
  handleCookLogin(e) {
    e.preventDefault();
    const email = document.getElementById('cl-email').value.trim();
    const pass = document.getElementById('cl-password').value.trim();
    
    auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
       // state managed by onAuthStateChanged
    })
    .catch(err => {
       if (isLocalFile || err.code === 'auth/network-request-failed') {
          console.warn("Using LocalStorage fallback for Cook Login.");
          const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY) || '[]');
          const user = cooks.find(c => c.email === email || c.name === email || c.kitchenName === email);
          if (user) {
             app.currentUser = user;
             app.initCookDashboard();
             app.showView('cookDashboard');
          } else {
             alert("Cook not found in local backup. Please register.");
          }
       } else {
          alert(err.message);
       }
    });
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
    if (!auth.currentUser) return;
    const htmlEl = document.getElementById('cook-orders-list');
    if (!htmlEl) return;
    
    db.collection('bookings')
      .where('cookId', '==', auth.currentUser.uid)
      .onSnapshot(snapshot => {
         const orders = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
         if (orders.length === 0) {
           htmlEl.innerHTML = '<p>No incoming orders yet.</p>';
           return;
         }
         
         orders.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
         
         htmlEl.innerHTML = orders.map(o => `
             <div class="order-card" style="position:relative; margin-bottom: 20px;">
               <p><strong>Booking Code:</strong> #${o.bookingCode || '0000'}</p>
               <p><strong>Time:</strong> ${o.pickupTime || o.time} (${o.date})</p>
               <p><strong>Plan:</strong> ${(o.planType || o.plan || 'Meal').toUpperCase()} ${o.isRunner ? '<span class="user-badge" style="background:#2563EB;">Runner pickup</span>' : ''}</p>
               
               <div style="margin-top:12px;">
                 ${o.status.toLowerCase() === 'pending' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem;" onclick="app.updateOrderStatus('${o.id}', 'accepted')">Accept Order</button>` : ''}
                 ${o.status.toLowerCase() === 'accepted' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#3B82F6;" onclick="app.updateOrderStatus('${o.id}', 'ready')">Mark Ready</button>` : ''}
                 ${o.status.toLowerCase() === 'ready' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#10B981;" onclick="app.updateOrderStatus('${o.id}', 'complete')">Mark Complete</button>` : ''}
                 ${o.status.toLowerCase() === 'complete' ? `<span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; display: inline-block;">✅ Completed</span>` : ''}
               </div>
             </div>
         `).join('');
      }, err => {
         if (isLocalFile || err.code === 'auth/network-request-failed' || err.message.includes('offline')) {
            const orders = JSON.parse(localStorage.getItem(DB_ORDERS_KEY) || '[]');
            const myOrders = orders.filter(o => o.cookId.toString() === this.currentUser.id.toString());
            if (myOrders.length === 0) {
               htmlEl.innerHTML = '<p>No incoming orders yet. (Local Backup)</p>';
               return;
            }
            myOrders.sort((a,b) => b.id - a.id);
            htmlEl.innerHTML = myOrders.map(o => `
             <div class="order-card" style="position:relative; margin-bottom: 20px;">
               <p><strong>Booking Code:</strong> #${o.bookingCode || '0000'}</p>
               <p><strong>Time:</strong> ${o.pickupTime || o.time} (${o.date})</p>
               <p><strong>Plan:</strong> ${(o.planType || o.plan || 'Meal').toUpperCase()} ${o.isRunner ? '<span class="user-badge" style="background:#2563EB;">Runner pickup</span>' : ''}</p>
               <div style="margin-top:12px;">
                 ${o.status.toLowerCase() === 'pending' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem;" onclick="app.updateOrderStatus('${o.id}', 'accepted')">Accept Order</button>` : ''}
                 ${o.status.toLowerCase() === 'accepted' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#3B82F6;" onclick="app.updateOrderStatus('${o.id}', 'ready')">Mark Ready</button>` : ''}
                 ${o.status.toLowerCase() === 'ready' ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size:0.85rem; background:#10B981;" onclick="app.updateOrderStatus('${o.id}', 'complete')">Mark Complete</button>` : ''}
                 ${o.status.toLowerCase() === 'complete' ? `<span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; display: inline-block;">✅ Completed</span>` : ''}
               </div>
             </div>
            `).join('');
         }
      });
  },
  
  updateOrderStatus(orderId, newStatus) {
    db.collection('bookings').doc(orderId).update({ status: newStatus }).catch(err => {
       if (isLocalFile) {
          const orders = JSON.parse(localStorage.getItem(DB_ORDERS_KEY) || '[]');
          const idx = orders.findIndex(o => o.id.toString() === orderId.toString());
          if (idx > -1) {
             orders[idx].status = newStatus;
             localStorage.setItem(DB_ORDERS_KEY, JSON.stringify(orders));
             this.renderOrders(); // Re-render since we don't have onSnapshot trigger from local storage
          }
       } else {
          alert(err.message);
       }
    });
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
       html += `<div class="tracker-day">
         <div class="tracker-day-title">${dayData.day}</div>
       `;
       
       ['breakfast', 'lunch', 'dinner'].forEach(type => {
         const meal = dayData[type];
         if (meal) {
            scheduledCount++;
            let badgeColor = meal.status === 'Picked Up' ? 'background:#10B981;color:white;' : 
                             meal.status === 'Missed' ? 'background:#DC2626;color:white;' : 
                             meal.status === 'Skipped (No Charge)' ? 'background:transparent; color:var(--gray-500); text-decoration:line-through; border:1px solid var(--gray-500);' :
                             'background:var(--primary);color:white;';
            
            html += `
              <div class="tracker-slot">
                 <div class="tracker-badge" style="${badgeColor}">${meal.status}</div>
                 <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; margin-bottom:5px; color:var(--gray-500);">${type}</div>
                 <div style="font-weight:800; font-size:0.9rem; color:var(--secondary); line-height:1.2;">👨‍🍳 ${meal.cook}</div>
                 ${meal.status === 'Scheduled' ? `<div style="display:flex; gap:5px; margin-top:10px;"><button class="btn btn-primary" onclick="app.markMealPickedUp(${dayIdx}, '${type}')" style="padding:6px; font-size:0.7rem; flex:1;">Pick Up</button><button class="btn btn-outline" onclick="app.skipMeal(${dayIdx}, '${type}')" style="padding:6px; font-size:0.7rem; flex:1;">Skip</button></div>` : ''}
              </div>
            `;
         } else {
            html += `<div class="tracker-slot" style="background:transparent; border:1px dashed var(--gray-200); color:var(--gray-500); text-align:center;"><div style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">${type}</div>No booking</div>`;
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
     if(!this.currentUser) return;
     db.collection('users').doc(auth?.currentUser?.uid || this.currentUser.id).update({
        walletBalance: firebase.firestore.FieldValue.increment(amt)
     }).then(() => {
        alert(`₹${amt} added to Wallet successfully!`);
        this.currentUser.walletBalance += amt;
        this.currentUser.walletHistory = this.currentUser.walletHistory || [];
        this.currentUser.walletHistory.unshift({ date: new Date().toISOString().split('T')[0], amount: amt, desc: 'Added Funds' });
        this.updateCurrentUser();
        this.showView('studentDashboard');
     }).catch(err => {
        if (isLocalFile) {
           alert(`₹${amt} added to Local Wallet successfully!`);
           this.currentUser.walletBalance += amt;
           this.currentUser.walletHistory = this.currentUser.walletHistory || [];
           this.currentUser.walletHistory.unshift({ date: new Date().toISOString().split('T')[0], amount: amt, desc: 'Added Local Funds' });
           this.updateCurrentUser();
           this.showView('studentDashboard');
        } else alert(err.message);
     });
  },

  markMealPickedUp(dayIdx, type) {
    this.currentUser.tracker[dayIdx][type].status = 'Picked Up';
    this.currentUser.mealsEaten = (this.currentUser.mealsEaten || 12) + 1;
    this.updateCurrentUser();
    this.renderTracker();
    this.initStudentDashboard(); 
  },

  updateCurrentUser() {
    if (this.currentUser) {
       const collection = this.currentUser.role === 'student' ? 'users' : 'cooks';
       db.collection(collection).doc(auth?.currentUser?.uid || this.currentUser.id).set(this.currentUser, { merge: true })
         .catch(err => {
            if (isLocalFile) {
               const key = this.currentUser.role === 'student' ? DB_USERS_KEY : DB_COOKS_KEY;
               const items = JSON.parse(localStorage.getItem(key) || '[]');
               const idx = items.findIndex(i => i.id.toString() === this.currentUser.id.toString());
               if(idx > -1) items[idx] = this.currentUser;
               localStorage.setItem(key, JSON.stringify(items));
            }
         });
    }
    this.updateGlobalHeader();
  },
  
  updateGlobalHeader() {
    const navActions = document.getElementById('global-nav-actions');
    if(!navActions) return;
    
    if (this.currentUser && this.currentUser.role === 'student') {
       navActions.innerHTML = `
         <div class="wallet-pill">
            <span style="font-size:1.2rem;">💳</span>
            <span>₹${this.currentUser.walletBalance || 0}</span>
         </div>
         <button class="btn btn-primary" style="padding:10px 20px; font-size:0.9rem;" onclick="app.showView('studentDashboard')">Add Credit</button>
         <div class="avatar-circle" onclick="if(confirm('Logout?')) app.logout()" title="Logout" style="background:var(--gray-200); color:var(--secondary); border:none;">
            ${(this.currentUser.name || 'U').charAt(0).toUpperCase()}
         </div>
       `;
    } else if (this.currentUser && this.currentUser.role === 'cook') {
       navActions.innerHTML = `
         <div class="avatar-circle" onclick="if(confirm('Logout?')) app.logout()" title="Logout" style="background:var(--primary); color:white;">C</div>
       `;
    } else {
       navActions.innerHTML = `
         <button class="btn btn-outline" onclick="app.toggleCookFormMode('login'); app.showView('cookLogin')">I'm a Cook</button>
         <button class="btn btn-primary" onclick="app.toggleAuthMode('login'); app.showView('studentLogin')">Student Login</button>
       `;
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

window.app = app;
