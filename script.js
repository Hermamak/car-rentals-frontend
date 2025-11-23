const API_URL = "http://3.224.121.119:3000";


// DOM references
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const carsGrid = document.getElementById('carsGrid');
const categoryBtns = document.querySelectorAll('.category-btn');
const bookingForm = document.getElementById('bookingForm');
const contactForm = document.getElementById('contactForm');
const carSelect = document.getElementById('carSelect');
const bookingsTable = document.getElementById('bookingsTable');

let carsData = [];

// Mobile nav toggle 
if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Fetch cars from backend
async function fetchCarsFromBackend() {
  const url = `${API_URL}/cars`;
  console.log('Fetching cars from', url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  return await res.json();
}

// Load and render cars
async function loadCarsPage() {
  if (!carsGrid) return;
  carsGrid.innerHTML = `<p>Loading cars...</p>`;
  try {
    carsData = await fetchCarsFromBackend();
    displayCars(); // renders into carsGrid
    populateCarSelect(); // also populate booking dropdown (if present)
  } catch (err) {
    console.error('Error fetching cars:', err);
    carsGrid.innerHTML = `<p class="error-text">Unable to load cars. Check backend URL, CORS and network. See console for details.</p>`;
  }
}

// Render cars into the grid
function displayCars(category = 'all') {
  if (!carsGrid) return;
  const filtered = category === 'all' ? carsData : carsData.filter(c => c.category === category);
  if (!filtered.length) {
    carsGrid.innerHTML = `<p>No cars available.</p>`;
    return;
  }
  carsGrid.innerHTML = filtered.map(car => `
    <div class="car-card">
      <img src="${car.image}" alt="${escapeHtml(car.name)}" class="car-image">
      <div class="car-info">
        <h3 class="car-name">${escapeHtml(car.name)}</h3>
        <p class="car-category">${escapeHtml((car.category || '').toUpperCase())}</p>
        <p class="car-price">${escapeHtml(car.price || '')}</p>
      </div>
    </div>
  `).join('');
}

//dropdown on book-now page
function populateCarSelect() {
  if (!carSelect) return;
  carSelect.innerHTML = '<option value="">Choose a vehicle</option>';
  (carsData || []).forEach(car => {
    if (!car.booked) {
      const opt = document.createElement('option');
      opt.value = car.id; // value may be number or string
      opt.textContent = `${car.name} — ${car.price}`;
      carSelect.appendChild(opt);
    }
  });
}

// Helper
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Category buttons behavior
if (categoryBtns && categoryBtns.length) {
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category || 'all';
      displayCars(cat);
    });
  });
}

// Booking form submit handler (book-now page)
if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // gather and validate
    const carIdRaw = (carSelect && carSelect.value) || '';
    const carId = Number(carIdRaw);
    if (!carId) {
      alert('Please select a car.');
      return;
    }
    const bookingData = {
      carId: carId, // number
      customerName: (document.getElementById('customerName')?.value || '').trim(),
      customerEmail: (document.getElementById('customerEmail')?.value || '').trim(),
      customerPhone: (document.getElementById('customerPhone')?.value || '').trim(),
      driverLicense: (document.getElementById('driverLicense')?.value || '').trim(),
      startDate: (document.getElementById('pickupDate')?.value || ''),
      endDate: (document.getElementById('returnDate')?.value || '')
    };

    // basic validation
    if (!bookingData.customerName || !bookingData.customerEmail || !bookingData.startDate || !bookingData.endDate) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      const url = `${API_URL}/book`;
      console.log('Posting booking to', url, bookingData);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('Booking failed', res.status, json);
        alert(json?.message || `Booking failed (HTTP ${res.status})`);
        return;
      }

      alert('Booking successful!');
      bookingForm.reset();
      // Refresh cars & dropdown so booked car disappears
      try { carsData = await fetchCarsFromBackend(); populateCarSelect(); } catch (e) { console.warn('Could not refresh cars after booking:', e); }
    } catch (err) {
      console.error('Booking error:', err);
      alert('Unable to submit booking. Check console and backend.');
    }
  });
}

// Load bookings table (bookings.html)
async function loadBookingsPage() {
  if (!bookingsTable) return;
  bookingsTable.innerHTML = `<tr><td colspan="8">Loading bookings...</td></tr>`;
  try {
    const res = await fetch(`${API_URL}/bookings`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bookings = await res.json();
    if (!bookings.length) {
      bookingsTable.innerHTML = `<tr><td colspan="8">No bookings yet.</td></tr>`;
      return;
    }
    bookingsTable.innerHTML = bookings.map(b => `
      <tr>
        <td>${escapeHtml(b.id)}</td>
        <td>${escapeHtml(b.carId)}</td>
        <td>${escapeHtml(b.customerName)}</td>
        <td>${escapeHtml(b.customerEmail)}</td>
        <td>${escapeHtml(b.customerPhone)}</td>
        <td>${escapeHtml(b.driverLicense)}</td>
        <td>${escapeHtml(b.startDate)}</td>
        <td>${escapeHtml(b.endDate)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading bookings:', err);
    bookingsTable.innerHTML = `<tr><td colspan="8">Failed to load bookings. See console.</td></tr>`;
  }
}

// On page load: run the relevant functions
document.addEventListener('DOMContentLoaded', async () => {
  // if on cars page
  if (carsGrid) {
    await loadCarsPage();
    return;
  }

  // if on book-now page
  if (bookingForm) {
    try {
      carsData = await fetchCarsFromBackend(); // prefetch cars for dropdown
      populateCarSelect();
    } catch (err) {
      console.error('Error preloading cars for booking page:', err);
      if (carSelect) carSelect.innerHTML = `<option value="">Unable to load cars</option>`;
    }
    return;
  }

  // if on bookings page
  if (bookingsTable) {
    await loadBookingsPage();
    return;
  }

  // Otherwise, default prefetch (safe)
  try {
    carsData = await fetchCarsFromBackend();
  } catch (err) {
    // no-op
  }
});

