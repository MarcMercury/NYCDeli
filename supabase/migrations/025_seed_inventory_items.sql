-- Seed inventory items for camp infrastructure
-- Categories: shade_structure, tool, large_equipment, container, kitchen_item, av_equip, electrical, plumbing, furniture, other, bm_utility

INSERT INTO build_inventory (category, name, size_w, size_l, quantity_expected, sort_order) VALUES

-- bm_utility
('bm_utility', 'CAMP Boundaries', '350', '125', 1, 1),

-- large_equipment
('large_equipment', 'Reefer Truck', '12', '30', 1, 1),
('large_equipment', 'Bike Trailer', '12', '50', 1, 2),
('large_equipment', 'Dumpster', '10', '20', 1, 3),

-- electrical
('electrical', 'Generator', '10', '15', 1, 1),
('electrical', 'Distro Box', '3', '3', 4, 2),
('electrical', 'Swamp Coolers', '2', '4', 7, 3),

-- plumbing
('plumbing', 'Porto', '5', '5', 1, 1),
('plumbing', 'Water Tank', '10', '10', 1, 2),
('plumbing', 'Greywater Tank', '5', '5', 3, 3),
('plumbing', 'Sinks', '2', '3', 1, 4),

-- shade_structure
('shade_structure', 'Public Chill Tent', '20', '30', 1, 1),
('shade_structure', 'Camp Chill Tent', '20', '30', 1, 2),
('shade_structure', 'Single Shade Sail/Box', NULL, NULL, 1, 3),
('shade_structure', 'Other Tents/Shade', NULL, NULL, 1, 4),
('shade_structure', 'Other Tents/Shade', NULL, NULL, 1, 5),

-- container
('container', 'Container 1', '10', '20', 1, 1),
('container', 'Container 2', '10', '20', 1, 2),
('container', 'Container 3', '10', '20', 1, 3),
('container', 'Container 4', '10', '20', 1, 4),

-- kitchen_item
('kitchen_item', 'Ice Machine', '3', '3', 1, 1),

-- furniture
('furniture', 'Dining Benches', '3', '8', 8, 1);
