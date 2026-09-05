// ===== AgriQueue+ | Initial Static Data & Constants =====

// CROP MSP DATA
const mspData = [
  { crop: 'Wheat (गेहूँ)', price: 2275, change: +25, icon: '🌾' },
  { crop: 'Paddy (धान)', price: 2183, change: +143, icon: '🌾' },
  { crop: 'Maize (मक्का)', price: 2090, change: +135, icon: '🌽' },
  { crop: 'Gram (चना)', price: 5440, change: +105, icon: '🫘' },
  { crop: 'Mustard (सरसों)', price: 5650, change: +200, icon: '🌱' },
  { crop: 'Soybean (सोयाबीन)', price: 4892, change: -30, icon: '🌿' },
  { crop: 'Cotton (कपास)', price: 7121, change: +501, icon: '🌸' },
  { crop: 'Sugarcane (गन्ना)', price: 340, change: +10, icon: '🎋' },
];

const cropPriceMap = {
  'Wheat (गेहूँ)': 2275,
  'Paddy / Rice (धान)': 2183,
  'Maize (मक्का)': 2090,
  'Gram / Chana (चना)': 5440,
  'Mustard (सरसों)': 5650,
  'Soybean (सोयाबीन)': 4892,
  'Cotton (कपास)': 7121,
  'Sugarcane (गन्ना)': 340
};

// PROCUREMENT CENTERS
const centers = [
  { id: 0, name: 'Mandi Road Procurement Center', addr: 'Mandi Road, Ludhiana, Punjab', dist: '2.1 km', crowd: 'High', crowdPct: 78, slots: 12, icon: '🏢' },
  { id: 1, name: 'GT Road Procurement Hub', addr: 'GT Road, Khanna, Punjab', dist: '5.4 km', crowd: 'Low', crowdPct: 24, slots: 45, icon: '🏛️' },
  { id: 2, name: 'Civil Lines Center', addr: 'Civil Lines, Ludhiana', dist: '7.2 km', crowd: 'Medium', crowdPct: 55, slots: 28, icon: '🏬' },
  { id: 3, name: 'Sector 21 Mandi', addr: 'Sector 21, Patiala', dist: '12.8 km', crowd: 'Low', crowdPct: 18, slots: 60, icon: '🏗️' },
];

// TIME SLOTS
const timeSlots = [
  { time: '6:00 AM', avail: true },
  { time: '7:00 AM', avail: true },
  { time: '8:00 AM', avail: false },
  { time: '9:00 AM', avail: false },
  { time: '10:00 AM', avail: true },
  { time: '11:00 AM', avail: true },
  { time: '12:00 PM', avail: false },
  { time: '2:00 PM', avail: true },
  { time: '3:00 PM', avail: true },
  { time: '4:00 PM', avail: true },
  { time: '5:00 PM', avail: true },
  { time: '6:00 PM', avail: false },
];

// SAMPLE COMPLAINTS
const sampleComplaints = [
  { id: 'CMP-001', cat: 'Fake Weighing', center: 'Mandi Road Center', date: '2024-03-15', status: 'Under Review', desc: 'Scale showed 10 qtl less than actual weight.' },
  { id: 'CMP-002', cat: 'Payment Delayed', center: 'GT Road Hub', date: '2024-03-10', status: 'Resolved', desc: 'Payment was pending for 15 days, now credited.' },
];

// AGENT GATE QUEUE
const agentQueue = [
  { token: 'A-039', name: 'Harpal Singh', crop: 'Wheat', qty: 32, status: 'done' },
  { token: 'A-040', name: 'Gurmeet Kaur', crop: 'Paddy', qty: 18, status: 'done' },
  { token: 'A-041', name: 'Balwinder Kumar', crop: 'Wheat', qty: 45, status: 'current' },
  { token: 'A-042', name: 'Sukhdev Singh', crop: 'Mustard', qty: 22, status: 'pending' },
  { token: 'A-043', name: 'Rajinder Pal', crop: 'Wheat', qty: 38, status: 'pending' },
  { token: 'A-044', name: 'Amarjit Kaur', crop: 'Gram', qty: 15, status: 'pending' },
];
