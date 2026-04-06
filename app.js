const DB_COOKS_KEY = "gharsemeal_cooks";
const DB_ORDERS_KEY = "gharsemeal_orders";

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
  
  init() {
    // Scaffold DB
    if (!localStorage.getItem(DB_COOKS_KEY)) {
      localStorage.setItem(DB_COOKS_KEY, JSON.stringify(initialCooks));
    }
    if (!localStorage.getItem(DB_ORDERS_KEY)) {
      localStorage.setItem(DB_ORDERS_KEY, JSON.stringify([]));
    }
    
    // Auto-set today in date picker
    document.getElementById('b-date').valueAsDate = new Date();
  },

  showView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    this.activeView = viewId;

    if (viewId === 'view-student-dashboard') {
      this.initMap();
      this.renderCooks();
    } else if (viewId === 'view-cook-dashboard') {
      this.renderOrders();
    }
  },

  loginAs(role) {
    if (role === 'student') {
      this.showView('view-student-dashboard');
    } else {
      this.showView('view-cook-dashboard');
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
    
    cooks.forEach(cook => {
      const card = document.createElement('div');
      card.className = `cook-card ${cook.recommended ? 'recommended' : ''}`;
      
      let badgeHtml = cook.recommended ? `<div class="tag-recommended">✦ AI Recommended</div>` : '';
      
      card.innerHTML = `
        ${badgeHtml}
        <div class="cook-header">
          <div class="cook-name">${cook.name}</div>
          <div class="cook-rating">★ ${cook.rating}</div>
        </div>
        <div class="cook-cuisine">${cook.cuisine} | Hygiene Score: ${cook.hygiene}%</div>
        <div class="cook-footer">
          <div class="cook-price">₹${cook.price} <span style="font-size:0.8rem; font-weight:normal;">/ meal</span></div>
          <button class="btn btn-secondary" onclick="app.viewCookProfile(${cook.id})" style="padding: 8px 16px;">View Menu</button>
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
      </div>
    `;
    
    this.showView('view-cook-profile');
  },

  showBookingForm() {
    const cooks = JSON.parse(localStorage.getItem(DB_COOKS_KEY));
    const cook = cooks.find(c => c.id === this.selectedCookId);
    
    const bookingDetails = document.getElementById('booking-details');
    bookingDetails.innerHTML = `<h4 style="margin-bottom:10px; color: var(--navy);">Ordering from: ${cook.name}</h4><p>Standard Meal Price: ₹${cook.price}</p>`;
    
    // Reset form states
    document.getElementById('b-runner').checked = false;
    document.getElementById('b-plan').value = 'meal';
    
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
      total = (basePrice * 7) * 0.9; // 10% discount for weekly
    }
    
    if (isRunner) {
      total = 0; // Free meal if acting as a runner for 5+ people
    }
    
    document.getElementById('b-total-amount').textContent = isRunner ? '₹0 (Runner Bonus!)' : `₹${total.toFixed(0)}`;
  },

  handleBookingSubmit(e) {
    e.preventDefault();
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
    
    alert(`Success! Meal booked at ${cook.name} for ${time}!\n\n(Saved to LocalStorage)`);
    this.showView('view-student-dashboard');
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
      <div class="order-card">
        <p><strong>Order ID:</strong> #${o.id.toString().slice(-4)}</p>
        <p><strong>Time:</strong> ${o.time} (${o.date})</p>
        <p><strong>Plan:</strong> ${o.plan.toUpperCase()} ${o.isRunner ? '<span class="user-badge" style="background:#2563EB;">Runner pickup (Bulk)</span>' : ''}</p>
        <button class="btn btn-primary" style="margin-top:10px; padding: 6px 12px; font-size:0.85rem;" onclick="app.acceptOrder(${o.id})">Accept Order</button>
      </div>
    `).join('');
  },
  
  acceptOrder(orderId) {
    alert("Order accepted! The student will be notified.");
    // In a real app we would toggle the state in local storage.
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
