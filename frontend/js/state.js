// ===== AgriQueue+ | Application State =====

let currentRole = 'farmer';
let currentLang = 'en';
let currentUser = {};
let selectedVehicle = '';
let selectedSlot = '';
let selectedCenter = 0;
let selectedCat = '';
let bookingStep = 1;
let myBookings = JSON.parse(localStorage.getItem('aq_bookings') || '[]');
let myComplaints = JSON.parse(localStorage.getItem('aq_complaints') || '[]');
let queueCounter = 41;
