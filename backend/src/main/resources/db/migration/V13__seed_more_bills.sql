-- Feature 5: mo rong seed data cho Bill Payment de FE demo phong phu hon.

-- Them hoa don UNPAID cho EVN Ha Noi
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0100223344', 'Do Van F', 'Hai Ba Trung, Ha Noi', 620500.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HANOI'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0100223344' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0100556677', 'Nguyen Thi G', 'Long Bien, Ha Noi', 450000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HANOI'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0100556677' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0100889900', 'Tran Hoang H', 'Dong Da, Ha Noi', 720000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HANOI'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0100889900' AND b.period = '07/2026');

-- EVN TP.HCM
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0200111222', 'Le Thi K', 'Quan 1, TP.HCM', 810000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0200111222' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0200333444', 'Vo Van L', 'Quan 3, TP.HCM', 690000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0200333444' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0200555666', 'Bui Thi M', 'Quan Binh Thanh, TP.HCM', 540500.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0200555666' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'PE0200777888', 'Hoang Van N', 'Quan 7, TP.HCM', 930000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'EVN_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'PE0200777888' AND b.period = '07/2026');

-- SAWACO
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'ND0200778899', 'Ngo Van P', 'Quan 5, TP.HCM', 220000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'SAWACO'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'ND0200778899' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'ND0200334455', 'Ly Thi Q', 'Quan 10, TP.HCM', 145500.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'SAWACO'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'ND0200334455' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'ND0200667788', 'Doan Van R', 'Quan Tan Binh, TP.HCM', 310000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'SAWACO'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'ND0200667788' AND b.period = '07/2026');

-- VNPT Ha Noi
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'INT030088990', 'Truong Thi S', 'Tay Ho, Ha Noi', 300000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'VNPT_HN'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'INT030088990' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'INT030099001', 'Nguyen Van T', 'Thanh Xuan, Ha Noi', 220000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'VNPT_HN'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'INT030099001' AND b.period = '07/2026');

-- FPT TP.HCM
INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'FPT040022334', 'Pham Van U', 'Quan Phu Nhuan, TP.HCM', 350000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'FPT_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'FPT040022334' AND b.period = '07/2026');

INSERT INTO bills (provider_id, customer_code, customer_name, address, amount, period, status)
SELECT p.id, 'FPT040033445', 'Dang Thi V', 'Quan Go Vap, TP.HCM', 280000.00, '07/2026', 'UNPAID'
FROM bill_providers p WHERE p.code = 'FPT_HCM'
  AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.provider_id = p.id AND b.customer_code = 'FPT040033445' AND b.period = '07/2026');
