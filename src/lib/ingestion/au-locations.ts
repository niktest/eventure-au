export interface AULocation {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const AU_SEARCH_RADIUS_KM = 50;

export const AU_LOCATIONS: AULocation[] = [
  // Queensland
  { name: "Gold Coast", state: "QLD", lat: -28.0167, lon: 153.4000 },
  { name: "Brisbane", state: "QLD", lat: -27.4705, lon: 153.0260 },
  { name: "Sunshine Coast", state: "QLD", lat: -26.6500, lon: 153.0667 },
  { name: "Cairns", state: "QLD", lat: -16.9186, lon: 145.7781 },
  { name: "Townsville", state: "QLD", lat: -19.2590, lon: 146.8169 },
  { name: "Toowoomba", state: "QLD", lat: -27.5598, lon: 151.9507 },

  // New South Wales
  { name: "Sydney", state: "NSW", lat: -33.8688, lon: 151.2093 },
  { name: "Newcastle", state: "NSW", lat: -32.9283, lon: 151.7817 },
  { name: "Wollongong", state: "NSW", lat: -34.4278, lon: 150.8931 },
  { name: "Byron Bay", state: "NSW", lat: -28.6474, lon: 153.6120 },

  // Victoria
  { name: "Melbourne", state: "VIC", lat: -37.8136, lon: 144.9631 },
  { name: "Geelong", state: "VIC", lat: -38.1499, lon: 144.3617 },
  { name: "Ballarat", state: "VIC", lat: -37.5622, lon: 143.8503 },

  // South Australia
  { name: "Adelaide", state: "SA", lat: -34.9285, lon: 138.6007 },

  // Western Australia
  { name: "Perth", state: "WA", lat: -31.9505, lon: 115.8605 },
  { name: "Fremantle", state: "WA", lat: -32.0569, lon: 115.7439 },

  // Tasmania
  { name: "Hobart", state: "TAS", lat: -42.8821, lon: 147.3272 },

  // ACT
  { name: "Canberra", state: "ACT", lat: -35.2809, lon: 149.1300 },

  // Northern Territory
  { name: "Darwin", state: "NT", lat: -12.4634, lon: 130.8456 },
];
