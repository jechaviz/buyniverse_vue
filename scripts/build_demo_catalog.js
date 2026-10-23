#!/usr/bin/env node
/**
 * Builds the demo's hardware catalog: what a buyer would put on a shopping list
 * (monitors, laptops, desktops, printers, keyboards, networking, storage, power...).
 *
 * The product groups and the specs each group carries come from the electroprice-ec
 * taxonomy (config/catalog/product_taxonomy.json there); the models are typical business
 * purchases. Prices are sample MXN prices and every supplier is fictional. Offers are
 * generated deterministically, so running this twice gives the same file.
 *
 *   node scripts/build_demo_catalog.js          rewrites the generated block of app/data/demo.js
 *   node scripts/build_demo_catalog.js --check  fails when the block is out of date
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "app", "data", "demo.js");
const START = "  // <generated:catalog> scripts/build_demo_catalog.js, do not edit by hand";
const END = "  // </generated:catalog>";

// Suppliers with a price list. `focus` are the groups they stock best (they also carry others, less often).
const LISTED = [
  { id: "sup-19", name: "Mayoreo Cómputo MX", contact: "Rosa Almazán", city: "cdmx", region: "CDMX", focus: ["Laptops", "Desktops", "Monitors"], rating: 4.7, score: 91, risk: 16, hours: 3, lead: 2 },
  { id: "sup-20", name: "Sierra Distribución IT", contact: "Héctor Sierra", city: "monterrey", region: "NL", focus: ["Networking", "Storage", "Power & UPS"], rating: 4.5, score: 88, risk: 21, hours: 4, lead: 3 },
  { id: "sup-21", name: "ByteBodega", contact: "Lucía Ferrer", city: "guadalajara", region: "JAL", focus: ["Keyboards & mice", "Headsets & webcams", "Docks & cables"], rating: 4.4, score: 85, risk: 24, hours: 2, lead: 2 },
  { id: "sup-22", name: "CompuNorte", contact: "Gabriel Cano", city: "tijuana", region: "BCN", focus: ["Laptops", "Components", "Storage"], rating: 4.3, score: 83, risk: 27, hours: 6, lead: 4 },
  { id: "sup-23", name: "OfiTech Mayoreo", contact: "Diana Ibarra", city: "queretaro", region: "QRO", focus: ["Printers", "Keyboards & mice", "Monitors"], rating: 4.6, score: 89, risk: 19, hours: 3, lead: 3 },
  { id: "sup-24", name: "Pacífico Digital", contact: "Mario Quiroz", city: "guadalajara", region: "JAL", focus: ["Phones", "Tablets", "Displays & TVs"], rating: 4.5, score: 87, risk: 22, hours: 5, lead: 3 },
  { id: "sup-25", name: "Cima Hardware", contact: "Elena Cota", city: "monterrey", region: "NL", focus: ["Desktops", "Components", "Power & UPS"], rating: 4.2, score: 82, risk: 29, hours: 8, lead: 5 },
  { id: "sup-26", name: "TecnoAndes Import", contact: "Julián Ortega", city: "bogota", region: "DC", focus: ["Laptops", "Tablets", "Headsets & webcams"], rating: 4.1, score: 80, risk: 33, hours: 12, lead: 9, country: "CO" },
  { id: "sup-27", name: "Impresión Total", contact: "Carmen Roldán", city: "cdmx", region: "CDMX", focus: ["Printers"], rating: 4.8, score: 93, risk: 14, hours: 2, lead: 2 },
  { id: "sup-28", name: "Redes del Bajío", contact: "Iker Valdés", city: "queretaro", region: "QRO", focus: ["Networking", "Security cameras"], rating: 4.6, score: 90, risk: 17, hours: 4, lead: 3 },
];
// Suppliers with no price list: they quote on request, fast. sup-16 already exists in the demo.
const QUICK = [
  { id: "sup-29", name: "Equipos Especiales del Golfo", contact: "Ramón Beltrán", city: "veracruz", region: "VER", rating: 4.4, score: 84, risk: 25, hours: 2, lead: 5 },
  { id: "sup-30", name: "Importadora Meridiana", contact: "Alma Cetina", city: "merida", region: "YUC", rating: 4.3, score: 82, risk: 28, hours: 3, lead: 7 },
];
const PRICED_EXISTING = ["sup-1"]; // Innovate Inc. also lists hardware

// [group, brand, model, base price MXN, specs, unit]. Spec keys follow the electroprice taxonomy of each group.
const P = [];
const add = (group, brand, model, base, specs, unit) => P.push({ group, brand, model, base, specs, unit: unit || "Each" });

// Monitors: size / resolution / refresh_rate / panel / ports
add("Monitors", "Dell", "P2422H 24\"", 3150, { size: '24"', resolution: "1920×1080", refresh_rate: "60 Hz", panel: "IPS", ports: "HDMI, DisplayPort, VGA, USB hub" });
add("Monitors", "Dell", "U2723QE 27\" 4K", 9890, { size: '27"', resolution: "3840×2160", refresh_rate: "60 Hz", panel: "IPS Black", ports: "HDMI, DP, USB-C 90 W, RJ45" });
add("Monitors", "LG", "24MR400 24\"", 2390, { size: '24"', resolution: "1920×1080", refresh_rate: "75 Hz", panel: "IPS", ports: "HDMI, VGA" });
add("Monitors", "LG", "27UP650 27\" 4K", 6190, { size: '27"', resolution: "3840×2160", refresh_rate: "60 Hz", panel: "IPS", ports: "2×HDMI, DisplayPort" });
add("Monitors", "Samsung", "S33C 27\" curvo", 4290, { size: '27"', resolution: "1920×1080", refresh_rate: "75 Hz", panel: "VA curvo", ports: "HDMI, DisplayPort" });
add("Monitors", "Samsung", "Odyssey G9 49\"", 20990, { size: '49"', resolution: "5120×1440", refresh_rate: "240 Hz", panel: "VA curvo", ports: "HDMI 2.1, DisplayPort 1.4" });
add("Monitors", "HP", "M24f 24\"", 2790, { size: '24"', resolution: "1920×1080", refresh_rate: "75 Hz", panel: "IPS", ports: "HDMI, VGA" });
add("Monitors", "HP", "E27q G5 27\" QHD", 5390, { size: '27"', resolution: "2560×1440", refresh_rate: "75 Hz", panel: "IPS", ports: "HDMI, DP, USB hub" });
add("Monitors", "Lenovo", "ThinkVision T24i 24\"", 3390, { size: '24"', resolution: "1920×1080", refresh_rate: "60 Hz", panel: "IPS", ports: "HDMI, DP, VGA" });
add("Monitors", "ASUS", "ProArt PA278CV 27\"", 7490, { size: '27"', resolution: "2560×1440", refresh_rate: "75 Hz", panel: "IPS", ports: "HDMI, DP, USB-C" });

// Laptops: processor / memory / storage / display / battery
add("Laptops", "Lenovo", "ThinkPad E14 Gen 6", 17490, { processor: "Intel Core i5-1335U", memory: "16 GB", storage: "512 GB SSD", display: '14" WUXGA', battery: "47 Wh" });
add("Laptops", "Lenovo", "ThinkPad X1 Carbon Gen 12", 42990, { processor: "Intel Core Ultra 7 155U", memory: "32 GB", storage: "1 TB SSD", display: '14" WUXGA', battery: "57 Wh" });
add("Laptops", "Dell", "Latitude 5440", 21990, { processor: "Intel Core i5-1335U", memory: "16 GB", storage: "512 GB SSD", display: '14" FHD', battery: "54 Wh" });
add("Laptops", "Dell", "XPS 13 9340", 35990, { processor: "Intel Core Ultra 7 155H", memory: "16 GB", storage: "512 GB SSD", display: '13.4" FHD+', battery: "55 Wh" });
add("Laptops", "HP", "ProBook 440 G10", 15990, { processor: "Intel Core i5-1335U", memory: "8 GB", storage: "512 GB SSD", display: '14" FHD', battery: "51 Wh" });
add("Laptops", "HP", "EliteBook 840 G10", 32990, { processor: "Intel Core i7-1355U", memory: "16 GB", storage: "512 GB SSD", display: '14" WUXGA', battery: "51 Wh" });
add("Laptops", "Apple", "MacBook Air 13\" M3", 24990, { processor: "Apple M3", memory: "16 GB", storage: "512 GB SSD", display: '13.6" Liquid Retina', battery: "52.6 Wh" });
add("Laptops", "ASUS", "ExpertBook B1 B1402", 13490, { processor: "Intel Core i5-1235U", memory: "8 GB", storage: "256 GB SSD", display: '14" FHD', battery: "42 Wh" });

// Desktops: processor / memory / storage / graphics / form_factor
add("Desktops", "Dell", "OptiPlex 7010 SFF", 17990, { processor: "Intel Core i5-13500", memory: "16 GB", storage: "512 GB SSD", graphics: "Intel UHD 770", form_factor: "Small form factor" });
add("Desktops", "HP", "ProDesk 400 G9 Mini", 13490, { processor: "Intel Core i5-12500T", memory: "16 GB", storage: "512 GB SSD", graphics: "Intel UHD 770", form_factor: "Mini PC" });
add("Desktops", "Lenovo", "ThinkCentre M70q Gen 4", 14490, { processor: "Intel Core i5-13400T", memory: "16 GB", storage: "512 GB SSD", graphics: "Intel UHD 730", form_factor: "Tiny" });
add("Desktops", "Apple", "Mac mini M2", 12990, { processor: "Apple M2", memory: "8 GB", storage: "256 GB SSD", graphics: "10-core GPU", form_factor: "Mini PC" });
add("Desktops", "Dell", "Precision 3680 Tower", 38990, { processor: "Intel Core i7-14700", memory: "32 GB", storage: "1 TB SSD", graphics: "NVIDIA RTX A2000 12 GB", form_factor: "Tower" });
add("Desktops", "HP", "All-in-One 24 Pro", 17290, { processor: "Intel Core i5-1335U", memory: "16 GB", storage: "512 GB SSD", graphics: "Intel Iris Xe", form_factor: 'All-in-one 23.8"' });

// Printers & scanners: technology / color / speed / connectivity / paper_size
add("Printers", "HP", "LaserJet Pro M404dn", 6890, { technology: "Laser", color: "Monochrome", speed: "40 ppm", connectivity: "Ethernet, USB, duplex", paper_size: "A4 / Letter" });
add("Printers", "HP", "Color LaserJet Pro M479fdw", 13990, { technology: "Laser", color: "Color", speed: "28 ppm", connectivity: "Wi-Fi, Ethernet, fax, ADF", paper_size: "A4 / Letter" });
add("Printers", "Brother", "HL-L5100DN", 5990, { technology: "Laser", color: "Monochrome", speed: "40 ppm", connectivity: "Ethernet, USB, duplex", paper_size: "A4 / Letter" });
add("Printers", "Brother", "MFC-L8900CDW", 14990, { technology: "Laser", color: "Color", speed: "33 ppm", connectivity: "Wi-Fi, Ethernet, ADF", paper_size: "A4 / Letter" });
add("Printers", "Epson", "EcoTank L3250", 3890, { technology: "Ink tank", color: "Color", speed: "10 ppm", connectivity: "Wi-Fi, USB", paper_size: "A4 / Letter" });
add("Printers", "Epson", "WorkForce Pro WF-C5890", 16490, { technology: "Inkjet", color: "Color", speed: "25 ppm", connectivity: "Wi-Fi, Ethernet, fax, ADF", paper_size: "A4 / Letter / Legal" });
add("Printers", "Canon", "imageCLASS MF455dw", 9690, { technology: "Laser", color: "Monochrome", speed: "40 ppm", connectivity: "Wi-Fi, Ethernet, ADF", paper_size: "A4 / Letter / Legal" });
add("Printers", "Zebra", "ZD421 label printer", 7290, { technology: "Thermal transfer", color: "Monochrome", speed: "152 mm/s", connectivity: "USB, Ethernet, Bluetooth", paper_size: "Labels up to 108 mm" });
add("Printers", "Fujitsu", "fi-8170 document scanner", 21990, { technology: "Sheet-fed scanner", color: "Color", speed: "70 ppm", connectivity: "USB 3.2", paper_size: "A4 to A3 (carrier)" });

// Keyboards & mice (accessories): type / compatibility / material / color / warranty
add("Keyboards & mice", "Logitech", "MK270 wireless combo", 590, { type: "Keyboard + mouse", compatibility: "Windows, ChromeOS", material: "Plastic", color: "Black", warranty: "3 years" }, "Set");
add("Keyboards & mice", "Logitech", "MX Keys S + MX Master 3S", 4290, { type: "Keyboard + mouse", compatibility: "Windows, macOS, Linux", material: "Plastic / aluminium", color: "Graphite", warranty: "1 year" }, "Set");
add("Keyboards & mice", "Logitech", "K120 wired keyboard", 249, { type: "Keyboard", compatibility: "Windows, Linux", material: "Plastic", color: "Black", warranty: "3 years" });
add("Keyboards & mice", "Logitech", "M185 wireless mouse", 249, { type: "Mouse", compatibility: "Windows, macOS", material: "Plastic", color: "Grey", warranty: "1 year" });
add("Keyboards & mice", "HP", "125 wired keyboard", 289, { type: "Keyboard", compatibility: "Windows", material: "Plastic", color: "Black", warranty: "1 year" });
add("Keyboards & mice", "Microsoft", "Ergonomic Keyboard", 1890, { type: "Keyboard", compatibility: "Windows", material: "Plastic, cushioned palm rest", color: "Black", warranty: "1 year" });
add("Keyboards & mice", "Logitech", "MX Vertical ergonomic mouse", 1990, { type: "Mouse", compatibility: "Windows, macOS", material: "Plastic", color: "Graphite", warranty: "1 year" });
add("Keyboards & mice", "Kensington", "Pro Fit Ergo mouse", 690, { type: "Mouse", compatibility: "Windows, macOS", material: "Plastic", color: "Black", warranty: "1 year" });

// Networking: ports / speed / wireless_standard / management / power
add("Networking", "TP-Link", "Archer AX55 router", 1190, { ports: "4×GbE", speed: "AX3000", wireless_standard: "Wi-Fi 6", management: "App", power: "AC adapter" });
add("Networking", "TP-Link", "TL-SG1024D 24-port switch", 2290, { ports: "24×GbE", speed: "1 Gbps", wireless_standard: "-", management: "Unmanaged", power: "AC" });
add("Networking", "Ubiquiti", "UniFi U6 Pro access point", 3290, { ports: "1×GbE PoE", speed: "AX5400", wireless_standard: "Wi-Fi 6", management: "UniFi controller", power: "PoE 802.3af" });
add("Networking", "Ubiquiti", "UniFi Switch Lite 16 PoE", 4290, { ports: "16×GbE (8 PoE)", speed: "1 Gbps", wireless_standard: "-", management: "UniFi controller", power: "45 W PoE budget" });
add("Networking", "Cisco", "CBS250-24T-4G switch", 6890, { ports: "24×GbE + 4×SFP", speed: "1 Gbps", wireless_standard: "-", management: "Smart (web)", power: "AC" });
add("Networking", "Cisco", "Catalyst 1000-24P-4G-L", 17490, { ports: "24×GbE PoE+ + 4×SFP", speed: "1 Gbps", wireless_standard: "-", management: "Managed L2", power: "195 W PoE" });
add("Networking", "Fortinet", "FortiGate 40F firewall", 11990, { ports: "5×GbE", speed: "5 Gbps firewall", wireless_standard: "-", management: "FortiOS", power: "AC" });
add("Networking", "Panduit", "Patch cord Cat6 2 m (pack of 10)", 690, { ports: "RJ45", speed: "1 Gbps", wireless_standard: "-", management: "-", power: "-" }, "Pack");

// Storage: capacity / interface / form_factor / speed / warranty
add("Storage", "Samsung", "970 EVO Plus 1 TB", 1790, { capacity: "1 TB", interface: "NVMe PCIe 3.0", form_factor: "M.2 2280", speed: "3,500 MB/s", warranty: "5 years" });
add("Storage", "Kingston", "KC3000 2 TB", 3190, { capacity: "2 TB", interface: "NVMe PCIe 4.0", form_factor: "M.2 2280", speed: "7,000 MB/s", warranty: "5 years" });
add("Storage", "Seagate", "IronWolf 8 TB NAS", 4690, { capacity: "8 TB", interface: "SATA 6 Gb/s", form_factor: '3.5"', speed: "7,200 rpm", warranty: "3 years" });
add("Storage", "WD", "My Passport 2 TB", 1690, { capacity: "2 TB", interface: "USB 3.0", form_factor: "Portable", speed: "5,400 rpm", warranty: "3 years" });
add("Storage", "Synology", "DS923+ NAS (4 bays)", 12990, { capacity: "Diskless, up to 4 bays", interface: "SATA / M.2", form_factor: "Tower", speed: "2×GbE + expansion", warranty: "3 years" });
add("Storage", "SanDisk", "Ultra 128 GB USB 3.0 (pack of 10)", 1590, { capacity: "128 GB × 10", interface: "USB 3.0", form_factor: "Pen drive", speed: "130 MB/s", warranty: "5 years" }, "Pack");

// Power: capacity / output_power / runtime / outlets / warranty
add("Power & UPS", "APC", "Back-UPS BX1500M", 3390, { capacity: "1500 VA", output_power: "900 W", runtime: "≈ 8 min at 450 W", outlets: "10", warranty: "3 years" });
add("Power & UPS", "APC", "Smart-UPS SMT1500C", 15990, { capacity: "1500 VA", output_power: "1000 W", runtime: "≈ 14 min at 500 W", outlets: "8", warranty: "3 years" });
add("Power & UPS", "Eaton", "5E 850i", 1890, { capacity: "850 VA", output_power: "480 W", runtime: "≈ 6 min at 240 W", outlets: "6", warranty: "2 years" });
add("Power & UPS", "Forza", "FX-1500LCD", 2390, { capacity: "1500 VA", output_power: "750 W", runtime: "≈ 5 min at 400 W", outlets: "8", warranty: "2 years" });
add("Power & UPS", "Tripp Lite", "Surge protector 12 outlets", 790, { capacity: "-", output_power: "1800 W", runtime: "-", outlets: "12", warranty: "Lifetime" });

// Tablets: display / processor / memory / storage / battery / os
add("Tablets", "Apple", "iPad 10th gen 64 GB", 8490, { display: '10.9" Liquid Retina', processor: "A14 Bionic", memory: "4 GB", storage: "64 GB", battery: "Up to 10 h", os: "iPadOS" });
add("Tablets", "Samsung", "Galaxy Tab A9+ 64 GB", 4590, { display: '11" TFT 90 Hz', processor: "Snapdragon 695", memory: "4 GB", storage: "64 GB", battery: "7,040 mAh", os: "Android" });
add("Tablets", "Lenovo", "Tab M10 Plus Gen 3", 3190, { display: '10.6" 2K', processor: "Snapdragon 680", memory: "4 GB", storage: "128 GB", battery: "7,700 mAh", os: "Android" });
add("Tablets", "Microsoft", "Surface Pro 9", 23990, { display: '13" PixelSense', processor: "Intel Core i5-1235U", memory: "8 GB", storage: "256 GB", battery: "Up to 15.5 h", os: "Windows 11" });

// Headsets & webcams (headphones / accessories)
add("Headsets & webcams", "Jabra", "Evolve2 40 SE", 3590, { type: "On-ear headset", connectivity: "USB-A / Bluetooth", battery: "Up to 37 h", noise_cancelling: "Passive + mic noise reduction", weight: "≈ 150 g" });
add("Headsets & webcams", "Logitech", "H390 USB headset", 790, { type: "On-ear headset", connectivity: "USB-A", battery: "-", noise_cancelling: "Mic noise cancelling", weight: "≈ 200 g" });
add("Headsets & webcams", "Poly", "Voyager Focus 2 UC", 5290, { type: "Over-ear headset", connectivity: "Bluetooth / USB", battery: "Up to 19 h", noise_cancelling: "Hybrid ANC", weight: "≈ 177 g" });
add("Headsets & webcams", "Logitech", "C920 HD Pro webcam", 1390, { type: "Webcam", connectivity: "USB-A", battery: "-", noise_cancelling: "Dual mics", weight: "≈ 162 g" });
add("Headsets & webcams", "Logitech", "Brio 4K webcam", 3190, { type: "Webcam 4K", connectivity: "USB-C", battery: "-", noise_cancelling: "Dual mics", weight: "≈ 63 g" });
add("Headsets & webcams", "Jabra", "Speak 510 speakerphone", 2690, { type: "Conference speakerphone", connectivity: "USB / Bluetooth", battery: "Up to 15 h", noise_cancelling: "Echo cancellation", weight: "≈ 300 g" });

// Docks & cables (accessories)
add("Docks & cables", "Dell", "WD22TB4 Thunderbolt dock", 6990, { type: "Dock", compatibility: "Thunderbolt 4 / USB-C", material: "Metal", color: "Black", warranty: "3 years" });
add("Docks & cables", "Lenovo", "USB-C Dock Gen 2", 3590, { type: "Dock", compatibility: "USB-C", material: "Plastic", color: "Black", warranty: "3 years" });
add("Docks & cables", "Anker", "PowerExpand 8-in-1 hub", 1290, { type: "USB-C hub", compatibility: "USB-C", material: "Aluminium", color: "Grey", warranty: "18 months" });
add("Docks & cables", "Belkin", "USB-C to HDMI cable 2 m", 490, { type: "Cable", compatibility: "USB-C → HDMI 4K", material: "Braided", color: "Black", warranty: "2 years" });
add("Docks & cables", "Anker", "USB-C 100 W cable 1.8 m (pack of 5)", 890, { type: "Cable", compatibility: "USB-C PD 100 W", material: "Nylon", color: "Black", warranty: "18 months" }, "Pack");
add("Docks & cables", "Ugreen", "HDMI 2.1 cable 3 m", 290, { type: "Cable", compatibility: "HDMI 2.1 8K", material: "Braided", color: "Black", warranty: "1 year" });
add("Docks & cables", "Targus", "Laptop backpack 15.6\"", 890, { type: "Bag", compatibility: '15.6" laptops', material: "Polyester", color: "Black", warranty: "Lifetime" });
add("Docks & cables", "Kensington", "Laptop security lock", 590, { type: "Security cable", compatibility: "Nano / K-slot", material: "Steel", color: "Black", warranty: "2 years" });

// TVs and large displays: size / panel / resolution / refresh_rate / hdr / ports
add("Displays & TVs", "LG", "55UR8000 55\" 4K", 8490, { size: '55"', panel: "LED", resolution: "4K UHD", refresh_rate: "60 Hz", hdr: "HDR10", ports: "3×HDMI" });
add("Displays & TVs", "Samsung", "Crystal UHD 65\" CU8000", 11490, { size: '65"', panel: "LED", resolution: "4K UHD", refresh_rate: "60 Hz", hdr: "HDR10+", ports: "3×HDMI" });
add("Displays & TVs", "Samsung", "QM75B 75\" signage display", 28990, { size: '75"', panel: "LED commercial", resolution: "4K UHD", refresh_rate: "60 Hz", hdr: "HDR10", ports: "HDMI, USB, RS-232" });
add("Displays & TVs", "LG", "OLED C4 65\"", 33990, { size: '65"', panel: "OLED evo", resolution: "4K UHD", refresh_rate: "120 Hz", hdr: "Dolby Vision / HDR10", ports: "4×HDMI 2.1" });

// Phones: display / processor / memory / storage / camera / battery / os
add("Phones", "Samsung", "Galaxy A55 5G 128 GB", 7490, { display: '6.6" Super AMOLED', processor: "Exynos 1480", memory: "8 GB", storage: "128 GB", camera: "50 MP", battery: "5,000 mAh", os: "Android" });
add("Phones", "Apple", "iPhone 15 128 GB", 16990, { display: '6.1" Super Retina XDR', processor: "A16 Bionic", memory: "6 GB", storage: "128 GB", camera: "48 MP", battery: "Up to 20 h video", os: "iOS" });
add("Phones", "Motorola", "Moto G54 5G 256 GB", 3990, { display: '6.5" IPS 120 Hz', processor: "Dimensity 7020", memory: "8 GB", storage: "256 GB", camera: "50 MP", battery: "5,000 mAh", os: "Android" });

// Security cameras: resolution / lens / night_vision / storage / power
add("Security cameras", "Hikvision", "DS-2CD2143G2 4 MP dome", 2390, { resolution: "4 MP", lens: "2.8 mm", night_vision: "Up to 40 m", storage: "microSD / NVR", power: "PoE" });
add("Security cameras", "Dahua", "IPC-HFW2441 4 MP bullet", 2190, { resolution: "4 MP", lens: "3.6 mm", night_vision: "Up to 50 m", storage: "microSD / NVR", power: "PoE" });
add("Security cameras", "Hikvision", "DS-7608NI 8-ch NVR", 3490, { resolution: "Up to 8 MP", lens: "-", night_vision: "-", storage: "1 SATA bay (disk not included)", power: "AC" });

// Components: type / compatibility / capacity / speed / warranty
add("Components", "Kingston", "FURY 16 GB DDR4-3200 SODIMM", 890, { type: "RAM", compatibility: "Laptops DDR4", capacity: "16 GB", speed: "3200 MT/s", warranty: "Lifetime" });
add("Components", "Crucial", "32 GB DDR5-5600 DIMM kit", 2490, { type: "RAM", compatibility: "Desktops DDR5", capacity: "2×16 GB", speed: "5600 MT/s", warranty: "Lifetime" });
add("Components", "Intel", "Core i5-14400 processor", 5290, { type: "CPU", compatibility: "LGA 1700", capacity: "10 cores", speed: "up to 4.7 GHz", warranty: "3 years" });
add("Components", "NVIDIA", "RTX A2000 12 GB workstation GPU", 12990, { type: "GPU", compatibility: "PCIe 4.0 x16", capacity: "12 GB GDDR6", speed: "-", warranty: "3 years" });

// Software: license_type / term / users / platform / language
add("Software", "Microsoft", "Microsoft 365 Business Standard", 2490, { license_type: "Subscription", term: "12 months", users: "1 user", platform: "Windows, macOS, web", language: "Multi" }, "License");
add("Software", "Kaspersky", "Endpoint Security Cloud (10 devices)", 4290, { license_type: "Subscription", term: "12 months", users: "10 devices", platform: "Windows, macOS, mobile", language: "Multi" }, "License");
add("Software", "Adobe", "Acrobat Pro for teams", 3890, { license_type: "Subscription", term: "12 months", users: "1 user", platform: "Windows, macOS", language: "Multi" }, "License");

// ---------------------------------------------------------------------------------------------

const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (n) => Math.round(n * 100) / 100;
const TERMS = ["Net 30", "Net 15", "Net 45", "Prepaid", "Net 30"];

const KIND = {
  Monitors: "monitors", Laptops: "laptops", Desktops: "desktops", Printers: "printers_scanners", "Keyboards & mice": "accessories", Networking: "networking",
  Storage: "storage", "Power & UPS": "power", Tablets: "tablets", "Headsets & webcams": "headphones", "Docks & cables": "accessories", "Displays & TVs": "tvs",
  Phones: "smartphones", "Security cameras": "security", Components: "components", Software: "software",
};

const vendors = [...LISTED, ...PRICED_EXISTING.map((id) => ({ id, name: "Innovate Inc.", focus: ["Laptops", "Monitors", "Docks & cables"], rating: 4.8, score: 94, risk: 14, lead: 3, existing: true }))];

const products = P.map((item, index) => {
  const id = "cat-" + String(index + 1).padStart(3, "0");
  const sku = (item.brand.slice(0, 3) + "-" + slug(item.model).replace(/-/g, "").slice(0, 10)).toUpperCase();
  const reference = money(item.base * 1.13);
  // Each product is stocked by the suppliers that focus on its group plus, now and then, a generalist.
  const chosen = vendors.filter((v) => {
    const focused = v.focus.includes(item.group);
    return hash(id + v.id) < (focused ? 0.85 : 0.18);
  });
  if (chosen.length > 6) chosen.sort((a, b) => hash(id + a.id + "k") - hash(id + b.id + "k")).length = 6;
  if (chosen.length < 2) vendors.filter((v) => !chosen.includes(v)).sort((a, b) => hash(id + a.id) - hash(id + b.id)).slice(0, 2 - chosen.length).forEach((v) => chosen.push(v));
  const offers = chosen.map((v, i) => {
    const spread = 0.93 + hash(id + v.id + "p") * 0.14;                     // 0.93 .. 1.07 of the base price
    const focusedBonus = v.focus.includes(item.group) ? 0.985 : 1;
    const price = money(item.base * spread * focusedBonus * (v.currency === "USD" ? 1 : 1));
    return {
      id: `offer-${id}-${String.fromCharCode(97 + i)}`, supplierId: v.id, price,
      leadDays: Math.max(1, Math.round(v.lead + hash(id + v.id + "l") * 3 - 1)),
      stock: Math.max(2, Math.round((item.base > 15000 ? 6 : item.base > 3000 ? 24 : 120) * (0.3 + hash(id + v.id + "s") * 1.6))),
      terms: TERMS[Math.floor(hash(id + v.id + "t") * TERMS.length)], compliant: hash(id + v.id + "c") > 0.06,
    };
  }).sort((a, b) => a.price - b.price);
  return {
    id, sku, description: `${item.brand} ${item.model}`, brand: item.brand, model: item.model, rate: offers[0].price, referencePrice: reference, unit: item.unit, currency: "MXN",
    category: item.group, kind: KIND[item.group], preferredSupplierId: offers[0].supplierId, procurementRule: "Approved catalog item", specs: item.specs, offers,
  };
});

const sup = (v, listed) => ({
  id: v.id, name: v.name, category: "Technology", contact: v.contact, email: slug(v.contact.split(" ")[0]) + "@" + slug(v.name) + ".example", totalSpend: 0, status: v.score >= 90 ? "Preferred" : v.score >= 85 ? "Reliable" : "Qualified",
  rating: v.rating, score: v.score, risk: v.risk, esg: 70 + Math.round(hash(v.id + "e") * 15), onTime: 88 + Math.round(hash(v.id + "o") * 9), responseRate: 88 + Math.round(hash(v.id + "r") * 11), certifications: ["ISO 9001"],
  marketplace: {
    listed: true, sector: "technology", category: "hardware", capabilities: listed ? ["computing", "peripherals", "price-list"] : ["computing", "quotes-on-request"], country: v.country || "MX", region: v.region, city: v.city,
    headline: listed ? "IT hardware with a live price list" : "No price list: send the list, get an offer within hours",
    about: listed ? "Distributor of business hardware. Prices and stock are published and refreshed every day." : "Sources special orders and large lots. Has no published price list, so it answers each request with its own offer.",
    founded: 2005 + Math.round(hash(v.id + "f") * 14), employees: "11-50", leadDays: v.lead, minOrder: 500, currency: v.currency || "MXN", languages: ["Spanish"], coverage: "National", responseHours: v.hours, verified: true,
    reviews: 30 + Math.round(hash(v.id + "v") * 90), accent: ["violet", "amber", "emerald"][Math.floor(hash(v.id + "a") * 3)], priceList: listed,
  },
});

const newSuppliers = [...LISTED.map((v) => sup(v, true)), ...QUICK.map((v) => sup(v, false))];
const block = [
  START,
  "  const catalogSuppliers = " + JSON.stringify(newSuppliers) + ";",
  "  const catalogProducts = " + JSON.stringify(products) + ";",
  "  suppliers.push(...catalogSuppliers);",
  "  products.push(...catalogProducts);",
  "  // Existing hardware suppliers that answer on request, with no price list.",
  "  suppliers.forEach((supplier) => { if (supplier.id === 'sup-16' && supplier.marketplace) supplier.marketplace.priceList = false; if (supplier.id === 'sup-1' && supplier.marketplace) supplier.marketplace.priceList = true; });",
  END,
].join("\n");

const source = fs.readFileSync(target, "utf8");
let next;
if (source.includes(START)) next = source.replace(new RegExp(START.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "[\\s\\S]*?" + END.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")), () => block);
else {
  const anchor = "  const seed = {";
  if (!source.includes(anchor)) throw new Error("demo.js has no `const seed` anchor");
  next = source.replace(anchor, () => block + "\n\n" + anchor);
}
if (process.argv.includes("--check")) {
  if (next !== source) { console.error("app/data/demo.js catalog block is out of date: run node scripts/build_demo_catalog.js"); process.exit(1); }
  console.log("demo catalog up to date (" + products.length + " products)"); process.exit(0);
}
fs.writeFileSync(target, next);
console.log("wrote " + products.length + " products, " + newSuppliers.length + " suppliers, " + products.reduce((n, p) => n + p.offers.length, 0) + " offers");
