/**
 * Vollständige Fahrzeugdatenbank — alle Marken & Modelle
 * Kostenlos, lokal, keine API nötig.
 * Quellen: Öffentliche Zulassungsstatistiken (KBA), Hersteller-Websites
 */

export interface CarBrand {
  name: string;
  country: string;
  models: string[];
}

export const CAR_DATABASE: CarBrand[] = [
  {
    name: 'Abarth',
    country: 'IT',
    models: ['500', '595', '695', '124 Spider', 'Punto', 'Grande Punto'],
  },
  {
    name: 'Alfa Romeo',
    country: 'IT',
    models: [
      '145', '146', '147', '155', '156', '159', '164', '166',
      'Brera', 'GTV', 'GT', 'Giulia', 'Giulietta', 'Mito',
      'Spider', 'Stelvio', 'Tonale', '4C', '33', '75',
    ],
  },
  {
    name: 'Alpine',
    country: 'FR',
    models: ['A110', 'A110 S', 'A110 GT', 'A310', 'A610'],
  },
  {
    name: 'Aston Martin',
    country: 'GB',
    models: [
      'DB7', 'DB9', 'DB11', 'DBS', 'DBX',
      'Vantage', 'Vanquish', 'Rapide', 'Virage',
    ],
  },
  {
    name: 'Audi',
    country: 'DE',
    models: [
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
      'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'Q8 e-tron',
      'TT', 'TTS', 'TTRS', 'TT RS',
      'R8',
      'e-tron', 'e-tron GT',
      'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q3', 'RS Q8',
      'S1', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
      'SQ2', 'SQ5', 'SQ7', 'SQ8',
      '80', '90', '100', '200',
    ],
  },
  {
    name: 'Bentley',
    country: 'GB',
    models: [
      'Arnage', 'Azure', 'Bentayga', 'Continental GT', 'Continental Flying Spur',
      'Flying Spur', 'Mulsanne',
    ],
  },
  {
    name: 'BMW',
    country: 'DE',
    models: [
      '1er', '2er', '3er', '4er', '5er', '6er', '7er', '8er',
      'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
      'iX', 'iX1', 'iX3', 'i3', 'i4', 'i5', 'i7',
      'Z3', 'Z4',
      'M2', 'M3', 'M4', 'M5', 'M8', 'M135i', 'M235i', 'M240i', 'M340i', 'M440i', 'M550i',
      'X3 M', 'X4 M', 'X5 M', 'X6 M',
      '1M', 'M1',
    ],
  },
  {
    name: 'Bugatti',
    country: 'FR',
    models: ['Chiron', 'Veyron', 'Bolide', 'Divo', 'EB 110'],
  },
  {
    name: 'Cadillac',
    country: 'US',
    models: ['ATS', 'CT4', 'CT5', 'CT6', 'CTS', 'Escalade', 'SRX', 'XT4', 'XT5', 'XT6'],
  },
  {
    name: 'Chevrolet',
    country: 'US',
    models: [
      'Aveo', 'Camaro', 'Captiva', 'Corvette', 'Cruze',
      'Epica', 'Equinox', 'Kalos', 'Lacetti', 'Malibu',
      'Matiz', 'Orlando', 'Silverado', 'Spark', 'Tahoe', 'Trax',
    ],
  },
  {
    name: 'Chrysler',
    country: 'US',
    models: ['300C', '300M', 'Grand Voyager', 'Pacifica', 'PT Cruiser', 'Sebring', 'Voyager'],
  },
  {
    name: 'Citroën',
    country: 'FR',
    models: [
      'Berlingo', 'C1', 'C2', 'C3', 'C3 Aircross', 'C3 Picasso',
      'C4', 'C4 Cactus', 'C4 Picasso', 'C4 SpaceTourer',
      'C5', 'C5 Aircross', 'C5 X', 'C6', 'C8',
      'DS3', 'DS4', 'DS5',
      'e-C4', 'Jumper', 'Jumpy', 'Nemo',
      'Saxo', 'SpaceTourer', 'Xantia', 'Xsara', 'ZX',
    ],
  },
  {
    name: 'Cupra',
    country: 'ES',
    models: ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan', 'Terramar'],
  },
  {
    name: 'Dacia',
    country: 'RO',
    models: [
      'Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan',
      'Logan MCV', 'Sandero', 'Sandero Stepway', 'Spring',
    ],
  },
  {
    name: 'Daewoo',
    country: 'KR',
    models: ['Kalos', 'Lacetti', 'Lanos', 'Leganza', 'Matiz', 'Nubira', 'Rezzo'],
  },
  {
    name: 'Dodge',
    country: 'US',
    models: ['Challenger', 'Charger', 'Durango', 'Journey', 'Nitro', 'Ram', 'Viper'],
  },
  {
    name: 'DS Automobiles',
    country: 'FR',
    models: ['DS 3', 'DS 3 Crossback', 'DS 4', 'DS 5', 'DS 7 Crossback', 'DS 9'],
  },
  {
    name: 'Ferrari',
    country: 'IT',
    models: [
      '296 GTB', '308', '328', '348', '360', '456', '458', '488',
      'California', 'F355', 'F40', 'F50', 'F430', 'F8 Tributo',
      'GTC4Lusso', 'LaFerrari', 'Maranello', 'Portofino',
      'Roma', 'SF90 Stradale', 'Testarossa', '812 Superfast',
    ],
  },
  {
    name: 'Fiat',
    country: 'IT',
    models: [
      '124 Spider', '500', '500C', '500e', '500L', '500X',
      'Bravo', 'Brava', 'Croma', 'Doblo', 'Ducato',
      'Freemont', 'Grande Punto', 'Idea',
      'Multipla', 'Panda', 'Punto', 'Qubo',
      'Scudo', 'Sedici', 'Stilo', 'Tipo', 'Ulysse',
    ],
  },
  {
    name: 'Ford',
    country: 'US',
    models: [
      'B-Max', 'C-Max', 'EcoSport', 'Edge', 'Explorer',
      'Fiesta', 'Focus', 'Fusion', 'Galaxy',
      'Grand C-Max', 'Ka', 'Ka+', 'Kuga',
      'Mondeo', 'Mustang', 'Mustang Mach-E',
      'Puma', 'Ranger', 'S-Max', 'Tourneo', 'Transit',
      'Bronco',
    ],
  },
  {
    name: 'Genesis',
    country: 'KR',
    models: ['G70', 'G80', 'G90', 'GV70', 'GV80'],
  },
  {
    name: 'Honda',
    country: 'JP',
    models: [
      'Accord', 'Civic', 'CR-V', 'CR-Z', 'e',
      'FR-V', 'HR-V', 'Insight', 'Jazz',
      'Legend', 'NSX', 'Pilot', 'Prelude',
      'Stream', 'ZR-V',
    ],
  },
  {
    name: 'Hyundai',
    country: 'KR',
    models: [
      'Accent', 'Bayon', 'Coupé', 'Elantra',
      'Getz', 'i10', 'i20', 'i30', 'i40',
      'Ioniq', 'Ioniq 5', 'Ioniq 6',
      'ix20', 'ix35', 'Kona', 'Kona Electric',
      'Matrix', 'Nexo', 'Santa Fe', 'Sonata',
      'Terracan', 'Trajet', 'Tucson',
    ],
  },
  {
    name: 'Infiniti',
    country: 'JP',
    models: ['EX', 'FX', 'G', 'M', 'Q30', 'Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX70', 'QX80'],
  },
  {
    name: 'Jaguar',
    country: 'GB',
    models: [
      'E-Pace', 'E-Type', 'F-Pace', 'F-Type',
      'I-Pace', 'S-Type', 'X-Type', 'XE', 'XF', 'XJ', 'XK',
    ],
  },
  {
    name: 'Jeep',
    country: 'US',
    models: [
      'Avenger', 'Cherokee', 'Commander', 'Compass',
      'Grand Cherokee', 'Patriot', 'Renegade',
      'Wrangler',
    ],
  },
  {
    name: 'Kia',
    country: 'KR',
    models: [
      'Carens', 'Cee\'d', 'EV6', 'EV9',
      'Niro', 'Optima', 'Picanto',
      'ProCee\'d', 'Rio', 'Sorento',
      'Soul', 'Sportage', 'Stinger',
      'Stonic', 'Venga', 'XCeed',
    ],
  },
  {
    name: 'Lamborghini',
    country: 'IT',
    models: [
      'Aventador', 'Countach', 'Diablo', 'Gallardo',
      'Huracán', 'Murciélago', 'Reventón', 'Urus',
    ],
  },
  {
    name: 'Lancia',
    country: 'IT',
    models: ['Delta', 'Kappa', 'Musa', 'Phedra', 'Stratos', 'Thesis', 'Voyager', 'Ypsilon'],
  },
  {
    name: 'Land Rover',
    country: 'GB',
    models: [
      'Defender', 'Discovery', 'Discovery Sport',
      'Freelander', 'Range Rover',
      'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar',
    ],
  },
  {
    name: 'Lexus',
    country: 'JP',
    models: [
      'CT', 'ES', 'GS', 'GX', 'IS', 'LC', 'LFA',
      'LS', 'LX', 'NX', 'RC', 'RX', 'UX',
    ],
  },
  {
    name: 'Lincoln',
    country: 'US',
    models: ['Aviator', 'Continental', 'Corsair', 'MKC', 'MKX', 'MKZ', 'Navigator'],
  },
  {
    name: 'Lotus',
    country: 'GB',
    models: ['Elise', 'Emira', 'Evija', 'Evora', 'Exige', 'Seven'],
  },
  {
    name: 'Maserati',
    country: 'IT',
    models: ['Ghibli', 'GranCabrio', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  },
  {
    name: 'Maybach',
    country: 'DE',
    models: ['57', '62', 'GLS 600', 'S 580', 'S 680'],
  },
  {
    name: 'Mazda',
    country: 'JP',
    models: [
      '2', '3', '5', '6',
      'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-9',
      'MX-30', 'MX-5',
      'RX-7', 'RX-8',
    ],
  },
  {
    name: 'McLaren',
    country: 'GB',
    models: [
      '540C', '570S', '600LT', '620R', '650S', '675LT',
      '720S', '750S', '765LT',
      'Artura', 'Elva', 'GT', 'P1', 'Senna', 'Speedtail',
    ],
  },
  {
    name: 'Mercedes-Benz',
    country: 'DE',
    models: [
      'A-Klasse', 'B-Klasse', 'C-Klasse', 'CLA', 'CLS',
      'E-Klasse', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS',
      'G-Klasse', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS',
      'S-Klasse', 'SL', 'SLK', 'SLC',
      'V-Klasse', 'Vito', 'Sprinter',
      'AMG GT', 'AMG GT 4-Türer',
      'Citan', 'EQV', 'Marco Polo',
      '190', '200', '220', '230', '260', '280', '300', '320', '350', '380', '400', '420', '450', '500', '560', '600',
    ],
  },
  {
    name: 'MG',
    country: 'CN',
    models: ['3', '4', '5', 'HS', 'Marvel R', 'MG4', 'ZS', 'ZS EV'],
  },
  {
    name: 'MINI',
    country: 'GB',
    models: [
      'Cabrio', 'Coupé', 'Clubman', 'Countryman',
      'Electric', 'One', 'Cooper', 'Cooper S',
      'John Cooper Works', 'Paceman', 'Roadster',
    ],
  },
  {
    name: 'Mitsubishi',
    country: 'JP',
    models: [
      'ASX', 'Carisma', 'Colt', 'Eclipse Cross',
      'Galant', 'Grandis', 'L200', 'Lancer',
      'Outlander', 'Pajero', 'Space Star',
    ],
  },
  {
    name: 'Morgan',
    country: 'GB',
    models: ['3 Wheeler', 'Aero 8', 'Aeromax', 'Plus Four', 'Plus Six', 'Roadster'],
  },
  {
    name: 'Nissan',
    country: 'JP',
    models: [
      '350Z', '370Z', 'Ariya',
      'Evalia', 'GT-R', 'Juke',
      'Leaf', 'Micra', 'Murano',
      'Navara', 'Note', 'NV200',
      'Pathfinder', 'Pixo', 'Pulsar',
      'Qashqai', 'Tiida', 'Townstar',
      'X-Trail',
    ],
  },
  {
    name: 'Opel',
    country: 'DE',
    models: [
      'Adam', 'Agila', 'Antara', 'Astra',
      'Cascada', 'Combo', 'Corsa',
      'Crossland', 'Frontera', 'Grandland',
      'Insignia', 'Karl', 'Meriva',
      'Mokka', 'Omega', 'Signum',
      'Tigra', 'Vectra', 'Vivaro', 'Zafira',
    ],
  },
  {
    name: 'Peugeot',
    country: 'FR',
    models: [
      '1007', '107', '108', '2008', '206', '207',
      '208', '3008', '306', '307', '308',
      '4007', '4008', '407', '408', '5008',
      '508', '607', 'Bipper', 'e-208', 'e-2008',
      'Expert', 'Partner', 'Rifter', 'Traveller',
    ],
  },
  {
    name: 'Porsche',
    country: 'DE',
    models: [
      '718 Boxster', '718 Cayman',
      '911', '918 Spyder',
      'Boxster', 'Cayenne', 'Cayman',
      'Macan', 'Panamera', 'Taycan',
    ],
  },
  {
    name: 'Renault',
    country: 'FR',
    models: [
      'Arkana', 'Austral', 'Captur', 'Clio',
      'Espace', 'Express', 'Fluence',
      'Grand Scénic', 'Kadjar', 'Kangoo',
      'Koleos', 'Laguna', 'Latitude',
      'Master', 'Megane', 'Modus',
      'Rafale', 'Scenic', 'Symbol',
      'Talisman', 'Traffic', 'Twingo',
      'Twizy', 'Vel Satis', 'Zoe',
    ],
  },
  {
    name: 'Rolls-Royce',
    country: 'GB',
    models: [
      'Cullinan', 'Dawn', 'Ghost', 'Phantom',
      'Silver Shadow', 'Silver Spirit', 'Silver Spur',
      'Spectre', 'Wraith',
    ],
  },
  {
    name: 'Saab',
    country: 'SE',
    models: ['9-3', '9-4X', '9-5', '9-7X', '900', '9000'],
  },
  {
    name: 'SEAT',
    country: 'ES',
    models: [
      'Alhambra', 'Altea', 'Arona', 'Ateca',
      'Cordoba', 'Exeo', 'Ibiza',
      'Leon', 'Mii', 'Tarraco',
      'Toledo',
    ],
  },
  {
    name: 'Škoda',
    country: 'CZ',
    models: [
      'Citigo', 'Enyaq', 'Fabia',
      'Kamiq', 'Karoq', 'Kodiaq',
      'Octavia', 'Rapid', 'Roomster',
      'Scala', 'Superb', 'Yeti',
    ],
  },
  {
    name: 'Smart',
    country: 'DE',
    models: [
      'Forfour', 'Fortwo', 'Roadster',
      '#1', '#3',
    ],
  },
  {
    name: 'SsangYong',
    country: 'KR',
    models: ['Korando', 'Musso', 'Rexton', 'Rodius', 'Tivoli', 'XLV'],
  },
  {
    name: 'Subaru',
    country: 'JP',
    models: [
      'BRZ', 'Crosstrek', 'Forester',
      'Impreza', 'Legacy', 'Levorg',
      'Outback', 'Solterra', 'Tribeca', 'WRX', 'XV',
    ],
  },
  {
    name: 'Suzuki',
    country: 'JP',
    models: [
      'Alto', 'Baleno', 'Celerio',
      'Ignis', 'Jimny', 'Kizashi',
      'Liana', 'S-Cross', 'Splash',
      'Swace', 'Swift', 'SX4', 'Vitara', 'Wagon R+',
    ],
  },
  {
    name: 'Tesla',
    country: 'US',
    models: ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y', 'Roadster'],
  },
  {
    name: 'Toyota',
    country: 'JP',
    models: [
      'Auris', 'Avensis', 'Aygo',
      'bZ4X', 'C-HR', 'Camry',
      'Corolla', 'Corolla Cross',
      'GR86', 'GR Supra', 'GR Yaris',
      'Highlander', 'Hilux',
      'Land Cruiser', 'Mirai',
      'Prius', 'Prius+', 'ProAce',
      'RAV4', 'Sequoia', 'Urban Cruiser',
      'Verso', 'Yaris', 'Yaris Cross',
    ],
  },
  {
    name: 'Volkswagen',
    country: 'DE',
    models: [
      'Amarok', 'Arteon', 'Beetle',
      'Caddy', 'California', 'Caravelle',
      'CC', 'Crafter', 'CrossGolf',
      'e-Golf', 'e-up!',
      'Golf', 'Golf Plus', 'Golf Sportsvan',
      'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz',
      'Jetta', 'Lupo',
      'Multivan', 'New Beetle',
      'Passat', 'Phaeton', 'Polo',
      'Scirocco', 'Sharan', 'T-Cross',
      'T-Roc', 'Tiguan', 'Tiguan Allspace',
      'Touareg', 'Touran', 'Transporter',
      'up!',
    ],
  },
  {
    name: 'Volvo',
    country: 'SE',
    models: [
      'C30', 'C40', 'C70',
      'EX30', 'EX90',
      'S40', 'S60', 'S80', 'S90',
      'V40', 'V50', 'V60', 'V70', 'V90',
      'XC40', 'XC60', 'XC70', 'XC90',
    ],
  },
];

/** Nur die Markennamen als sortierte Liste */
export const BRAND_NAMES: string[] = CAR_DATABASE
  .map(b => b.name)
  .sort((a, b) => a.localeCompare(b, 'de'));

/** Modelle für eine bestimmte Marke */
export function getModels(brand: string): string[] {
  const entry = CAR_DATABASE.find(
    b => b.name.toLowerCase() === brand.toLowerCase()
  );
  return entry ? entry.models.sort((a, b) => a.localeCompare(b, 'de')) : [];
}

/** Suche: Marke + Modell gleichzeitig filtern */
export function searchBrands(query: string): CarBrand[] {
  const q = query.toLowerCase().trim();
  if (!q) return CAR_DATABASE;
  return CAR_DATABASE.filter(
    b =>
      b.name.toLowerCase().includes(q) ||
      b.models.some(m => m.toLowerCase().includes(q))
  );
}
