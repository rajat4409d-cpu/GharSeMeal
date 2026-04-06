import os

html_path = 'index.html'
js_path = 'app.js'

with open(html_path, 'r', encoding='utf-8') as f: html = f.read()
with open(js_path, 'r', encoding='utf-8') as f: js = f.read()

replacements = {
    'view-landing': 'landing',
    'view-student-auth': 'studentLogin',
    'view-cook-auth': 'cookLogin',
    'view-student-dashboard': 'studentDashboard',
    'view-cook-profile': 'cookProfile',
    'view-booking': 'booking',
    'view-booking-success': 'bookingSuccess',
    'view-student-tracker': 'mealTracker',
    'view-cook-dashboard': 'cookDashboard',
    'view-premium-upgrade': 'premiumUpgrade',
    'leaflet-map': 'map',
    'app.loginAsStudent()': \"app.showView('studentLogin')\",
    'app.loginAsCook()': \"app.showView('cookLogin')\",
    'app.loginAsStudent(\\'signup\\')': \"app.showView('studentLogin')\",
    'app.loginAsCook(\\'signup\\')': \"app.showView('cookLogin')\",
    'app.showBookingForm()': \"app.showView('booking')\",
    'app.handleBookingSubmit(event)': \"app.confirmBooking(event)\",
    'app.showView(\\'view-student-tracker\\')': \"app.showView('mealTracker')\",
    'app.showView(\\'view-student-dashboard\\')': \"app.showView('studentDashboard')\",
    'app.showView(\\'view-cook-dashboard\\')': \"app.showView('cookDashboard')\",
    'app.showView(\\'view-cook-profile\\')': \"app.showView('cookProfile')\",
    'app.showView(\\'view-premium-upgrade\\')': \"app.showView('premiumUpgrade')\",
    'alert(\\'My Bookings view incoming\\')': \"app.showView('bookings')\",
    'app.viewCookProfile(': \"app.showCookProfile(\",
    '><span>💳</span> Wallet</a>': ' onclick=\"app.showView(\\'wallet\\')\"><span>💳</span> Wallet</a>',
    '><span>⚙️</span> Settings</a>': ' onclick=\"app.showView(\\'settings\\')\"><span>⚙️</span> Settings</a>'
}

for old, new in replacements.items():
    html = html.replace(old, new)
    js = js.replace(old, new)

with open(html_path, 'w', encoding='utf-8') as f: f.write(html)
with open(js_path, 'w', encoding='utf-8') as f: f.write(js)
print("Renaming successful")
