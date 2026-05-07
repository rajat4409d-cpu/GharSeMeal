# 🍲 GharSeMeal

**Ghar Jaisa Khana, Ghar Ke Paas**

GharSeMeal is a hyperlocal platform that connects PG and hostel students with passionate home cooks in their neighbourhood — offering healthy, affordable, and homemade meals as an alternative to expensive food delivery apps or bland mess food.

---

## The Problem

Students living in PGs and hostels across Indian cities face a common struggle — bad mess food, overpriced Zomato orders, and zero access to nutritious home-cooked meals. At the same time, many homemakers in the same neighbourhood have the skills and capacity to cook, but no platform to monetize it.

GharSeMeal bridges this gap.

---

## Features

### For Students
- **Browse Nearby Cooks** — Discover verified home chefs within walking distance
- **Flexible Meal Plans** — Book single meals, weekly, or monthly subscriptions
- **Interactive Map** — See cook locations plotted on a live neighbourhood map
- **Wallet System** — Top up and pay seamlessly within the platform
- **Meal Tracker** — Track daily lunch and dinner pickups across the week
- **Runner Badge** — Earn rewards for picking up bulk/weekly orders

### For Home Cooks
- **Easy Onboarding** — 3-step registration to go live as a cook
- **Menu Management** — Add, price, and remove dishes in real time
- **Order Dashboard** — Accept and manage incoming student orders
- **Earnings Tracker** — View daily and weekly earnings at a glance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Maps | Leaflet.js (OpenStreetMap / CartoCDN tiles) |
| Fonts | Google Fonts — Inter, Plus Jakarta Sans |
| Storage | Browser localStorage (client-side state) |

---

## Project Structure

```
GharSeMeal/
├── index.html              # Main app — all pages/sections
├── main.js                 # Application logic & routing
├── style.css               # Styling & responsive layout
└── indian_aunty_cook.png   # Hero section image
```

---

## How It Works

The app is a single-page application (SPA) built without any framework. Navigation between pages is handled via JavaScript by toggling CSS `active` classes on page sections. State is persisted using `localStorage`.

**User flows:**
1. Landing Page → Student Login → Student Dashboard → Browse Cooks → Book a Meal → Confirmation
2. Landing Page → Cook Login / Register → Cook Dashboard → Manage Menu & Orders

---

## Running Locally

No build tools or dependencies required.

```bash
# Clone the repository
git clone https://github.com/rajat4409d-cpu/GharSeMeal.git

# Navigate into the folder
cd GharSeMeal

# Open index.html directly in your browser
# OR use a local server for full map support
npx serve .
```

Then open `http://localhost:3000` in your browser.

> The Leaflet map requires a local server (or any live server) to load correctly. Opening `index.html` via `file://` may show a grey map tile area on some browsers.

---

## Demo Credentials

The app uses dummy data for demonstration. Any input works for login:

- **Student login** — Enter any email and password
- **Cook login** — Enter any kitchen name and password

---

## Author

**Rajat Kumar** — [@rajat4409d-cpu](https://github.com/rajat4409d-cpu)

---

*Built to solve a real problem — bad PG food and an amazing aunty next door.*
