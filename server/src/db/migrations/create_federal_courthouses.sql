-- Phase 1: Create Table
CREATE TABLE IF NOT EXISTS app.federal_courthouses (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,          -- full official name
  short_name            TEXT,                   -- common name
  courthouse_type       TEXT NOT NULL,          -- see CHECK below
  district              TEXT NOT NULL,          -- e.g. "Northern District of California"
  circuit               TEXT NOT NULL,          -- e.g. "Ninth Circuit"
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,          -- 2-char abbreviation
  postal_code           TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  location              GEOGRAPHY(Point,4326),  -- match agency_offices convention
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  source_url            TEXT,
  created_at            TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  CONSTRAINT federal_courthouses_type_check CHECK (
    courthouse_type = ANY (ARRAY[
      'district_court',
      'circuit_court_of_appeals',
      'bankruptcy_court',
      'magistrate_court',
      'specialty_court'
    ])
  )
);

-- Spatial index matching agency_offices convention
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_location
  ON app.federal_courthouses USING GIST (location);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_state
  ON app.federal_courthouses (state);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_district
  ON app.federal_courthouses (district);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_circuit
  ON app.federal_courthouses (circuit);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_type
  ON app.federal_courthouses (courthouse_type);

-- Auto-populate location from lat/lng on insert/update
CREATE OR REPLACE FUNCTION app.update_courthouse_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courthouse_location_trigger ON app.federal_courthouses;
CREATE TRIGGER courthouse_location_trigger
  BEFORE INSERT OR UPDATE ON app.federal_courthouses
  FOR EACH ROW EXECUTE FUNCTION app.update_courthouse_location();

-- Grant read access to grafana_reader
GRANT SELECT ON app.federal_courthouses TO grafana_reader;

-- Phase 2: Populate Data
INSERT INTO app.federal_courthouses 
  (name, short_name, courthouse_type, district, circuit, address_line1, city, state, postal_code, latitude, longitude, notes)
