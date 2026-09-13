-- =======================================================
-- AgriQueue+ | MySQL Database Schema & Seed Data
-- =======================================================

CREATE DATABASE IF NOT EXISTS agriqueue_plus;
USE agriqueue_plus;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    role ENUM('farmer', 'admin', 'distributor') NOT NULL DEFAULT 'farmer',
    avatar VARCHAR(10) DEFAULT 'R',
    aadhaar VARCHAR(10) DEFAULT 'XXXX',
    state VARCHAR(50) DEFAULT 'Punjab',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CROPS & MSP RATES TABLE
CREATE TABLE IF NOT EXISTS crops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    price_change INT NOT NULL DEFAULT 0,
    icon VARCHAR(10) DEFAULT '🌾'
);

-- 3. PROCUREMENT CENTERS TABLE
CREATE TABLE IF NOT EXISTS centers (
    id INT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    distance VARCHAR(20) NOT NULL,
    crowd_level VARCHAR(20) NOT NULL DEFAULT 'Medium',
    crowd_pct INT NOT NULL DEFAULT 50,
    available_slots INT NOT NULL DEFAULT 20,
    icon VARCHAR(10) DEFAULT '🏢'
);

-- 4. TIME SLOTS TABLE
CREATE TABLE IF NOT EXISTS time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_time VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- 5. BOOKINGS & QR TOKENS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    token VARCHAR(20) NOT NULL,
    farmer_name VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    vehicle VARCHAR(50) DEFAULT 'Tractor-Trolley',
    moisture DECIMAL(5, 2) DEFAULT 12.00,
    center_id INT NOT NULL,
    center_name VARCHAR(150) NOT NULL,
    booking_date DATE NOT NULL,
    slot_time VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'Confirmed',
    price INT NOT NULL DEFAULT 2275,
    qr_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMPLAINTS & GRIEVANCES TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    center_name VARCHAR(150) NOT NULL,
    incident_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Under Review',
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

-- 7. AGENT GATE QUEUE TABLE
CREATE TABLE IF NOT EXISTS agent_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(20) NOT NULL,
    farmer_name VARCHAR(100) NOT NULL,
    crop VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. WEIGHBRIDGE & QUALITY CONTROL TABLE
CREATE TABLE IF NOT EXISTS weighments (
    id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL,
    token VARCHAR(20) NOT NULL,
    farmer_name VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    gross_weight DECIMAL(10, 2) NOT NULL,
    tare_weight DECIMAL(10, 2) NOT NULL,
    net_weight_kg DECIMAL(10, 2) NOT NULL,
    net_quintals DECIMAL(10, 2) NOT NULL,
    moisture DECIMAL(5, 2) NOT NULL,
    moisture_threshold DECIMAL(5, 2) NOT NULL DEFAULT 14.00,
    quality_grade VARCHAR(50) NOT NULL,
    status ENUM('ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'ACCEPTED',
    rejection_reason TEXT NULL,
    msp_rate INT NOT NULL,
    final_amount DECIMAL(12, 2) NOT NULL,
    weighed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 9. IMMUTABLE PROCUREMENT & SECURITY AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    details JSON NULL,
    ip VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- SEED INITIAL DATA
-- =======================================================

-- Users
INSERT IGNORE INTO users (id, name, phone, role, avatar, aadhaar, state) VALUES
('USR-001', 'Ramesh Kumar', '+91 98765 43210', 'farmer', 'R', '4521', 'Punjab'),
('USR-002', 'District Procurement Officer', '+91 99999 88888', 'admin', 'A', 'XXXX', 'Punjab'),
('USR-003', 'Center Weighing Agent', '+91 77777 66666', 'distributor', 'D', 'XXXX', 'Punjab');

-- Crops
INSERT IGNORE INTO crops (id, name, price, price_change, icon) VALUES
(1, 'Wheat (गेहूँ)', 2275, 25, '🌾'),
(2, 'Paddy (धान)', 2183, 143, '🌾'),
(3, 'Maize (मक्का)', 2090, 135, '🌽'),
(4, 'Gram (चना)', 5440, 105, '🫘'),
(5, 'Mustard (सरसों)', 5650, 200, '🌱'),
(6, 'Soybean (सोयाबीन)', 4892, -30, '🌿'),
(7, 'Cotton (कपास)', 7121, 501, '🌸'),
(8, 'Sugarcane (गन्ना)', 340, 10, '🎋');

-- Centers
INSERT IGNORE INTO centers (id, name, address, distance, crowd_level, crowd_pct, available_slots, icon) VALUES
(0, 'Mandi Road Procurement Center', 'Mandi Road, Ludhiana, Punjab', '2.1 km', 'High', 78, 12, '🏢'),
(1, 'GT Road Procurement Hub', 'GT Road, Khanna, Punjab', '5.4 km', 'Low', 24, 45, '🏛️'),
(2, 'Civil Lines Center', 'Civil Lines, Ludhiana', '7.2 km', 'Medium', 55, 28, '🏬'),
(3, 'Sector 21 Mandi', 'Sector 21, Patiala', '12.8 km', 'Low', 18, 60, '🏗️');

-- Time Slots
INSERT IGNORE INTO time_slots (id, slot_time, is_available) VALUES
(1, '6:00 AM', TRUE),
(2, '7:00 AM', TRUE),
(3, '8:00 AM', FALSE),
(4, '9:00 AM', FALSE),
(5, '10:00 AM', TRUE),
(6, '11:00 AM', TRUE),
(7, '12:00 PM', FALSE),
(8, '2:00 PM', TRUE),
(9, '3:00 PM', TRUE),
(10, '4:00 PM', TRUE),
(11, '5:00 PM', TRUE),
(12, '6:00 PM', FALSE);

-- Sample Bookings
INSERT IGNORE INTO bookings (id, token, farmer_name, crop, quantity, vehicle, moisture, center_id, center_name, booking_date, slot_time, status, price, qr_payload) VALUES
('BK-1709200000000', 'A-041', 'Balwinder Kumar', 'Wheat (गेहूँ)', 45.00, 'Tractor-Trolley', 12.00, 0, 'Mandi Road Procurement Center', '2026-08-31', '10:00 AM', 'Confirmed', 2275, 'A-041|Balwinder Kumar|Wheat|Mandi Road Procurement Center|2026-08-31|10:00 AM');

-- Sample Complaints
INSERT IGNORE INTO complaints (id, category, center_name, incident_date, status, description) VALUES
('CMP-001', 'Fake Weighing', 'Mandi Road Procurement Center', '2026-08-15', 'Under Review', 'Scale showed 10 qtl less than actual weight.'),
('CMP-002', 'Payment Delayed', 'GT Road Procurement Hub', '2026-08-10', 'Resolved', 'Payment was pending for 15 days, now credited.');

-- Agent Queue
INSERT IGNORE INTO agent_queue (id, token, farmer_name, crop, quantity, status) VALUES
(1, 'A-039', 'Harpal Singh', 'Wheat', 32.00, 'done'),
(2, 'A-040', 'Gurmeet Kaur', 'Paddy', 18.00, 'done'),
(3, 'A-041', 'Balwinder Kumar', 'Wheat', 45.00, 'current'),
(4, 'A-042', 'Sukhdev Singh', 'Mustard', 22.00, 'pending'),
(5, 'A-043', 'Rajinder Pal', 'Wheat', 38.00, 'pending'),
(6, 'A-044', 'Amarjit Kaur', 'Gram', 15.00, 'pending');