VALUES
  -- FIRST CIRCUIT
  ('Edward T. Gignoux United States Courthouse', 'District of Maine - Portland', 'district_court', 'District of Maine', 'First Circuit', '156 Federal Street', 'Portland', 'ME', '04101', 43.6591, -70.2568, 'Main courthouse for District of Maine'),
  ('United States Courthouse', 'District of Maine - Bangor', 'district_court', 'District of Maine', 'First Circuit', '202 Harlow Street', 'Bangor', 'ME', '04401', 44.8041, -68.7712, 'Divisional courthouse'),
  ('John Joseph Moakley United States Courthouse', 'First Circuit - Boston', 'circuit_court_of_appeals', 'First Circuit', 'First Circuit', '1 Courthouse Way', 'Boston', 'MA', '02210', 42.3541, -71.0428, 'Seat of the First Circuit Court of Appeals'),
  ('John Joseph Moakley United States Courthouse', 'District of Massachusetts - Boston', 'district_court', 'District of Massachusetts', 'First Circuit', '1 Courthouse Way', 'Boston', 'MA', '02210', 42.3541, -71.0428, 'Main district courthouse'),
  ('Donohue Federal Building and United States Courthouse', 'District of Massachusetts - Worcester', 'district_court', 'District of Massachusetts', 'First Circuit', '595 Main Street', 'Worcester', 'MA', '01608', 42.2625, -71.8023, 'Divisional courthouse'),
  ('Springfield Federal Building and United States Courthouse', 'District of Massachusetts - Springfield', 'district_court', 'District of Massachusetts', 'First Circuit', '300 State Street', 'Springfield', 'MA', '01105', 42.1015, -72.5836, 'Divisional courthouse'),
  ('Warren B. Rudman United States Courthouse', 'District of New Hampshire - Concord', 'district_court', 'District of New Hampshire', 'First Circuit', '55 Pleasant Street', 'Concord', 'NH', '03301', 43.2044, -71.5366, 'Main courthouse'),
  ('Federico Degetau Federal Building and United States Courthouse', 'District of Puerto Rico - Hato Rey', 'district_court', 'District of Puerto Rico', 'First Circuit', '150 Carlos Chardon Avenue', 'San Juan', 'PR', '00918', 18.4275, -66.0642, 'Main district courthouse'),
  ('Jose V. Toledo United States Post Office and Courthouse', 'District of Puerto Rico - Old San Juan', 'bankruptcy_court', 'District of Puerto Rico', 'First Circuit', '300 Recinto Sur Street', 'San Juan', 'PR', '00901', 18.4647, -66.1165, 'Historic courthouse'),
  ('United States Courthouse', 'District of Rhode Island - Providence', 'district_court', 'District of Rhode Island', 'First Circuit', '1 Exchange Terrace', 'Providence', 'RI', '02903', 41.8240, -71.4128, 'Main district courthouse'),

  -- SECOND CIRCUIT
  ('Richard C. Lee United States Courthouse', 'District of Connecticut - New Haven', 'district_court', 'District of Connecticut', 'Second Circuit', '141 Church Street', 'New Haven', 'CT', '06510', 41.3082, -72.9250, 'Main district courthouse'),
  ('Abraham A. Ribicoff Federal Building and United States Courthouse', 'District of Connecticut - Hartford', 'district_court', 'District of Connecticut', 'Second Circuit', '450 Main Street', 'Hartford', 'CT', '06103', 41.7637, -72.6740, 'Divisional courthouse'),
  ('Brien McMahon Federal Building and United States Courthouse', 'District of Connecticut - Bridgeport', 'district_court', 'District of Connecticut', 'Second Circuit', '915 Lafayette Boulevard', 'Bridgeport', 'CT', '06604', 41.1792, -73.1938, 'Divisional courthouse'),
  ('James T. Foley United States Courthouse', 'Northern District of New York - Albany', 'district_court', 'Northern District of New York', 'Second Circuit', '445 Broadway', 'Albany', 'NY', '12207', 42.6526, -73.7562, 'Main district courthouse'),
  ('Hanley Federal Building and United States Courthouse', 'Northern District of New York - Syracuse', 'district_court', 'Northern District of New York', 'Second Circuit', '100 South Clinton Street', 'Syracuse', 'NY', '13261', 43.0481, -76.1500, 'Divisional courthouse'),
  ('Thurgood Marshall United States Courthouse', 'Second Circuit - Manhattan', 'circuit_court_of_appeals', 'Second Circuit', 'Second Circuit', '40 Foley Square', 'New York', 'NY', '10007', 40.7143, -74.0055, 'Seat of the Second Circuit Court of Appeals'),
  ('Daniel Patrick Moynihan United States Courthouse', 'Southern District of New York - Manhattan', 'district_court', 'Southern District of New York', 'Second Circuit', '500 Pearl Street', 'New York', 'NY', '10007', 40.7140, -74.0020, 'Main district courthouse for SDNY'),
  ('Charles L. Brieant Jr. Federal Building and United States Courthouse', 'Southern District of New York - White Plains', 'district_court', 'Southern District of New York', 'Second Circuit', '300 Quarropas Street', 'White Plains', 'NY', '10601', 41.0330, -73.7620, 'SDNY White Plains division'),
  ('Theodore Roosevelt United States Courthouse', 'Eastern District of New York - Brooklyn', 'district_court', 'Eastern District of New York', 'Second Circuit', '225 Cadman Plaza East', 'Brooklyn', 'NY', '11201', 40.6940, -73.9900, 'Main district courthouse for EDNY'),
  ('Alphonse M. D''Amato United States Courthouse', 'Eastern District of New York - Central Islip', 'district_court', 'Eastern District of New York', 'Second Circuit', '100 Federal Plaza', 'Central Islip', 'NY', '11722', 40.7600, -73.2000, 'EDNY Long Island division'),
  ('Robert H. Jackson United States Courthouse', 'Western District of New York - Buffalo', 'district_court', 'Western District of New York', 'Second Circuit', '2 Niagara Square', 'Buffalo', 'NY', '14202', 42.8860, -78.8780, 'Main district courthouse'),
  ('Kenneth B. Keating Federal Building and United States Courthouse', 'Western District of New York - Rochester', 'district_court', 'Western District of New York', 'Second Circuit', '100 State Street', 'Rochester', 'NY', '14614', 43.1566, -77.6088, 'Divisional courthouse'),
  ('United States Post Office and Courthouse', 'District of Vermont - Burlington', 'district_court', 'District of Vermont', 'Second Circuit', '11 Elmwood Avenue', 'Burlington', 'VT', '05401', 44.4759, -73.2121, 'Main district courthouse'),
  ('United States Post Office and Courthouse', 'District of Vermont - Rutland', 'district_court', 'District of Vermont', 'Second Circuit', '151 West Street', 'Rutland', 'VT', '05701', 43.6067, -72.9781, 'Divisional courthouse'),

  -- THIRD CIRCUIT
  ('J. Caleb Boggs Federal Building and United States Courthouse', 'District of Delaware - Wilmington', 'district_court', 'District of Delaware', 'Third Circuit', '844 North King Street', 'Wilmington', 'DE', '19801', 39.7459, -75.5466, 'Main district courthouse'),
  ('Mitchell H. Cohen United States Courthouse', 'District of New Jersey - Camden', 'district_court', 'District of New Jersey', 'Third Circuit', '400 Cooper Street', 'Camden', 'NJ', '08102', 39.9440, -75.1200, 'Divisional courthouse'),
  ('Martin Luther King Jr. Federal Building and United States Courthouse', 'District of New Jersey - Newark', 'district_court', 'District of New Jersey', 'Third Circuit', '50 Walnut Street', 'Newark', 'NJ', '07102', 40.7357, -74.1724, 'Main district courthouse'),
  ('Clarkson S. Fisher Federal Building and United States Courthouse', 'District of New Jersey - Trenton', 'district_court', 'District of New Jersey', 'Third Circuit', '402 East State Street', 'Trenton', 'NJ', '08608', 40.2206, -74.7597, 'Divisional courthouse'),
  ('James A. Byrne United States Courthouse', 'Third Circuit - Philadelphia', 'circuit_court_of_appeals', 'Third Circuit', 'Third Circuit', '601 Market Street', 'Philadelphia', 'PA', '19106', 39.9510, -75.1510, 'Seat of the Third Circuit Court of Appeals'),
  ('James A. Byrne United States Courthouse', 'Eastern District of Pennsylvania - Philadelphia', 'district_court', 'Eastern District of Pennsylvania', 'Third Circuit', '601 Market Street', 'Philadelphia', 'PA', '19106', 39.9510, -75.1510, 'Main district courthouse'),
  ('Edward N. Cahn Federal Building and United States Courthouse', 'Eastern District of Pennsylvania - Allentown', 'district_court', 'Eastern District of Pennsylvania', 'Third Circuit', '504 West Hamilton Street', 'Allentown', 'PA', '18101', 40.6020, -75.4710, 'Divisional courthouse'),
  ('Sylvia H. Rambo United States Courthouse', 'Middle District of Pennsylvania - Harrisburg', 'district_court', 'Middle District of Pennsylvania', 'Third Circuit', '1501 North Sixth Street', 'Harrisburg', 'PA', '17102', 40.2737, -76.8844, 'Main district courthouse'),
  ('William J. Nealon Federal Building and United States Courthouse', 'Middle District of Pennsylvania - Scranton', 'district_court', 'Middle District of Pennsylvania', 'Third Circuit', '235 North Washington Avenue', 'Scranton', 'PA', '18503', 41.4089, -75.6624, 'Divisional courthouse'),
  ('Max Rosenn United States Courthouse', 'Middle District of Pennsylvania - Wilkes-Barre', 'district_court', 'Middle District of Pennsylvania', 'Third Circuit', '197 South Main Street', 'Wilkes-Barre', 'PA', '18701', 41.2459, -75.8812, 'Divisional courthouse'),
  ('Joseph F. Weis Jr. United States Courthouse', 'Western District of Pennsylvania - Pittsburgh', 'district_court', 'Western District of Pennsylvania', 'Third Circuit', '700 Grant Street', 'Pittsburgh', 'PA', '15219', 40.4406, -79.9959, 'Main district courthouse'),
  ('Erie Federal Courthouse and Post Office', 'Western District of Pennsylvania - Erie', 'district_court', 'Western District of Pennsylvania', 'Third Circuit', '17 South Park Row', 'Erie', 'PA', '16501', 42.1292, -80.0853, 'Divisional courthouse'),
  ('Almeric L. Christian Federal Building and United States Courthouse', 'District of the Virgin Islands - St. Croix', 'district_court', 'District of the Virgin Islands', 'Third Circuit', '3013 Estate Golden Rock', 'Christiansted', 'VI', '00820', 17.7466, -64.7032, 'Main district courthouse for St. Croix'),
  ('Ron de Lugo Federal Building and United States Courthouse', 'District of the Virgin Islands - St. Thomas', 'district_court', 'District of the Virgin Islands', 'Third Circuit', '5500 Veterans Drive', 'St. Thomas', 'VI', '00802', 18.3419, -64.9307, 'Main district courthouse for St. Thomas'),

  -- FOURTH CIRCUIT
  ('Edward A. Garmatz United States District Courthouse', 'District of Maryland - Baltimore', 'district_court', 'District of Maryland', 'Fourth Circuit', '101 West Lombard Street', 'Baltimore', 'MD', '21201', 39.2875, -76.6167, 'Main district courthouse'),
  ('United States Courthouse', 'District of Maryland - Greenbelt', 'district_court', 'District of Maryland', 'Fourth Circuit', '6500 Cherrywood Lane', 'Greenbelt', 'MD', '20770', 39.0089, -76.8981, 'Divisional courthouse'),
  ('Terry Sanford Federal Building and United States Courthouse', 'Eastern District of North Carolina - Raleigh', 'district_court', 'Eastern District of North Carolina', 'Fourth Circuit', '310 New Bern Avenue', 'Raleigh', 'NC', '27601', 35.7806, -78.6389, 'Main district courthouse'),
  ('United States Courthouse', 'Middle District of North Carolina - Greensboro', 'district_court', 'Middle District of North Carolina', 'Fourth Circuit', '324 West Market Street', 'Greensboro', 'NC', '27401', 36.0726, -79.7920, 'Main district courthouse'),
  ('Charles R. Jonas Federal Building and United States Courthouse', 'Western District of North Carolina - Charlotte', 'district_court', 'Western District of North Carolina', 'Fourth Circuit', '401 West Trade Street', 'Charlotte', 'NC', '28202', 35.2271, -80.8431, 'Main district courthouse'),
  ('Matthew J. Perry Jr. United States Courthouse', 'District of South Carolina - Columbia', 'district_court', 'District of South Carolina', 'Fourth Circuit', '901 Richland Street', 'Columbia', 'SC', '29201', 34.0007, -81.0348, 'Main district courthouse'),
  ('Lewis F. Powell Jr. United States Courthouse', 'Fourth Circuit - Richmond', 'circuit_court_of_appeals', 'Fourth Circuit', 'Fourth Circuit', '1000 East Main Street', 'Richmond', 'VA', '23219', 37.5407, -77.4360, 'Seat of the Fourth Circuit Court of Appeals'),
  ('Spottswood W. Robinson III and Robert R. Merhige Jr. United States Courthouse', 'Eastern District of Virginia - Richmond', 'district_court', 'Eastern District of Virginia', 'Fourth Circuit', '701 East Broad Street', 'Richmond', 'VA', '23219', 37.5430, -77.4340, 'Main district courthouse'),
  ('Albert V. Bryan United States Courthouse', 'Eastern District of Virginia - Alexandria', 'district_court', 'Eastern District of Virginia', 'Fourth Circuit', '401 Courthouse Square', 'Alexandria', 'VA', '22314', 38.8048, -77.0469, 'Divisional courthouse'),
  ('Walter E. Hoffman United States Courthouse', 'Eastern District of Virginia - Norfolk', 'district_court', 'Eastern District of Virginia', 'Fourth Circuit', '600 Granby Street', 'Norfolk', 'VA', '23510', 36.8508, -76.2859, 'Divisional courthouse'),
  ('Richard H. Poff Federal Building', 'Western District of Virginia - Roanoke', 'district_court', 'Western District of Virginia', 'Fourth Circuit', '210 Franklin Road SW', 'Roanoke', 'VA', '24011', 37.2710, -79.9414, 'Main district courthouse'),
  ('Robert C. Byrd United States Courthouse', 'Southern District of West Virginia - Charleston', 'district_court', 'Southern District of West Virginia', 'Fourth Circuit', '300 Virginia Street East', 'Charleston', 'WV', '25301', 38.3498, -81.6326, 'Main district courthouse'),
  ('W. Craig Broadwater Federal Building and United States Courthouse', 'Northern District of West Virginia - Martinsburg', 'district_court', 'Northern District of West Virginia', 'Fourth Circuit', '217 West King Street', 'Martinsburg', 'WV', '25401', 39.4562, -77.9639, 'Main district courthouse'),

  -- FIFTH CIRCUIT
  ('John Minor Wisdom United States Court of Appeals Building', 'Fifth Circuit - New Orleans', 'circuit_court_of_appeals', 'Fifth Circuit', 'Fifth Circuit', '600 Camp Street', 'New Orleans', 'LA', '70130', 29.9490, -90.0700, 'Seat of the Fifth Circuit Court of Appeals'),
  ('Hale Boggs Federal Building and United States Courthouse', 'Eastern District of Louisiana - New Orleans', 'district_court', 'Eastern District of Louisiana', 'Fifth Circuit', '500 Poydras Street', 'New Orleans', 'LA', '70130', 29.9480, -90.0670, 'Main district courthouse'),
  ('Russell B. Long Federal Building and United States Courthouse', 'Middle District of Louisiana - Baton Rouge', 'district_court', 'Middle District of Louisiana', 'Fifth Circuit', '777 Florida Street', 'Baton Rouge', 'LA', '70801', 30.4507, -91.1871, 'Main district courthouse'),
  ('Tom Stagg United States Court House', 'Western District of Louisiana - Shreveport', 'district_court', 'Western District of Louisiana', 'Fifth Circuit', '300 Fannin Street', 'Shreveport', 'LA', '71101', 32.5122, -93.7503, 'Main district courthouse'),
  ('Thad Cochran United States Courthouse', 'Southern District of Mississippi - Jackson', 'district_court', 'Southern District of Mississippi', 'Fifth Circuit', '501 East Court Street', 'Jackson', 'MS', '39201', 32.2989, -90.1847, 'Main district courthouse'),
  ('William M. Colmer Federal Building and United States Courthouse', 'Southern District of Mississippi - Hattiesburg', 'district_court', 'Southern District of Mississippi', 'Fifth Circuit', '701 North Main Street', 'Hattiesburg', 'MS', '39401', 31.3271, -89.2903, 'Divisional courthouse'),
  ('United States Courthouse', 'Northern District of Mississippi - Oxford', 'district_court', 'Northern District of Mississippi', 'Fifth Circuit', '911 Jackson Avenue East', 'Oxford', 'MS', '38655', 34.3662, -89.5186, 'Main district courthouse'),
  ('Earle Cabell Federal Building and United States Courthouse', 'Northern District of Texas - Dallas', 'district_court', 'Northern District of Texas', 'Fifth Circuit', '1100 Commerce Street', 'Dallas', 'TX', '75242', 32.7794, -96.8011, 'Main district courthouse'),
  ('Eldon B. Mahon United States Courthouse', 'Northern District of Texas - Fort Worth', 'district_court', 'Northern District of Texas', 'Fifth Circuit', '501 West 10th Street', 'Fort Worth', 'TX', '76102', 32.7508, -97.3331, 'Divisional courthouse'),
  ('Bob Casey United States Courthouse', 'Southern District of Texas - Houston', 'district_court', 'Southern District of Texas', 'Fifth Circuit', '515 Rusk Street', 'Houston', 'TX', '77002', 29.7604, -95.3698, 'Main district courthouse'),
  ('United States Courthouse', 'Southern District of Texas - Galveston', 'district_court', 'Southern District of Texas', 'Fifth Circuit', '601 25th Street', 'Galveston', 'TX', '77550', 29.3013, -94.7936, 'Historic divisional courthouse'),
  ('Jack Brooks Federal Building and United States Courthouse', 'Eastern District of Texas - Beaumont', 'district_court', 'Eastern District of Texas', 'Fifth Circuit', '300 Willow Street', 'Beaumont', 'TX', '77701', 30.0841, -94.1014, 'Main district courthouse'),
  ('William M. Steger Federal Building and United States Courthouse', 'Eastern District of Texas - Tyler', 'district_court', 'Eastern District of Texas', 'Fifth Circuit', '211 West Ferguson Street', 'Tyler', 'TX', '75702', 32.3513, -95.3011, 'Divisional courthouse'),
  ('John H. Wood Jr. United States Courthouse', 'Western District of Texas - San Antonio', 'district_court', 'Western District of Texas', 'Fifth Circuit', '262 West Nueva Street', 'San Antonio', 'TX', '78207', 29.4241, -98.4936, 'Main district courthouse'),
  ('United States Courthouse', 'Western District of Texas - Austin', 'district_court', 'Western District of Texas', 'Fifth Circuit', '501 West 5th Street', 'Austin', 'TX', '78701', 30.2672, -97.7431, 'Divisional courthouse'),
  ('Albert Armendariz Sr. United States Courthouse', 'Western District of Texas - El Paso', 'district_court', 'Western District of Texas', 'Fifth Circuit', '525 Magoffin Avenue', 'El Paso', 'TX', '79901', 31.7587, -106.4869, 'Divisional courthouse'),

  -- SIXTH CIRCUIT
  ('Potter Stewart United States Courthouse', 'Sixth Circuit - Cincinnati', 'circuit_court_of_appeals', 'Sixth Circuit', 'Sixth Circuit', '100 East Fifth Street', 'Cincinnati', 'OH', '45202', 39.1015, -84.5125, 'Seat of the Sixth Circuit Court of Appeals'),
  ('Potter Stewart United States Courthouse', 'Southern District of Ohio - Cincinnati', 'district_court', 'Southern District of Ohio', 'Sixth Circuit', '100 East Fifth Street', 'Cincinnati', 'OH', '45202', 39.1015, -84.5125, 'Main district courthouse'),
  ('Joseph P. Kinneary United States Courthouse', 'Southern District of Ohio - Columbus', 'district_court', 'Southern District of Ohio', 'Sixth Circuit', '85 Marconi Boulevard', 'Columbus', 'OH', '43215', 39.9612, -83.0030, 'Divisional courthouse'),
  ('Carl B. Stokes United States Courthouse', 'Northern District of Ohio - Cleveland', 'district_court', 'Northern District of Ohio', 'Sixth Circuit', '801 West Superior Avenue', 'Cleveland', 'OH', '44113', 41.4993, -81.6944, 'Main district courthouse'),
  ('Gene Snyder United States Courthouse', 'Western District of Kentucky - Louisville', 'district_court', 'Western District of Kentucky', 'Sixth Circuit', '601 West Broadway', 'Louisville', 'KY', '40202', 38.2527, -85.7585, 'Main district courthouse'),
  ('Frank M. Scarlett Federal Building', 'Eastern District of Kentucky - Lexington', 'district_court', 'Eastern District of Kentucky', 'Sixth Circuit', '101 Barr Street', 'Lexington', 'KY', '40507', 38.0406, -84.5037, 'Main district courthouse'),
  ('Theodore Levin United States Courthouse', 'Eastern District of Michigan - Detroit', 'district_court', 'Eastern District of Michigan', 'Sixth Circuit', '231 West Lafayette Boulevard', 'Detroit', 'MI', '48226', 42.3314, -83.0458, 'Main district courthouse'),
  ('Gerald R. Ford Federal Building and United States Courthouse', 'Western District of Michigan - Grand Rapids', 'district_court', 'Western District of Michigan', 'Sixth Circuit', '110 Michigan Street NW', 'Grand Rapids', 'MI', '49503', 42.9634, -85.6681, 'Main district courthouse'),
  ('Fred D. Thompson United States Courthouse and Federal Building', 'Middle District of Tennessee - Nashville', 'district_court', 'Middle District of Tennessee', 'Sixth Circuit', '719 Church Street', 'Nashville', 'TN', '37203', 36.1627, -86.7816, 'Main district courthouse'),
  ('Clifford Davis and Odell Horton Federal Building', 'Western District of Tennessee - Memphis', 'district_court', 'Western District of Tennessee', 'Sixth Circuit', '167 North Main Street', 'Memphis', 'TN', '38103', 35.1495, -90.0490, 'Main district courthouse'),
  ('Howard H. Baker Jr. United States Courthouse', 'Eastern District of Tennessee - Knoxville', 'district_court', 'Eastern District of Tennessee', 'Sixth Circuit', '800 Market Street', 'Knoxville', 'TN', '37902', 35.9606, -83.9207, 'Main district courthouse'),

  -- SEVENTH CIRCUIT
  ('Everett McKinley Dirksen United States Courthouse', 'Seventh Circuit - Chicago', 'circuit_court_of_appeals', 'Seventh Circuit', 'Seventh Circuit', '219 South Dearborn Street', 'Chicago', 'IL', '60604', 41.8781, -87.6298, 'Seat of the Seventh Circuit Court of Appeals'),
  ('Everett McKinley Dirksen United States Courthouse', 'Northern District of Illinois - Chicago', 'district_court', 'Northern District of Illinois', 'Seventh Circuit', '219 South Dearborn Street', 'Chicago', 'IL', '60604', 41.8781, -87.6298, 'Main district courthouse'),
  ('Stanley J. Roszkowski United States Courthouse', 'Northern District of Illinois - Rockford', 'district_court', 'Northern District of Illinois', 'Seventh Circuit', '327 South Church Street', 'Rockford', 'IL', '61101', 42.2711, -89.0940, 'Divisional courthouse'),
  ('Paul Findley Federal Building and United States Courthouse', 'Central District of Illinois - Springfield', 'district_court', 'Central District of Illinois', 'Seventh Circuit', '600 East Monroe Street', 'Springfield', 'IL', '62701', 39.7999, -89.6461, 'Main district courthouse'),
  ('Melvin Price Federal Building and United States Courthouse', 'Southern District of Illinois - East St. Louis', 'district_court', 'Southern District of Illinois', 'Seventh Circuit', '750 Missouri Avenue', 'East St. Louis', 'IL', '62201', 38.6273, -90.1601, 'Main district courthouse'),
  ('Birch Bayh Federal Building and United States Courthouse', 'Southern District of Indiana - Indianapolis', 'district_court', 'Southern District of Indiana', 'Seventh Circuit', '46 East Ohio Street', 'Indianapolis', 'IN', '46204', 39.7684, -86.1581, 'Main district courthouse'),
  ('E. Ross Adair Federal Building and United States Courthouse', 'Northern District of Indiana - Fort Wayne', 'district_court', 'Northern District of Indiana', 'Seventh Circuit', '1300 South Harrison Street', 'Fort Wayne', 'IN', '46802', 41.0793, -85.1394, 'Main district courthouse'),
  ('Robert L. Miller Jr. United States Courthouse', 'Northern District of Indiana - South Bend', 'district_court', 'Northern District of Indiana', 'Seventh Circuit', '204 South Main Street', 'South Bend', 'IN', '46601', 41.6764, -86.2520, 'Divisional courthouse'),
  ('United States Courthouse', 'Eastern District of Wisconsin - Milwaukee', 'district_court', 'Eastern District of Wisconsin', 'Seventh Circuit', '517 East Wisconsin Avenue', 'Milwaukee', 'WI', '53202', 43.0389, -87.9065, 'Main district courthouse'),
  ('Robert W. Kastenmeier United States Courthouse', 'Western District of Wisconsin - Madison', 'district_court', 'Western District of Wisconsin', 'Seventh Circuit', '120 North Henry Street', 'Madison', 'WI', '53703', 43.0731, -89.4012, 'Main district courthouse'),

  -- EIGHTH CIRCUIT
  ('Thomas F. Eagleton United States Courthouse', 'Eighth Circuit - St. Louis', 'circuit_court_of_appeals', 'Eighth Circuit', 'Eighth Circuit', '111 South 10th Street', 'St. Louis', 'MO', '63102', 38.6270, -90.1994, 'Seat of the Eighth Circuit Court of Appeals'),
  ('Thomas F. Eagleton United States Courthouse', 'Eastern District of Missouri - St. Louis', 'district_court', 'Eastern District of Missouri', 'Eighth Circuit', '111 South 10th Street', 'St. Louis', 'MO', '63102', 38.6270, -90.1994, 'Main district courthouse'),
  ('Charles Evans Whittaker United States Courthouse', 'Western District of Missouri - Kansas City', 'district_court', 'Western District of Missouri', 'Eighth Circuit', '400 East 9th Street', 'Kansas City', 'MO', '64106', 39.0997, -94.5786, 'Main district courthouse'),
  ('Diana E. Murphy United States Courthouse', 'District of Minnesota - Minneapolis', 'district_court', 'District of Minnesota', 'Eighth Circuit', '300 South Fourth Street', 'Minneapolis', 'MN', '55415', 44.9778, -93.2650, 'Main district courthouse'),
  ('Warren E. Burger Federal Building and United States Courthouse', 'District of Minnesota - St. Paul', 'district_court', 'District of Minnesota', 'Eighth Circuit', '316 North Robert Street', 'St. Paul', 'MN', '55101', 44.9537, -93.0900, 'Divisional courthouse'),
  ('Isaac C. Parker Federal Building', 'Western District of Arkansas - Fort Smith', 'district_court', 'Western District of Arkansas', 'Eighth Circuit', '30 South 6th Street', 'Fort Smith', 'AR', '72901', 35.3859, -94.4244, 'Main district courthouse'),
  ('Richard Sheppard Arnold United States Courthouse', 'Eastern District of Arkansas - Little Rock', 'district_court', 'Eastern District of Arkansas', 'Eighth Circuit', '600 West Capitol Avenue', 'Little Rock', 'AR', '72201', 34.7465, -92.2896, 'Main district courthouse'),
  ('United States Courthouse', 'Southern District of Iowa - Des Moines', 'district_court', 'Southern District of Iowa', 'Eighth Circuit', '123 East Walnut Street', 'Des Moines', 'IA', '50309', 41.5868, -93.6250, 'Main district courthouse'),
  ('Cedar Rapids Federal Courthouse', 'Northern District of Iowa - Cedar Rapids', 'district_court', 'Northern District of Iowa', 'Eighth Circuit', '111 Seventh Avenue SE', 'Cedar Rapids', 'IA', '52401', 41.9779, -91.6656, 'Main district courthouse'),
  ('Roman L. Hruska United States Courthouse', 'District of Nebraska - Omaha', 'district_court', 'District of Nebraska', 'Eighth Circuit', '111 South 18th Plaza', 'Omaha', 'NE', '68102', 41.2565, -95.9345, 'Main district courthouse'),
  ('Robert V. Denney Federal Building and United States Courthouse', 'District of Nebraska - Lincoln', 'district_court', 'District of Nebraska', 'Eighth Circuit', '100 Centennial Mall North', 'Lincoln', 'NE', '68508', 40.8136, -96.7026, 'Divisional courthouse'),
  ('Quentin N. Burdick United States Courthouse', 'District of North Dakota - Fargo', 'district_court', 'District of North Dakota', 'Eighth Circuit', '655 First Avenue North', 'Fargo', 'ND', '58102', 46.8772, -96.7894, 'Main district courthouse'),
  ('Andrew W. Bogue Federal Building and United States Courthouse', 'District of South Dakota - Rapid City', 'district_court', 'District of South Dakota', 'Eighth Circuit', '515 Ninth Street', 'Rapid City', 'SD', '57701', 44.0805, -103.2310, 'Main district courthouse'),

  -- NINTH CIRCUIT
  ('James R. Browning United States Court of Appeals Building', 'Ninth Circuit - San Francisco', 'circuit_court_of_appeals', 'Ninth Circuit', 'Ninth Circuit', '95 Seventh Street', 'San Francisco', 'CA', '94103', 37.7794, -122.4110, 'Seat of the Ninth Circuit Court of Appeals'),
  ('Phillip Burton Federal Building and United States Courthouse', 'Northern District of California - San Francisco', 'district_court', 'Northern District of California', 'Ninth Circuit', '450 Golden Gate Avenue', 'San Francisco', 'CA', '94102', 37.7820, -122.4170, 'Main district courthouse'),
  ('United States Courthouse', 'Northern District of California - San Jose', 'district_court', 'Northern District of California', 'Ninth Circuit', '280 South First Street', 'San Jose', 'CA', '95113', 37.3330, -121.8900, 'Divisional courthouse'),
  ('United States Courthouse', 'Central District of California - Los Angeles', 'district_court', 'Central District of California', 'Ninth Circuit', '350 West 1st Street', 'Los Angeles', 'CA', '90012', 34.0522, -118.2437, 'Main district courthouse for CDCA'),
  ('Ronald Reagan Federal Building and United States Courthouse', 'Central District of California - Santa Ana', 'district_court', 'Central District of California', 'Ninth Circuit', '411 West Fourth Street', 'Santa Ana', 'CA', '92701', 33.7455, -117.8677, 'Divisional courthouse'),
  ('James M. Carter and Judith N. Keep United States Courthouse', 'Southern District of California - San Diego', 'district_court', 'Southern District of California', 'Ninth Circuit', '333 West Broadway', 'San Diego', 'CA', '92101', 32.7157, -117.1611, 'Main district courthouse'),
  ('Robert E. Coyle United States Courthouse', 'Eastern District of California - Fresno', 'district_court', 'Eastern District of California', 'Ninth Circuit', '2500 Tulare Street', 'Fresno', 'CA', '93721', 36.7378, -119.7871, 'Main district courthouse'),
  ('United States Courthouse', 'Eastern District of California - Sacramento', 'district_court', 'Eastern District of California', 'Ninth Circuit', '501 I Street', 'Sacramento', 'CA', '95814', 38.5816, -121.4944, 'Divisional courthouse'),
  ('Sandra Day O''Connor United States Courthouse', 'District of Arizona - Phoenix', 'district_court', 'District of Arizona', 'Ninth Circuit', '401 West Washington Street', 'Phoenix', 'AZ', '85003', 33.4484, -112.0740, 'Main district courthouse'),
  ('James A. Walsh United States Courthouse', 'District of Arizona - Tucson', 'district_court', 'District of Arizona', 'Ninth Circuit', '405 West Congress Street', 'Tucson', 'AZ', '85701', 32.2217, -110.9265, 'Divisional courthouse'),
  ('United States Courthouse', 'District of Oregon - Portland', 'district_court', 'District of Oregon', 'Ninth Circuit', '1000 SW Third Avenue', 'Portland', 'OR', '97204', 45.5231, -122.6765, 'Main district courthouse'),
  ('William Wayne Justice Government Center', 'Eastern District of Washington - Spokane', 'district_court', 'Eastern District of Washington', 'Ninth Circuit', '920 West Riverside Avenue', 'Spokane', 'WA', '99201', 47.6588, -117.4260, 'Main district courthouse'),
  ('United States Courthouse', 'Western District of Washington - Seattle', 'district_court', 'Western District of Washington', 'Ninth Circuit', '700 Stewart Street', 'Seattle', 'WA', '98101', 47.6062, -122.3321, 'Main district courthouse'),
  ('James M. Fitzgerald United States Courthouse', 'District of Alaska - Anchorage', 'district_court', 'District of Alaska', 'Ninth Circuit', '222 West 7th Avenue', 'Anchorage', 'AK', '99513', 61.2181, -149.9003, 'Main district courthouse'),
  ('United States Courthouse', 'District of Hawaii - Honolulu', 'district_court', 'District of Hawaii', 'Ninth Circuit', '300 Ala Moana Boulevard', 'Honolulu', 'HI', '96850', 21.3069, -157.8583, 'Main district courthouse'),
  ('James A. McClure Federal Building and United States Courthouse', 'District of Idaho - Boise', 'district_court', 'District of Idaho', 'Ninth Circuit', '550 West Fort Street', 'Boise', 'ID', '83724', 43.6150, -116.2023, 'Main district courthouse'),
  ('Lloyd D. George United States Courthouse', 'District of Nevada - Las Vegas', 'district_court', 'District of Nevada', 'Ninth Circuit', '333 Las Vegas Boulevard South', 'Las Vegas', 'NV', '89101', 36.1716, -115.1391, 'Main district courthouse'),
  ('Bruce R. Thompson United States Courthouse and Federal Building', 'District of Nevada - Reno', 'district_court', 'District of Nevada', 'Ninth Circuit', '400 South Virginia Street', 'Reno', 'NV', '89501', 39.5296, -119.8138, 'Divisional courthouse'),
  ('Russell E. Smith Federal Building', 'District of Montana - Missoula', 'district_court', 'District of Montana', 'Ninth Circuit', '201 East Broadway', 'Missoula', 'MT', '59802', 46.8721, -113.9940, 'Main district courthouse'),
  ('District Court of Guam', 'District of Guam - Hagatna', 'district_court', 'District of Guam', 'Ninth Circuit', '520 West Soledad Avenue', 'Hagatna', 'GU', '96910', 13.4742, 144.7506, 'Main district courthouse'),
  ('United States District Court for the Northern Mariana Islands', 'District of the Northern Mariana Islands - Saipan', 'district_court', 'District of the Northern Mariana Islands', 'Ninth Circuit', 'Beach Road, Gualo Rai', 'Saipan', 'MP', '96950', 15.2000, 145.7500, 'Main district courthouse'),

  -- TENTH CIRCUIT
  ('Byron White United States Courthouse', 'Tenth Circuit - Denver', 'circuit_court_of_appeals', 'Tenth Circuit', 'Tenth Circuit', '1823 Stout Street', 'Denver', 'CO', '80257', 39.7485, -104.9930, 'Seat of the Tenth Circuit Court of Appeals'),
  ('Alfred A. Arraj United States Courthouse', 'District of Colorado - Denver', 'district_court', 'District of Colorado', 'Tenth Circuit', '901 19th Street', 'Denver', 'CO', '80294', 39.7490, -104.9910, 'Main district courthouse'),
  ('Robert J. Dole United States Courthouse', 'District of Kansas - Kansas City', 'district_court', 'District of Kansas', 'Tenth Circuit', '500 State Avenue', 'Kansas City', 'KS', '66101', 39.1141, -94.6272, 'Main district courthouse'),
  ('Frank Carlson Federal Building and United States Courthouse', 'District of Kansas - Topeka', 'district_court', 'District of Kansas', 'Tenth Circuit', '444 SE Quincy Street', 'Topeka', 'KS', '66683', 39.0473, -95.6752, 'Divisional courthouse'),
  ('Pete V. Domenici United States Courthouse', 'District of New Mexico - Albuquerque', 'district_court', 'District of New Mexico', 'Tenth Circuit', '333 Lomas Boulevard NW', 'Albuquerque', 'NM', '87102', 35.0844, -106.6504, 'Main district courthouse'),
  ('William J. Holloway Jr. United States Courthouse', 'Western District of Oklahoma - Oklahoma City', 'district_court', 'Western District of Oklahoma', 'Tenth Circuit', '200 NW 4th Street', 'Oklahoma City', 'OK', '73102', 35.4676, -97.5164, 'Main district courthouse'),
  ('Page Belcher Federal Building and United States Courthouse', 'Northern District of Oklahoma - Tulsa', 'district_court', 'Northern District of Oklahoma', 'Tenth Circuit', '333 West 4th Street', 'Tulsa', 'OK', '74103', 36.1540, -95.9928, 'Main district courthouse'),
  ('Orrin G. Hatch United States Courthouse', 'District of Utah - Salt Lake City', 'district_court', 'District of Utah', 'Tenth Circuit', '351 South West Temple', 'Salt Lake City', 'UT', '84101', 40.7608, -111.8910, 'Main district courthouse'),
  ('Ewing T. Kerr Federal Building and United States Courthouse', 'District of Wyoming - Casper', 'district_court', 'District of Wyoming', 'Tenth Circuit', '111 South Wolcott Street', 'Casper', 'WY', '82601', 42.8501, -106.3251, 'Main district courthouse'),

  -- ELEVENTH CIRCUIT
  ('Elbert P. Tuttle United States Court of Appeals Building', 'Eleventh Circuit - Atlanta', 'circuit_court_of_appeals', 'Eleventh Circuit', 'Eleventh Circuit', '56 Forsyth Street NW', 'Atlanta', 'GA', '30303', 33.7550, -84.3900, 'Seat of the Eleventh Circuit Court of Appeals'),
  ('Richard B. Russell Federal Building and United States Courthouse', 'Northern District of Georgia - Atlanta', 'district_court', 'Northern District of Georgia', 'Eleventh Circuit', '75 Ted Turner Drive SW', 'Atlanta', 'GA', '30303', 33.7530, -84.3930, 'Main district courthouse'),
  ('Wilkie D. Ferguson Jr. United States Courthouse', 'Southern District of Florida - Miami', 'district_court', 'Southern District of Florida', 'Eleventh Circuit', '400 North Miami Avenue', 'Miami', 'FL', '33128', 25.7743, -80.1937, 'Main district courthouse'),
  ('Paul G. Rogers Federal Building and United States Courthouse', 'Southern District of Florida - West Palm Beach', 'district_court', 'Southern District of Florida', 'Eleventh Circuit', '701 Clematis Street', 'West Palm Beach', 'FL', '33401', 26.7153, -80.0533, 'Divisional courthouse'),
  ('Bryan Simpson United States Courthouse', 'Middle District of Florida - Jacksonville', 'district_court', 'Middle District of Florida', 'Eleventh Circuit', '300 North Hogan Street', 'Jacksonville', 'FL', '32202', 30.3322, -81.6557, 'Main district courthouse'),
  ('United States Courthouse', 'Middle District of Florida - Tampa', 'district_court', 'Middle District of Florida', 'Eleventh Circuit', '801 North Florida Avenue', 'Tampa', 'FL', '33602', 27.9506, -82.4572, 'Divisional courthouse'),
  ('United States Courthouse', 'Northern District of Florida - Tallahassee', 'district_court', 'Northern District of Florida', 'Eleventh Circuit', '111 North Adams Street', 'Tallahassee', 'FL', '32301', 30.4383, -84.2807, 'Main district courthouse'),
  ('Frank M. Johnson Jr. Federal Building and United States Courthouse', 'Middle District of Alabama - Montgomery', 'district_court', 'Middle District of Alabama', 'Eleventh Circuit', '151 Eastern Boulevard', 'Montgomery', 'AL', '36117', 32.3668, -86.2999, 'Main district courthouse'),
  ('Hugo L. Black United States Courthouse', 'Northern District of Alabama - Birmingham', 'district_court', 'Northern District of Alabama', 'Eleventh Circuit', '1729 5th Avenue North', 'Birmingham', 'AL', '35203', 33.5186, -86.8104, 'Main district courthouse'),

  -- DC CIRCUIT
  ('E. Barrett Prettyman United States Courthouse', 'DC Circuit - Washington', 'circuit_court_of_appeals', 'DC Circuit', 'DC Circuit', '333 Constitution Avenue NW', 'Washington', 'DC', '20001', 38.8922, -77.0161, 'Seat of the DC Circuit Court of Appeals'),
  ('E. Barrett Prettyman United States Courthouse', 'District of Columbia - Washington', 'district_court', 'District of Columbia', 'DC Circuit', '333 Constitution Avenue NW', 'Washington', 'DC', '20001', 38.8922, -77.0161, 'Main district courthouse for District of Columbia'),

  -- FEDERAL CIRCUIT & SPECIALTY COURTS
  ('Howard T. Markey National Courts Building', 'Federal Circuit - Washington', 'circuit_court_of_appeals', 'Federal Circuit', 'Federal Circuit', '717 Madison Place NW', 'Washington', 'DC', '20439', 38.8994, -77.0339, 'Seat of the US Court of Appeals for the Federal Circuit'),
  ('Howard T. Markey National Courts Building', 'US Court of Federal Claims - Washington', 'specialty_court', 'National', 'Federal Circuit', '717 Madison Place NW', 'Washington', 'DC', '20005', 38.8994, -77.0339, 'US Court of Federal Claims'),
  ('United States Tax Court Building', 'US Tax Court - Washington', 'specialty_court', 'National', 'None', '400 Second Street NW', 'Washington', 'DC', '20217', 38.8944, -77.0144, 'United States Tax Court'),
  ('James L. Watson United States Court of International Trade Building', 'US Court of International Trade - New York', 'specialty_court', 'National', 'Federal Circuit', 'One Federal Plaza', 'New York', 'NY', '10278', 40.7144, -74.0022, 'US Court of International Trade'),
  ('United States Court of Appeals for Veterans Claims', 'US Court of Appeals for Veterans Claims - Washington', 'specialty_court', 'National', 'None', '625 Indiana Avenue NW', 'Washington', 'DC', '20004', 38.8941, -77.0211, 'US Court of Appeals for Veterans Claims'),
  ('United States Court of Appeals for the Armed Forces', 'US Court of Appeals for the Armed Forces - Washington', 'specialty_court', 'National', 'None', '450 E Street NW', 'Washington', 'DC', '20442', 38.8950, -77.0180, 'US Court of Appeals for the Armed Forces'),

  -- BANKRUPTCY COURTS (REPRESENTATIVE)
  ('United States Bankruptcy Court', 'Bankruptcy District of Delaware - Wilmington', 'bankruptcy_court', 'District of Delaware', 'Third Circuit', '824 Market Street', 'Wilmington', 'DE', '19801', 39.7420, -75.5480, 'Delaware Bankruptcy Court'),
  ('United States Bankruptcy Court', 'Bankruptcy SDNY - Manhattan', 'bankruptcy_court', 'Southern District of New York', 'Second Circuit', 'One Bowling Green', 'New York', 'NY', '10004', 40.7040, -74.0130, 'SDNY Bankruptcy Court'),
  ('United States Bankruptcy Court', 'Bankruptcy CDCA - Los Angeles', 'bankruptcy_court', 'Central District of California', 'Ninth Circuit', '255 East Temple Street', 'Los Angeles', 'CA', '90012', 34.0500, -118.2400, 'CDCA Bankruptcy Court');
