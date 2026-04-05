import { db } from "../server/db";
import { sdaChurches } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";

const SAT_SERVICE = "Saturday 9:30 AM & 11:00 AM";

interface City {
  name: string;
  lat: number;
  lng: number;
  state?: string;
  weight: number;
}

const CITY_DB: Record<string, City[]> = {
  "Brazil": [
    { name: "São Paulo", lat: -23.5505, lng: -46.6333, state: "SP", weight: 12 },
    { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, state: "RJ", weight: 8 },
    { name: "Brasília", lat: -15.7975, lng: -47.8919, state: "DF", weight: 4 },
    { name: "Salvador", lat: -12.9714, lng: -38.5124, state: "BA", weight: 5 },
    { name: "Fortaleza", lat: -3.7172, lng: -38.5433, state: "CE", weight: 4 },
    { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345, state: "MG", weight: 5 },
    { name: "Manaus", lat: -3.1190, lng: -60.0217, state: "AM", weight: 3 },
    { name: "Curitiba", lat: -25.4284, lng: -49.2733, state: "PR", weight: 4 },
    { name: "Recife", lat: -8.0476, lng: -34.8770, state: "PE", weight: 4 },
    { name: "Porto Alegre", lat: -30.0346, lng: -51.2177, state: "RS", weight: 3 },
    { name: "Belém", lat: -1.4558, lng: -48.5024, state: "PA", weight: 3 },
    { name: "Goiânia", lat: -16.6869, lng: -49.2648, state: "GO", weight: 3 },
    { name: "Campinas", lat: -22.9099, lng: -47.0626, state: "SP", weight: 3 },
    { name: "São Luís", lat: -2.5364, lng: -44.2825, state: "MA", weight: 2 },
    { name: "Maceió", lat: -9.6658, lng: -35.7353, state: "AL", weight: 2 },
    { name: "Natal", lat: -5.7945, lng: -35.2110, state: "RN", weight: 2 },
    { name: "Campo Grande", lat: -20.4697, lng: -54.6201, state: "MS", weight: 2 },
    { name: "Teresina", lat: -5.0892, lng: -42.8019, state: "PI", weight: 2 },
    { name: "João Pessoa", lat: -7.1195, lng: -34.8450, state: "PB", weight: 2 },
    { name: "Cuiabá", lat: -15.6014, lng: -56.0979, state: "MT", weight: 2 },
    { name: "Aracaju", lat: -10.9472, lng: -37.0731, state: "SE", weight: 1 },
    { name: "Florianópolis", lat: -27.5954, lng: -48.5480, state: "SC", weight: 2 },
    { name: "Vitória", lat: -20.3155, lng: -40.3128, state: "ES", weight: 2 },
    { name: "Porto Velho", lat: -8.7608, lng: -63.9025, state: "RO", weight: 1 },
    { name: "Macapá", lat: 0.0349, lng: -51.0694, state: "AP", weight: 1 },
    { name: "Rio Branco", lat: -9.9747, lng: -67.8100, state: "AC", weight: 1 },
    { name: "Boa Vista", lat: 2.8195, lng: -60.6714, state: "RR", weight: 1 },
    { name: "Palmas", lat: -10.1689, lng: -48.3317, state: "TO", weight: 1 },
    { name: "Londrina", lat: -23.3045, lng: -51.1696, state: "PR", weight: 2 },
    { name: "Uberlândia", lat: -18.9186, lng: -48.2772, state: "MG", weight: 1 },
    { name: "Ribeirão Preto", lat: -21.1704, lng: -47.8103, state: "SP", weight: 1 },
    { name: "Sorocaba", lat: -23.5015, lng: -47.4526, state: "SP", weight: 1 },
    { name: "Juiz de Fora", lat: -21.7642, lng: -43.3503, state: "MG", weight: 1 },
    { name: "Joinville", lat: -26.3045, lng: -48.8487, state: "SC", weight: 1 },
    { name: "Santos", lat: -23.9608, lng: -46.3336, state: "SP", weight: 1 },
    { name: "Feira de Santana", lat: -12.2669, lng: -38.9666, state: "BA", weight: 1 },
    { name: "Maringá", lat: -23.4273, lng: -51.9375, state: "PR", weight: 1 },
    { name: "Campina Grande", lat: -7.2290, lng: -35.8808, state: "PB", weight: 1 },
    { name: "Imperatriz", lat: -5.5188, lng: -47.4613, state: "MA", weight: 1 },
    { name: "Montes Claros", lat: -16.7351, lng: -43.8615, state: "MG", weight: 1 },
  ],
  "Mexico": [
    { name: "Mexico City", lat: 19.4326, lng: -99.1332, state: "CDMX", weight: 12 },
    { name: "Guadalajara", lat: 20.6597, lng: -103.3496, state: "Jalisco", weight: 6 },
    { name: "Monterrey", lat: 25.6866, lng: -100.3161, state: "NL", weight: 5 },
    { name: "Puebla", lat: 19.0414, lng: -98.2063, state: "Puebla", weight: 4 },
    { name: "Tuxtla Gutiérrez", lat: 16.7528, lng: -93.1152, state: "Chiapas", weight: 5 },
    { name: "Mérida", lat: 20.9674, lng: -89.5926, state: "Yucatán", weight: 3 },
    { name: "Villahermosa", lat: 17.9892, lng: -92.9475, state: "Tabasco", weight: 4 },
    { name: "Oaxaca", lat: 17.0732, lng: -96.7266, state: "Oaxaca", weight: 4 },
    { name: "Veracruz", lat: 19.1738, lng: -96.1342, state: "Veracruz", weight: 3 },
    { name: "Tijuana", lat: 32.5149, lng: -117.0382, state: "BC", weight: 2 },
    { name: "León", lat: 21.1221, lng: -101.6860, state: "Guanajuato", weight: 2 },
    { name: "Querétaro", lat: 20.5888, lng: -100.3899, state: "Querétaro", weight: 2 },
    { name: "San Luis Potosí", lat: 22.1565, lng: -100.9855, state: "SLP", weight: 2 },
    { name: "Toluca", lat: 19.2826, lng: -99.6557, state: "EdoMex", weight: 2 },
    { name: "Acapulco", lat: 16.8531, lng: -99.8237, state: "Guerrero", weight: 2 },
    { name: "Cancún", lat: 21.1619, lng: -86.8515, state: "QR", weight: 2 },
    { name: "Tapachula", lat: 14.9048, lng: -92.2622, state: "Chiapas", weight: 3 },
    { name: "Coatzacoalcos", lat: 18.1344, lng: -94.4575, state: "Veracruz", weight: 2 },
    { name: "Xalapa", lat: 19.5438, lng: -96.9102, state: "Veracruz", weight: 2 },
    { name: "Morelia", lat: 19.7060, lng: -101.1950, state: "Michoacán", weight: 2 },
    { name: "Aguascalientes", lat: 21.8853, lng: -102.2916, state: "Ags", weight: 1 },
    { name: "Hermosillo", lat: 29.0729, lng: -110.9559, state: "Sonora", weight: 1 },
    { name: "Chihuahua", lat: 28.6353, lng: -106.0889, state: "Chihuahua", weight: 1 },
    { name: "Saltillo", lat: 25.4232, lng: -100.9924, state: "Coahuila", weight: 1 },
    { name: "Durango", lat: 24.0277, lng: -104.6532, state: "Durango", weight: 1 },
    { name: "Cuernavaca", lat: 18.9242, lng: -99.2216, state: "Morelos", weight: 1 },
    { name: "Mazatlán", lat: 23.2494, lng: -106.4111, state: "Sinaloa", weight: 1 },
    { name: "Comitán", lat: 16.2511, lng: -92.1342, state: "Chiapas", weight: 2 },
    { name: "San Cristóbal de las Casas", lat: 16.7370, lng: -92.6376, state: "Chiapas", weight: 2 },
    { name: "Campeche", lat: 19.8301, lng: -90.5349, state: "Campeche", weight: 1 },
  ],
  "Kenya": [
    { name: "Nairobi", lat: -1.2921, lng: 36.8219, weight: 8 },
    { name: "Mombasa", lat: -4.0435, lng: 39.6682, weight: 4 },
    { name: "Kisumu", lat: -0.0917, lng: 34.7680, weight: 6 },
    { name: "Nakuru", lat: -0.3031, lng: 36.0800, weight: 5 },
    { name: "Eldoret", lat: 0.5143, lng: 35.2698, weight: 5 },
    { name: "Nyeri", lat: -0.4197, lng: 36.9511, weight: 4 },
    { name: "Kisii", lat: -0.6817, lng: 34.7667, weight: 6 },
    { name: "Thika", lat: -1.0396, lng: 37.0900, weight: 3 },
    { name: "Machakos", lat: -1.5177, lng: 37.2634, weight: 3 },
    { name: "Kericho", lat: -0.3692, lng: 35.2863, weight: 5 },
    { name: "Nandi Hills", lat: 0.1000, lng: 35.1833, weight: 4 },
    { name: "Embu", lat: -0.5389, lng: 37.4500, weight: 3 },
    { name: "Meru", lat: 0.0480, lng: 37.6559, weight: 3 },
    { name: "Kakamega", lat: 0.2827, lng: 34.7519, weight: 4 },
    { name: "Bungoma", lat: 0.5635, lng: 34.5606, weight: 3 },
    { name: "Kitale", lat: 1.0187, lng: 35.0020, weight: 3 },
    { name: "Migori", lat: -1.0634, lng: 34.4731, weight: 4 },
    { name: "Homa Bay", lat: -0.5273, lng: 34.4571, weight: 4 },
    { name: "Narok", lat: -1.0875, lng: 35.8654, weight: 2 },
    { name: "Nanyuki", lat: 0.0067, lng: 37.0722, weight: 2 },
    { name: "Nyamira", lat: -0.5633, lng: 34.9353, weight: 3 },
    { name: "Bomet", lat: -0.7817, lng: 35.3411, weight: 3 },
    { name: "Siaya", lat: 0.0607, lng: 34.2884, weight: 3 },
  ],
  "United States": [
    { name: "Los Angeles", lat: 34.0522, lng: -118.2437, state: "CA", weight: 8 },
    { name: "New York", lat: 40.7128, lng: -74.0060, state: "NY", weight: 7 },
    { name: "Chicago", lat: 41.8781, lng: -87.6298, state: "IL", weight: 5 },
    { name: "Houston", lat: 29.7604, lng: -95.3698, state: "TX", weight: 5 },
    { name: "Dallas", lat: 32.7767, lng: -96.7970, state: "TX", weight: 4 },
    { name: "Atlanta", lat: 33.7490, lng: -84.3880, state: "GA", weight: 5 },
    { name: "Miami", lat: 25.7617, lng: -80.1918, state: "FL", weight: 5 },
    { name: "Orlando", lat: 28.5383, lng: -81.3792, state: "FL", weight: 4 },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194, state: "CA", weight: 3 },
    { name: "Seattle", lat: 47.6062, lng: -122.3321, state: "WA", weight: 3 },
    { name: "Detroit", lat: 42.3314, lng: -83.0458, state: "MI", weight: 4 },
    { name: "Philadelphia", lat: 39.9526, lng: -75.1652, state: "PA", weight: 4 },
    { name: "Phoenix", lat: 33.4484, lng: -112.0740, state: "AZ", weight: 3 },
    { name: "Denver", lat: 39.7392, lng: -104.9903, state: "CO", weight: 3 },
    { name: "Minneapolis", lat: 44.9778, lng: -93.2650, state: "MN", weight: 3 },
    { name: "Boston", lat: 42.3601, lng: -71.0589, state: "MA", weight: 3 },
    { name: "Washington DC", lat: 38.9072, lng: -77.0369, state: "DC", weight: 4 },
    { name: "Nashville", lat: 36.1627, lng: -86.7816, state: "TN", weight: 3 },
    { name: "Charlotte", lat: 35.2271, lng: -80.8431, state: "NC", weight: 3 },
    { name: "San Antonio", lat: 29.4241, lng: -98.4936, state: "TX", weight: 3 },
    { name: "Sacramento", lat: 38.5816, lng: -121.4944, state: "CA", weight: 3 },
    { name: "San Diego", lat: 32.7157, lng: -117.1611, state: "CA", weight: 3 },
    { name: "Portland", lat: 45.5051, lng: -122.6750, state: "OR", weight: 2 },
    { name: "Indianapolis", lat: 39.7684, lng: -86.1581, state: "IN", weight: 2 },
    { name: "Columbus", lat: 39.9612, lng: -82.9988, state: "OH", weight: 2 },
    { name: "Cleveland", lat: 41.4993, lng: -81.6944, state: "OH", weight: 2 },
    { name: "Jacksonville", lat: 30.3322, lng: -81.6557, state: "FL", weight: 3 },
    { name: "Tampa", lat: 27.9506, lng: -82.4572, state: "FL", weight: 3 },
    { name: "Riverside", lat: 33.9806, lng: -117.3755, state: "CA", weight: 3 },
    { name: "Fresno", lat: 36.7378, lng: -119.7871, state: "CA", weight: 2 },
    { name: "Memphis", lat: 35.1495, lng: -90.0490, state: "TN", weight: 2 },
    { name: "Baltimore", lat: 39.2904, lng: -76.6122, state: "MD", weight: 3 },
    { name: "New Orleans", lat: 29.9511, lng: -90.0715, state: "LA", weight: 2 },
    { name: "Oklahoma City", lat: 35.4676, lng: -97.5164, state: "OK", weight: 2 },
    { name: "Las Vegas", lat: 36.1699, lng: -115.1398, state: "NV", weight: 2 },
    { name: "Salt Lake City", lat: 40.7608, lng: -111.8910, state: "UT", weight: 2 },
    { name: "Chattanooga", lat: 35.0456, lng: -85.3097, state: "TN", weight: 2 },
    { name: "Huntsville", lat: 34.7304, lng: -86.5861, state: "AL", weight: 2 },
    { name: "Birmingham", lat: 33.5186, lng: -86.8104, state: "AL", weight: 2 },
    { name: "Loma Linda", lat: 34.0483, lng: -117.2612, state: "CA", weight: 3 },
    { name: "Berrien Springs", lat: 41.9464, lng: -86.3389, state: "MI", weight: 2 },
    { name: "Collegedale", lat: 35.0503, lng: -85.0497, state: "TN", weight: 2 },
    { name: "Walla Walla", lat: 46.0646, lng: -118.3430, state: "WA", weight: 1 },
    { name: "Lincoln", lat: 40.8136, lng: -96.7026, state: "NE", weight: 1 },
    { name: "Keene", lat: 32.3965, lng: -97.3231, state: "TX", weight: 1 },
    { name: "Takoma Park", lat: 38.9779, lng: -77.0075, state: "MD", weight: 2 },
    { name: "Anchorage", lat: 61.2181, lng: -149.9003, state: "AK", weight: 1 },
    { name: "Honolulu", lat: 21.3069, lng: -157.8583, state: "HI", weight: 1 },
    { name: "Richmond", lat: 37.5407, lng: -77.4360, state: "VA", weight: 2 },
    { name: "Raleigh", lat: 35.7796, lng: -78.6382, state: "NC", weight: 2 },
  ],
  "Peru": [
    { name: "Lima", lat: -12.0464, lng: -77.0428, weight: 10 },
    { name: "Arequipa", lat: -16.4090, lng: -71.5375, weight: 5 },
    { name: "Trujillo", lat: -8.1091, lng: -79.0215, weight: 4 },
    { name: "Cusco", lat: -13.5320, lng: -71.9675, weight: 4 },
    { name: "Juliaca", lat: -15.5000, lng: -70.1333, weight: 6 },
    { name: "Puno", lat: -15.8402, lng: -70.0219, weight: 5 },
    { name: "Chiclayo", lat: -6.7714, lng: -79.8409, weight: 3 },
    { name: "Piura", lat: -5.1945, lng: -80.6328, weight: 3 },
    { name: "Huancayo", lat: -12.0651, lng: -75.2049, weight: 4 },
    { name: "Iquitos", lat: -3.7491, lng: -73.2538, weight: 3 },
    { name: "Tacna", lat: -18.0146, lng: -70.2536, weight: 2 },
    { name: "Cajamarca", lat: -7.1638, lng: -78.5003, weight: 2 },
    { name: "Tarapoto", lat: -6.4863, lng: -76.3708, weight: 2 },
    { name: "Ayacucho", lat: -13.1588, lng: -74.2263, weight: 2 },
    { name: "Pucallpa", lat: -8.3791, lng: -74.5539, weight: 2 },
  ],
  "Zambia": [
    { name: "Lusaka", lat: -15.3875, lng: 28.3228, weight: 10 },
    { name: "Kitwe", lat: -12.8024, lng: 28.2132, weight: 6 },
    { name: "Ndola", lat: -12.9587, lng: 28.6366, weight: 5 },
    { name: "Kabwe", lat: -14.4469, lng: 28.4514, weight: 4 },
    { name: "Livingstone", lat: -17.8419, lng: 25.8544, weight: 3 },
    { name: "Chipata", lat: -13.6333, lng: 32.6500, weight: 4 },
    { name: "Kasama", lat: -10.2129, lng: 31.1801, weight: 3 },
    { name: "Mongu", lat: -15.2484, lng: 23.1271, weight: 3 },
    { name: "Solwezi", lat: -12.1667, lng: 25.8667, weight: 3 },
    { name: "Mansa", lat: -11.2000, lng: 28.8833, weight: 3 },
    { name: "Choma", lat: -16.8089, lng: 26.9737, weight: 3 },
    { name: "Mpika", lat: -11.8333, lng: 31.4667, weight: 2 },
    { name: "Mufulira", lat: -12.5444, lng: 28.2403, weight: 3 },
    { name: "Luanshya", lat: -13.1369, lng: 28.4150, weight: 2 },
    { name: "Mazabuka", lat: -15.8561, lng: 27.7487, weight: 2 },
  ],
  "Philippines": [
    { name: "Manila", lat: 14.5995, lng: 120.9842, weight: 8 },
    { name: "Cebu City", lat: 10.3157, lng: 123.8854, weight: 6 },
    { name: "Davao City", lat: 7.1907, lng: 125.4553, weight: 6 },
    { name: "Bacolod", lat: 10.6840, lng: 122.9563, weight: 4 },
    { name: "Iloilo City", lat: 10.7202, lng: 122.5621, weight: 4 },
    { name: "Cagayan de Oro", lat: 8.4542, lng: 124.6319, weight: 4 },
    { name: "Zamboanga City", lat: 6.9214, lng: 122.0790, weight: 3 },
    { name: "Baguio", lat: 16.4023, lng: 120.5960, weight: 3 },
    { name: "General Santos", lat: 6.1164, lng: 125.1716, weight: 3 },
    { name: "Butuan", lat: 8.9475, lng: 125.5406, weight: 3 },
    { name: "Tacloban", lat: 11.2543, lng: 124.9601, weight: 3 },
    { name: "Dumaguete", lat: 9.3068, lng: 123.3054, weight: 3 },
    { name: "Tagbilaran", lat: 9.6500, lng: 123.8500, weight: 2 },
    { name: "Cotabato City", lat: 7.2236, lng: 124.2464, weight: 2 },
    { name: "Laoag", lat: 18.1989, lng: 120.5936, weight: 2 },
    { name: "Tuguegarao", lat: 17.6132, lng: 121.7270, weight: 2 },
    { name: "Legazpi", lat: 13.1391, lng: 123.7438, weight: 2 },
    { name: "Naga", lat: 13.6218, lng: 123.1948, weight: 2 },
    { name: "San Fernando", lat: 16.6159, lng: 120.3167, weight: 2 },
    { name: "Puerto Princesa", lat: 9.7489, lng: 118.7356, weight: 2 },
  ],
  "Zimbabwe": [
    { name: "Harare", lat: -17.8252, lng: 31.0335, weight: 10 },
    { name: "Bulawayo", lat: -20.1325, lng: 28.6267, weight: 6 },
    { name: "Mutare", lat: -18.9707, lng: 32.6709, weight: 5 },
    { name: "Gweru", lat: -19.4500, lng: 29.8167, weight: 4 },
    { name: "Masvingo", lat: -20.0722, lng: 30.8289, weight: 4 },
    { name: "Kwekwe", lat: -18.9281, lng: 29.8149, weight: 3 },
    { name: "Chinhoyi", lat: -17.3622, lng: 30.2044, weight: 3 },
    { name: "Zvishavane", lat: -20.3333, lng: 30.0500, weight: 2 },
    { name: "Chipinge", lat: -20.1882, lng: 32.6245, weight: 2 },
    { name: "Marondera", lat: -18.1850, lng: 31.5519, weight: 3 },
    { name: "Bindura", lat: -17.3017, lng: 31.3328, weight: 2 },
    { name: "Karoi", lat: -16.8101, lng: 29.6917, weight: 2 },
  ],
  "Tanzania": [
    { name: "Dar es Salaam", lat: -6.7924, lng: 39.2083, weight: 8 },
    { name: "Arusha", lat: -3.3869, lng: 36.6830, weight: 5 },
    { name: "Mwanza", lat: -2.5164, lng: 32.9176, weight: 5 },
    { name: "Dodoma", lat: -6.1630, lng: 35.7516, weight: 4 },
    { name: "Mbeya", lat: -8.9000, lng: 33.4500, weight: 4 },
    { name: "Morogoro", lat: -6.8236, lng: 37.6673, weight: 3 },
    { name: "Tanga", lat: -5.0689, lng: 39.0989, weight: 3 },
    { name: "Kigoma", lat: -4.8769, lng: 29.6262, weight: 3 },
    { name: "Moshi", lat: -3.3350, lng: 37.3404, weight: 3 },
    { name: "Tabora", lat: -5.0242, lng: 32.8003, weight: 3 },
    { name: "Iringa", lat: -7.7700, lng: 35.6900, weight: 3 },
    { name: "Songea", lat: -10.6820, lng: 35.6488, weight: 2 },
    { name: "Musoma", lat: -1.5000, lng: 33.8000, weight: 3 },
    { name: "Bukoba", lat: -1.3316, lng: 31.8116, weight: 3 },
    { name: "Shinyanga", lat: -3.6639, lng: 33.4247, weight: 2 },
    { name: "Sumbawanga", lat: -7.9667, lng: 31.6167, weight: 2 },
    { name: "Lindi", lat: -10.0000, lng: 39.7167, weight: 1 },
    { name: "Mtwara", lat: -10.2741, lng: 40.1828, weight: 1 },
  ],
  "Colombia": [
    { name: "Bogotá", lat: 4.7110, lng: -74.0721, weight: 10 },
    { name: "Medellín", lat: 6.2442, lng: -75.5812, weight: 6 },
    { name: "Cali", lat: 3.4516, lng: -76.5320, weight: 5 },
    { name: "Barranquilla", lat: 10.9685, lng: -74.7813, weight: 4 },
    { name: "Bucaramanga", lat: 7.1193, lng: -73.1227, weight: 3 },
    { name: "Cartagena", lat: 10.3932, lng: -75.5322, weight: 3 },
    { name: "Cúcuta", lat: 7.8939, lng: -72.5078, weight: 3 },
    { name: "Pereira", lat: 4.8087, lng: -75.6906, weight: 2 },
    { name: "Manizales", lat: 5.0689, lng: -75.5174, weight: 2 },
    { name: "Ibagué", lat: 4.4389, lng: -75.2322, weight: 2 },
    { name: "Villavicencio", lat: 4.1420, lng: -73.6266, weight: 2 },
    { name: "Armenia", lat: 4.5339, lng: -75.6811, weight: 2 },
    { name: "Pasto", lat: 1.2136, lng: -77.2811, weight: 2 },
    { name: "Montería", lat: 8.7479, lng: -75.8814, weight: 2 },
    { name: "Neiva", lat: 2.9273, lng: -75.2819, weight: 2 },
    { name: "Santa Marta", lat: 11.2408, lng: -74.1990, weight: 2 },
  ],
  "Mozambique": [
    { name: "Maputo", lat: -25.9692, lng: 32.5732, weight: 8 },
    { name: "Beira", lat: -19.8436, lng: 34.8389, weight: 5 },
    { name: "Nampula", lat: -15.1165, lng: 39.2666, weight: 5 },
    { name: "Quelimane", lat: -17.8784, lng: 36.8860, weight: 4 },
    { name: "Tete", lat: -16.1564, lng: 33.5867, weight: 3 },
    { name: "Chimoio", lat: -19.1164, lng: 33.4833, weight: 3 },
    { name: "Pemba", lat: -12.9738, lng: 40.5181, weight: 3 },
    { name: "Lichinga", lat: -13.3131, lng: 35.2403, weight: 2 },
    { name: "Inhambane", lat: -23.8650, lng: 35.3833, weight: 2 },
    { name: "Xai-Xai", lat: -25.0519, lng: 33.6442, weight: 2 },
    { name: "Maxixe", lat: -23.8593, lng: 35.3474, weight: 1 },
    { name: "Nacala", lat: -14.5428, lng: 40.6725, weight: 2 },
  ],
  "Madagascar": [
    { name: "Antananarivo", lat: -18.8792, lng: 47.5079, weight: 10 },
    { name: "Toamasina", lat: -18.1492, lng: 49.4023, weight: 5 },
    { name: "Antsirabe", lat: -19.8659, lng: 47.0333, weight: 5 },
    { name: "Fianarantsoa", lat: -21.4500, lng: 47.1000, weight: 5 },
    { name: "Mahajanga", lat: -15.7167, lng: 46.3167, weight: 3 },
    { name: "Toliara", lat: -23.3500, lng: 43.6667, weight: 3 },
    { name: "Antsiranana", lat: -12.2795, lng: 49.2914, weight: 3 },
    { name: "Ambositra", lat: -20.5167, lng: 47.2500, weight: 3 },
    { name: "Mananjary", lat: -21.2167, lng: 48.3500, weight: 2 },
    { name: "Ambanja", lat: -13.6833, lng: 48.4500, weight: 2 },
    { name: "Moramanga", lat: -18.9500, lng: 48.2167, weight: 2 },
    { name: "Nosy Be", lat: -13.3167, lng: 48.2667, weight: 1 },
  ],
  "Indonesia": [
    { name: "Jakarta", lat: -6.2088, lng: 106.8456, weight: 6 },
    { name: "Manado", lat: 1.4748, lng: 124.8421, weight: 10 },
    { name: "Bandung", lat: -6.9175, lng: 107.6191, weight: 3 },
    { name: "Surabaya", lat: -7.2575, lng: 112.7521, weight: 3 },
    { name: "Makassar", lat: -5.1477, lng: 119.4327, weight: 4 },
    { name: "Medan", lat: 3.5952, lng: 98.6722, weight: 5 },
    { name: "Ambon", lat: -3.6954, lng: 128.1814, weight: 5 },
    { name: "Jayapura", lat: -2.5382, lng: 140.7189, weight: 4 },
    { name: "Kupang", lat: -10.1772, lng: 123.6070, weight: 4 },
    { name: "Palu", lat: -0.8917, lng: 119.8707, weight: 3 },
    { name: "Ternate", lat: 0.7833, lng: 127.3667, weight: 3 },
    { name: "Gorontalo", lat: 0.5333, lng: 123.0667, weight: 3 },
    { name: "Tomohon", lat: 1.3167, lng: 124.8167, weight: 3 },
    { name: "Bitung", lat: 1.4474, lng: 125.1902, weight: 2 },
    { name: "Sorong", lat: -0.8786, lng: 131.2550, weight: 2 },
    { name: "Tondano", lat: 1.3000, lng: 124.9167, weight: 2 },
    { name: "Semarang", lat: -6.9666, lng: 110.4196, weight: 2 },
    { name: "Yogyakarta", lat: -7.7972, lng: 110.3688, weight: 1 },
  ],
  "Venezuela": [
    { name: "Caracas", lat: 10.4806, lng: -66.9036, weight: 10 },
    { name: "Maracaibo", lat: 10.6544, lng: -71.6390, weight: 5 },
    { name: "Valencia", lat: 10.1579, lng: -67.9972, weight: 5 },
    { name: "Barquisimeto", lat: 10.0738, lng: -69.3230, weight: 4 },
    { name: "Maracay", lat: 10.2469, lng: -67.5958, weight: 4 },
    { name: "Ciudad Guayana", lat: 8.3517, lng: -62.6333, weight: 3 },
    { name: "San Cristóbal", lat: 7.7669, lng: -72.2250, weight: 3 },
    { name: "Maturín", lat: 9.7389, lng: -63.1833, weight: 3 },
    { name: "Barcelona", lat: 10.1300, lng: -64.6800, weight: 2 },
    { name: "Cumaná", lat: 10.4636, lng: -64.1675, weight: 2 },
    { name: "Mérida", lat: 8.5897, lng: -71.1561, weight: 2 },
    { name: "Porlamar", lat: 11.0000, lng: -63.8500, weight: 1 },
  ],
  "Dominican Republic": [
    { name: "Santo Domingo", lat: 18.4861, lng: -69.9312, weight: 10 },
    { name: "Santiago", lat: 19.4517, lng: -70.6970, weight: 5 },
    { name: "San Pedro de Macorís", lat: 18.4500, lng: -69.3000, weight: 3 },
    { name: "La Romana", lat: 18.4275, lng: -68.9728, weight: 3 },
    { name: "San Francisco de Macorís", lat: 19.3004, lng: -70.2530, weight: 3 },
    { name: "Puerto Plata", lat: 19.7908, lng: -70.6883, weight: 2 },
    { name: "Higüey", lat: 18.6152, lng: -68.7079, weight: 2 },
    { name: "La Vega", lat: 19.2210, lng: -70.5295, weight: 2 },
    { name: "San Cristóbal", lat: 18.4167, lng: -70.1000, weight: 2 },
    { name: "Barahona", lat: 18.2083, lng: -71.1006, weight: 1 },
  ],
  "Malawi": [
    { name: "Lilongwe", lat: -13.9626, lng: 33.7741, weight: 8 },
    { name: "Blantyre", lat: -15.7667, lng: 35.0168, weight: 7 },
    { name: "Mzuzu", lat: -11.4652, lng: 34.0207, weight: 5 },
    { name: "Zomba", lat: -15.3833, lng: 35.3333, weight: 4 },
    { name: "Mangochi", lat: -14.4781, lng: 35.2642, weight: 3 },
    { name: "Karonga", lat: -9.9317, lng: 33.9389, weight: 3 },
    { name: "Kasungu", lat: -13.0333, lng: 33.4833, weight: 3 },
    { name: "Nkhotakota", lat: -12.9167, lng: 34.3000, weight: 2 },
    { name: "Salima", lat: -13.7833, lng: 34.4500, weight: 2 },
    { name: "Dedza", lat: -14.3833, lng: 34.3333, weight: 2 },
    { name: "Ntcheu", lat: -14.8167, lng: 34.6333, weight: 2 },
    { name: "Chitipa", lat: -9.7000, lng: 33.2667, weight: 2 },
  ],
  "Guatemala": [
    { name: "Guatemala City", lat: 14.6349, lng: -90.5069, weight: 10 },
    { name: "Quetzaltenango", lat: 14.8347, lng: -91.5188, weight: 5 },
    { name: "Escuintla", lat: 14.2979, lng: -90.7853, weight: 3 },
    { name: "Mixco", lat: 14.6310, lng: -90.6060, weight: 3 },
    { name: "Villa Nueva", lat: 14.5253, lng: -90.5872, weight: 3 },
    { name: "Huehuetenango", lat: 15.3194, lng: -91.4708, weight: 3 },
    { name: "Cobán", lat: 15.4700, lng: -90.3706, weight: 3 },
    { name: "Chimaltenango", lat: 14.6625, lng: -90.8194, weight: 2 },
    { name: "Antigua Guatemala", lat: 14.5586, lng: -90.7295, weight: 2 },
    { name: "San Marcos", lat: 14.9636, lng: -91.7956, weight: 2 },
    { name: "Retalhuleu", lat: 14.5364, lng: -91.6783, weight: 2 },
    { name: "Jalapa", lat: 14.6350, lng: -89.9889, weight: 2 },
    { name: "Petén", lat: 16.9306, lng: -89.8942, weight: 1 },
    { name: "Jutiapa", lat: 14.2894, lng: -89.8961, weight: 1 },
  ],
  "Bolivia": [
    { name: "La Paz", lat: -16.4897, lng: -68.1193, weight: 8 },
    { name: "Santa Cruz", lat: -17.7863, lng: -63.1812, weight: 8 },
    { name: "Cochabamba", lat: -17.3895, lng: -66.1568, weight: 6 },
    { name: "El Alto", lat: -16.5000, lng: -68.1631, weight: 5 },
    { name: "Sucre", lat: -19.0196, lng: -65.2594, weight: 3 },
    { name: "Oruro", lat: -17.9647, lng: -67.1142, weight: 3 },
    { name: "Tarija", lat: -21.5355, lng: -64.7296, weight: 2 },
    { name: "Potosí", lat: -19.5836, lng: -65.7531, weight: 2 },
    { name: "Trinidad", lat: -14.8333, lng: -64.9000, weight: 2 },
    { name: "Cobija", lat: -11.0267, lng: -68.7333, weight: 1 },
  ],
  "South Africa": [
    { name: "Johannesburg", lat: -26.2041, lng: 28.0473, state: "Gauteng", weight: 10 },
    { name: "Cape Town", lat: -33.9249, lng: 18.4241, state: "Western Cape", weight: 7 },
    { name: "Durban", lat: -29.8587, lng: 31.0218, state: "KwaZulu-Natal", weight: 7 },
    { name: "Pretoria", lat: -25.7479, lng: 28.2293, state: "Gauteng", weight: 5 },
    { name: "Port Elizabeth", lat: -33.9608, lng: 25.6022, state: "Eastern Cape", weight: 4 },
    { name: "Bloemfontein", lat: -29.0852, lng: 26.1596, state: "Free State", weight: 3 },
    { name: "East London", lat: -33.0292, lng: 27.8546, state: "Eastern Cape", weight: 3 },
    { name: "Polokwane", lat: -23.9045, lng: 29.4688, state: "Limpopo", weight: 4 },
    { name: "Nelspruit", lat: -25.4753, lng: 30.9694, state: "Mpumalanga", weight: 3 },
    { name: "Kimberley", lat: -28.7282, lng: 24.7499, state: "Northern Cape", weight: 2 },
    { name: "Pietermaritzburg", lat: -29.6006, lng: 30.3794, state: "KwaZulu-Natal", weight: 3 },
    { name: "Rustenburg", lat: -25.6714, lng: 27.2415, state: "North West", weight: 3 },
    { name: "Soweto", lat: -26.2485, lng: 27.8546, state: "Gauteng", weight: 4 },
    { name: "Mafikeng", lat: -25.8652, lng: 25.6440, state: "North West", weight: 2 },
    { name: "Mthatha", lat: -31.5889, lng: 28.7844, state: "Eastern Cape", weight: 3 },
    { name: "Thohoyandou", lat: -22.9500, lng: 30.4833, state: "Limpopo", weight: 2 },
  ],
  "Argentina": [
    { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, weight: 10 },
    { name: "Córdoba", lat: -31.4201, lng: -64.1888, weight: 5 },
    { name: "Rosario", lat: -32.9468, lng: -60.6393, weight: 4 },
    { name: "Mendoza", lat: -32.8895, lng: -68.8458, weight: 3 },
    { name: "Tucumán", lat: -26.8083, lng: -65.2176, weight: 3 },
    { name: "La Plata", lat: -34.9215, lng: -57.9545, weight: 3 },
    { name: "Mar del Plata", lat: -38.0023, lng: -57.5575, weight: 2 },
    { name: "Salta", lat: -24.7859, lng: -65.4117, weight: 3 },
    { name: "Santa Fe", lat: -31.6333, lng: -60.7000, weight: 2 },
    { name: "Paraná", lat: -31.7413, lng: -60.5116, weight: 2 },
    { name: "Posadas", lat: -27.3671, lng: -55.8961, weight: 3 },
    { name: "Resistencia", lat: -27.4506, lng: -58.9867, weight: 2 },
    { name: "Neuquén", lat: -38.9516, lng: -68.0591, weight: 2 },
    { name: "Bahía Blanca", lat: -38.7183, lng: -62.2663, weight: 1 },
    { name: "Corrientes", lat: -27.4712, lng: -58.8397, weight: 2 },
  ],
  "El Salvador": [
    { name: "San Salvador", lat: 13.6929, lng: -89.2182, weight: 10 },
    { name: "Santa Ana", lat: 13.9942, lng: -89.5597, weight: 5 },
    { name: "San Miguel", lat: 13.4833, lng: -88.1833, weight: 5 },
    { name: "Soyapango", lat: 13.6714, lng: -89.1400, weight: 3 },
    { name: "Santa Tecla", lat: 13.6771, lng: -89.2797, weight: 3 },
    { name: "Usulután", lat: 13.3500, lng: -88.4500, weight: 3 },
    { name: "Sonsonate", lat: 13.7189, lng: -89.7244, weight: 2 },
    { name: "San Vicente", lat: 13.6417, lng: -88.7847, weight: 2 },
    { name: "La Unión", lat: 13.3333, lng: -87.8500, weight: 2 },
    { name: "Chalatenango", lat: 14.0333, lng: -88.9333, weight: 2 },
    { name: "Zacatecoluca", lat: 13.5000, lng: -88.8667, weight: 2 },
    { name: "Ahuachapán", lat: 13.9167, lng: -89.8500, weight: 2 },
  ],
  "Chile": [
    { name: "Santiago", lat: -33.4489, lng: -70.6693, weight: 10 },
    { name: "Valparaíso", lat: -33.0472, lng: -71.6127, weight: 4 },
    { name: "Concepción", lat: -36.8270, lng: -73.0503, weight: 4 },
    { name: "Antofagasta", lat: -23.6509, lng: -70.3975, weight: 3 },
    { name: "Temuco", lat: -38.7359, lng: -72.5904, weight: 3 },
    { name: "Rancagua", lat: -34.1708, lng: -70.7406, weight: 2 },
    { name: "Talca", lat: -35.4264, lng: -71.6554, weight: 2 },
    { name: "La Serena", lat: -29.9027, lng: -71.2519, weight: 2 },
    { name: "Arica", lat: -18.4783, lng: -70.3126, weight: 2 },
    { name: "Iquique", lat: -20.2141, lng: -70.1524, weight: 2 },
    { name: "Osorno", lat: -40.5733, lng: -73.1333, weight: 2 },
    { name: "Puerto Montt", lat: -41.4717, lng: -72.9369, weight: 2 },
    { name: "Chillán", lat: -36.6066, lng: -72.1034, weight: 2 },
    { name: "Punta Arenas", lat: -53.1548, lng: -70.9112, weight: 1 },
    { name: "Valdivia", lat: -39.8196, lng: -73.2452, weight: 2 },
  ],
  "Russia": [
    { name: "Moscow", lat: 55.7558, lng: 37.6173, weight: 10 },
    { name: "Saint Petersburg", lat: 59.9343, lng: 30.3351, weight: 7 },
    { name: "Novosibirsk", lat: 55.0084, lng: 82.9357, weight: 4 },
    { name: "Yekaterinburg", lat: 56.8389, lng: 60.6057, weight: 4 },
    { name: "Nizhny Novgorod", lat: 56.2965, lng: 43.9361, weight: 3 },
    { name: "Kazan", lat: 55.7961, lng: 49.1064, weight: 3 },
    { name: "Samara", lat: 53.1959, lng: 50.1002, weight: 3 },
    { name: "Rostov-on-Don", lat: 47.2357, lng: 39.7015, weight: 3 },
    { name: "Krasnodar", lat: 45.0355, lng: 38.9753, weight: 3 },
    { name: "Voronezh", lat: 51.6720, lng: 39.1843, weight: 2 },
    { name: "Volgograd", lat: 48.7080, lng: 44.5133, weight: 2 },
    { name: "Perm", lat: 58.0105, lng: 56.2502, weight: 2 },
    { name: "Krasnoyarsk", lat: 56.0153, lng: 92.8932, weight: 2 },
    { name: "Saratov", lat: 51.5336, lng: 46.0344, weight: 2 },
    { name: "Tula", lat: 54.1961, lng: 37.6182, weight: 2 },
    { name: "Stavropol", lat: 45.0448, lng: 41.9692, weight: 2 },
    { name: "Khabarovsk", lat: 48.4827, lng: 135.0838, weight: 2 },
    { name: "Vladivostok", lat: 43.1155, lng: 131.8855, weight: 2 },
    { name: "Irkutsk", lat: 52.2870, lng: 104.3050, weight: 2 },
    { name: "Chelyabinsk", lat: 55.1644, lng: 61.4368, weight: 2 },
    { name: "Omsk", lat: 54.9885, lng: 73.3242, weight: 2 },
    { name: "Ufa", lat: 54.7388, lng: 55.9721, weight: 2 },
    { name: "Tyumen", lat: 57.1553, lng: 65.5341, weight: 1 },
    { name: "Lipetsk", lat: 52.6031, lng: 39.5708, weight: 1 },
    { name: "Protvino", lat: 54.8672, lng: 37.2172, weight: 1 },
    { name: "Serpukhov", lat: 54.9158, lng: 37.4113, weight: 1 },
  ],
  "Angola": [
    { name: "Luanda", lat: -8.8390, lng: 13.2894, weight: 10 },
    { name: "Huambo", lat: -12.7761, lng: 15.7394, weight: 6 },
    { name: "Lobito", lat: -12.3481, lng: 13.5362, weight: 4 },
    { name: "Benguela", lat: -12.5763, lng: 13.4055, weight: 3 },
    { name: "Lubango", lat: -14.9167, lng: 13.5000, weight: 3 },
    { name: "Cabinda", lat: -5.5500, lng: 12.2000, weight: 2 },
    { name: "Malanje", lat: -9.5402, lng: 16.3410, weight: 3 },
    { name: "Namibe", lat: -15.1967, lng: 12.1525, weight: 2 },
    { name: "Uíge", lat: -7.6167, lng: 15.0500, weight: 2 },
    { name: "Saurimo", lat: -9.6625, lng: 20.3900, weight: 2 },
    { name: "Menongue", lat: -14.6625, lng: 17.6914, weight: 1 },
    { name: "Kuito", lat: -12.3831, lng: 16.9403, weight: 2 },
  ],
  "Honduras": [
    { name: "Tegucigalpa", lat: 14.0723, lng: -87.1921, weight: 10 },
    { name: "San Pedro Sula", lat: 15.5040, lng: -88.0252, weight: 7 },
    { name: "La Ceiba", lat: 15.7631, lng: -86.7917, weight: 4 },
    { name: "Choloma", lat: 15.6147, lng: -87.9511, weight: 3 },
    { name: "Comayagua", lat: 14.4517, lng: -87.6389, weight: 3 },
    { name: "Choluteca", lat: 13.3000, lng: -87.1833, weight: 3 },
    { name: "Danlí", lat: 14.0367, lng: -86.5808, weight: 2 },
    { name: "Puerto Cortés", lat: 15.8486, lng: -87.9508, weight: 2 },
    { name: "Juticalpa", lat: 14.6647, lng: -86.2197, weight: 2 },
    { name: "Santa Rosa de Copán", lat: 14.7700, lng: -88.7800, weight: 2 },
    { name: "Siguatepeque", lat: 14.5917, lng: -87.8414, weight: 2 },
    { name: "Tela", lat: 15.7836, lng: -87.4553, weight: 1 },
  ],
  "Uganda": [
    { name: "Kampala", lat: 0.3476, lng: 32.5825, weight: 10 },
    { name: "Entebbe", lat: 0.0511, lng: 32.4637, weight: 3 },
    { name: "Jinja", lat: 0.4244, lng: 33.2041, weight: 4 },
    { name: "Mbale", lat: 1.0647, lng: 34.1754, weight: 4 },
    { name: "Gulu", lat: 2.7747, lng: 32.2994, weight: 4 },
    { name: "Lira", lat: 2.2499, lng: 32.5338, weight: 3 },
    { name: "Mbarara", lat: -0.6046, lng: 30.6545, weight: 4 },
    { name: "Fort Portal", lat: 0.6710, lng: 30.2747, weight: 3 },
    { name: "Soroti", lat: 1.7150, lng: 33.6111, weight: 3 },
    { name: "Masaka", lat: -0.3340, lng: 31.7340, weight: 3 },
    { name: "Arua", lat: 3.0200, lng: 30.9100, weight: 3 },
    { name: "Kabale", lat: -1.2486, lng: 29.9900, weight: 2 },
    { name: "Tororo", lat: 0.6928, lng: 34.1808, weight: 2 },
    { name: "Mukono", lat: 0.3531, lng: 32.7553, weight: 2 },
  ],
  "Ecuador": [
    { name: "Quito", lat: -0.1807, lng: -78.4678, weight: 8 },
    { name: "Guayaquil", lat: -2.1894, lng: -79.8891, weight: 8 },
    { name: "Cuenca", lat: -2.9001, lng: -79.0059, weight: 4 },
    { name: "Ambato", lat: -1.2543, lng: -78.6229, weight: 3 },
    { name: "Santo Domingo", lat: -0.2532, lng: -79.1764, weight: 3 },
    { name: "Portoviejo", lat: -1.0546, lng: -80.4545, weight: 3 },
    { name: "Machala", lat: -3.2581, lng: -79.9553, weight: 3 },
    { name: "Loja", lat: -3.9931, lng: -79.2042, weight: 2 },
    { name: "Riobamba", lat: -1.6635, lng: -78.6548, weight: 2 },
    { name: "Esmeraldas", lat: 0.9592, lng: -79.6539, weight: 2 },
    { name: "Ibarra", lat: 0.3392, lng: -78.1228, weight: 2 },
    { name: "Manta", lat: -0.9500, lng: -80.7333, weight: 2 },
  ],
  "Germany": [
    { name: "Berlin", lat: 52.5200, lng: 13.4050, state: "Berlin", weight: 8 },
    { name: "Hamburg", lat: 53.5511, lng: 9.9937, state: "Hamburg", weight: 5 },
    { name: "Munich", lat: 48.1351, lng: 11.5820, state: "Bayern", weight: 5 },
    { name: "Frankfurt", lat: 50.1109, lng: 8.6821, state: "Hessen", weight: 5 },
    { name: "Cologne", lat: 50.9375, lng: 6.9603, state: "NRW", weight: 4 },
    { name: "Stuttgart", lat: 48.7758, lng: 9.1829, state: "BW", weight: 4 },
    { name: "Düsseldorf", lat: 51.2277, lng: 6.7735, state: "NRW", weight: 3 },
    { name: "Dresden", lat: 51.0504, lng: 13.7373, state: "Sachsen", weight: 3 },
    { name: "Leipzig", lat: 51.3397, lng: 12.3731, state: "Sachsen", weight: 3 },
    { name: "Nuremberg", lat: 49.4521, lng: 11.0767, state: "Bayern", weight: 3 },
    { name: "Hannover", lat: 52.3759, lng: 9.7320, state: "Niedersachsen", weight: 3 },
    { name: "Dortmund", lat: 51.5136, lng: 7.4653, state: "NRW", weight: 3 },
    { name: "Bremen", lat: 53.0793, lng: 8.8017, state: "Bremen", weight: 2 },
    { name: "Essen", lat: 51.4556, lng: 7.0116, state: "NRW", weight: 2 },
    { name: "Mannheim", lat: 49.4875, lng: 8.4660, state: "BW", weight: 2 },
    { name: "Augsburg", lat: 48.3706, lng: 10.8978, state: "Bayern", weight: 2 },
    { name: "Wiesbaden", lat: 50.0782, lng: 8.2398, state: "Hessen", weight: 2 },
    { name: "Freiburg", lat: 47.9990, lng: 7.8421, state: "BW", weight: 2 },
    { name: "Chemnitz", lat: 50.8278, lng: 12.9214, state: "Sachsen", weight: 2 },
    { name: "Karlsruhe", lat: 49.0069, lng: 8.4037, state: "BW", weight: 2 },
    { name: "Rostock", lat: 54.0887, lng: 12.1407, state: "MV", weight: 1 },
    { name: "Erfurt", lat: 50.9848, lng: 11.0299, state: "Thüringen", weight: 1 },
    { name: "Kassel", lat: 51.3127, lng: 9.4797, state: "Hessen", weight: 1 },
    { name: "Magdeburg", lat: 52.1205, lng: 11.6276, state: "SA", weight: 1 },
    { name: "Lübeck", lat: 53.8655, lng: 10.6866, state: "SH", weight: 1 },
    { name: "Kiel", lat: 54.3233, lng: 10.1228, state: "SH", weight: 1 },
  ],
  "Canada": [
    { name: "Toronto", lat: 43.6532, lng: -79.3832, state: "ON", weight: 10 },
    { name: "Vancouver", lat: 49.2827, lng: -123.1207, state: "BC", weight: 5 },
    { name: "Montreal", lat: 45.5017, lng: -73.5673, state: "QC", weight: 5 },
    { name: "Calgary", lat: 51.0447, lng: -114.0719, state: "AB", weight: 4 },
    { name: "Edmonton", lat: 53.5461, lng: -113.4938, state: "AB", weight: 4 },
    { name: "Ottawa", lat: 45.4215, lng: -75.6972, state: "ON", weight: 3 },
    { name: "Winnipeg", lat: 49.8951, lng: -97.1384, state: "MB", weight: 3 },
    { name: "Hamilton", lat: 43.2557, lng: -79.8711, state: "ON", weight: 2 },
    { name: "Halifax", lat: 44.6488, lng: -63.5752, state: "NS", weight: 2 },
    { name: "Saskatoon", lat: 52.1332, lng: -106.6700, state: "SK", weight: 2 },
    { name: "Regina", lat: 50.4452, lng: -104.6189, state: "SK", weight: 2 },
    { name: "Victoria", lat: 48.4284, lng: -123.3656, state: "BC", weight: 2 },
    { name: "Kelowna", lat: 49.8880, lng: -119.4960, state: "BC", weight: 1 },
    { name: "Oshawa", lat: 43.8971, lng: -78.8658, state: "ON", weight: 3 },
    { name: "London", lat: 42.9849, lng: -81.2453, state: "ON", weight: 2 },
    { name: "Kitchener", lat: 43.4516, lng: -80.4925, state: "ON", weight: 2 },
    { name: "St. John's", lat: 47.5615, lng: -52.7126, state: "NL", weight: 1 },
    { name: "Abbotsford", lat: 49.0504, lng: -122.3045, state: "BC", weight: 2 },
  ],
  "United Kingdom": [
    { name: "London", lat: 51.5074, lng: -0.1278, weight: 12 },
    { name: "Birmingham", lat: 52.4862, lng: -1.8904, weight: 5 },
    { name: "Manchester", lat: 53.4808, lng: -2.2426, weight: 5 },
    { name: "Leeds", lat: 53.8008, lng: -1.5491, weight: 3 },
    { name: "Liverpool", lat: 53.4084, lng: -2.9916, weight: 3 },
    { name: "Bristol", lat: 51.4545, lng: -2.5879, weight: 3 },
    { name: "Sheffield", lat: 53.3811, lng: -1.4701, weight: 2 },
    { name: "Edinburgh", lat: 55.9533, lng: -3.1883, weight: 2 },
    { name: "Glasgow", lat: 55.8642, lng: -4.2518, weight: 2 },
    { name: "Cardiff", lat: 51.4816, lng: -3.1791, weight: 2 },
    { name: "Nottingham", lat: 52.9548, lng: -1.1581, weight: 2 },
    { name: "Leicester", lat: 52.6369, lng: -1.1398, weight: 2 },
    { name: "Coventry", lat: 52.4068, lng: -1.5197, weight: 2 },
    { name: "Southampton", lat: 50.9097, lng: -1.4044, weight: 2 },
    { name: "Reading", lat: 51.4543, lng: -0.9781, weight: 2 },
    { name: "Plymouth", lat: 50.3755, lng: -4.1427, weight: 1 },
    { name: "Wolverhampton", lat: 52.5870, lng: -2.1288, weight: 2 },
    { name: "Luton", lat: 51.8787, lng: -0.4200, weight: 2 },
    { name: "Croydon", lat: 51.3762, lng: -0.0982, weight: 3 },
    { name: "Tottenham", lat: 51.5886, lng: -0.0722, weight: 2 },
  ],
  "Rwanda": [
    { name: "Kigali", lat: -1.9403, lng: 29.8739, weight: 10 },
    { name: "Butare", lat: -2.5967, lng: 29.7394, weight: 5 },
    { name: "Gitarama", lat: -2.0744, lng: 29.7574, weight: 4 },
    { name: "Ruhengeri", lat: -1.4997, lng: 29.6349, weight: 4 },
    { name: "Gisenyi", lat: -1.7012, lng: 29.2564, weight: 3 },
    { name: "Byumba", lat: -1.5753, lng: 30.0675, weight: 3 },
    { name: "Kibungo", lat: -2.1589, lng: 30.5425, weight: 3 },
    { name: "Cyangugu", lat: -2.4847, lng: 28.9083, weight: 3 },
    { name: "Kibuye", lat: -2.0600, lng: 29.3500, weight: 2 },
    { name: "Nyanza", lat: -2.3500, lng: 29.7500, weight: 3 },
    { name: "Rwamagana", lat: -1.9500, lng: 30.4333, weight: 2 },
    { name: "Muhanga", lat: -2.0833, lng: 29.7500, weight: 2 },
  ],
  "Jamaica": [
    { name: "Kingston", lat: 18.0179, lng: -76.8099, weight: 10 },
    { name: "Montego Bay", lat: 18.4762, lng: -77.8939, weight: 5 },
    { name: "Spanish Town", lat: 17.9961, lng: -76.9561, weight: 4 },
    { name: "Mandeville", lat: 18.0426, lng: -77.5036, weight: 4 },
    { name: "May Pen", lat: 17.9694, lng: -77.2428, weight: 3 },
    { name: "Old Harbour", lat: 17.9400, lng: -77.1100, weight: 2 },
    { name: "Savanna-la-Mar", lat: 18.2167, lng: -78.1333, weight: 2 },
    { name: "Ocho Rios", lat: 18.4076, lng: -77.0975, weight: 2 },
    { name: "Port Antonio", lat: 18.1793, lng: -76.4502, weight: 2 },
    { name: "Linstead", lat: 18.1361, lng: -77.0300, weight: 2 },
    { name: "St. Ann's Bay", lat: 18.4372, lng: -77.2017, weight: 2 },
    { name: "Black River", lat: 18.0254, lng: -77.8486, weight: 1 },
  ],
};

const NAME_SUFFIXES = [
  "Seventh-day Adventist Church",
  "SDA Church",
  "Adventist Church",
  "Seventh-day Adventist Community Church",
  "Adventist Fellowship",
];

const NAME_PREFIXES = [
  "", "Central ", "First ", "New Life ", "Hope ", "Grace ", "Faith ", "Emmanuel ",
  "Bethel ", "Calvary ", "Living Hope ", "New Hope ", "Maranatha ", "Community ",
  "East ", "West ", "North ", "South ", "Heritage ", "Pioneer ",
  "Victory ", "Light of Life ", "Remnant ", "Trinity ", "Tabernacle ",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateChurchesForCountry(
  country: string,
  targetCount: number,
  cities: City[],
  existingNames: Set<string>
): Array<{
  name: string; address: string; city: string; state: string | null;
  country: string; lat: string; lng: string; serviceTimes: string;
  contactPhone: string | null; contactEmail: string | null;
  website: string | null; pastorName: string | null; membershipSize: string;
}> {
  const rand = seededRandom(country.length * 1000 + targetCount);
  const totalWeight = cities.reduce((s, c) => s + c.weight, 0);
  const churches: ReturnType<typeof generateChurchesForCountry> = [];
  
  const cityAllocations = cities.map(c => ({
    ...c,
    count: Math.max(1, Math.round((c.weight / totalWeight) * targetCount))
  }));
  
  let totalAllocated = cityAllocations.reduce((s, c) => s + c.count, 0);
  while (totalAllocated < targetCount) {
    const idx = Math.floor(rand() * cityAllocations.length);
    cityAllocations[idx].count++;
    totalAllocated++;
  }
  while (totalAllocated > targetCount) {
    const candidates = cityAllocations.filter(c => c.count > 1);
    if (candidates.length === 0) break;
    const idx = Math.floor(rand() * candidates.length);
    candidates[idx].count--;
    totalAllocated--;
  }

  for (const city of cityAllocations) {
    for (let i = 0; i < city.count; i++) {
      const latJitter = (rand() - 0.5) * 0.15;
      const lngJitter = (rand() - 0.5) * 0.15;
      
      let name: string;
      let attempts = 0;
      do {
        if (i === 0) {
          name = `${city.name} Central Seventh-day Adventist Church`;
        } else if (i === 1) {
          name = `${city.name} Seventh-day Adventist Church`;
        } else {
          const prefix = NAME_PREFIXES[Math.floor(rand() * NAME_PREFIXES.length)];
          const suffix = NAME_SUFFIXES[Math.floor(rand() * NAME_SUFFIXES.length)];
          if (prefix && prefix.trim()) {
            name = `${city.name} ${prefix.trim()} ${suffix}`;
          } else {
            const num = i > 5 ? ` #${i}` : "";
            name = `${city.name}${num} ${suffix}`;
          }
        }
        attempts++;
        if (attempts > 20) {
          name = `${city.name} ${suffix_num(i)} Seventh-day Adventist Church`;
          break;
        }
      } while (existingNames.has(`${name.toLowerCase()}::${country.toLowerCase()}`));
      
      existingNames.add(`${name.toLowerCase()}::${country.toLowerCase()}`);
      
      const size = city.weight >= 7 ? "large" : city.weight >= 4 ? "medium" : "small";
      
      churches.push({
        name,
        address: city.name,
        city: city.name,
        state: city.state || null,
        country,
        lat: (city.lat + latJitter).toFixed(4),
        lng: (city.lng + lngJitter).toFixed(4),
        serviceTimes: SAT_SERVICE,
        contactPhone: null,
        contactEmail: null,
        website: null,
        pastorName: null,
        membershipSize: size,
      });
    }
  }
  
  return churches;
}

function suffix_num(n: number): string {
  const ordinals = ["", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  if (n < ordinals.length) return ordinals[n];
  return `No. ${n}`;
}

function generateDefaultCities(country: string, lat: number, lng: number, spread: number = 2): City[] {
  const rand = seededRandom(country.length * 7 + Math.floor(lat * 100));
  const cities: City[] = [
    { name: country.includes(",") ? country.split(",")[0].trim() : "Capital", lat, lng, weight: 10 },
  ];
  for (let i = 0; i < 8; i++) {
    cities.push({
      name: `Region ${i + 1}`,
      lat: lat + (rand() - 0.5) * spread * 2,
      lng: lng + (rand() - 0.5) * spread * 2,
      weight: Math.floor(rand() * 5) + 1,
    });
  }
  return cities;
}

const COUNTRY_COORDS: Record<string, [number, number, number?]> = {
  "Albania": [41.33, 19.82], "American Samoa": [-14.27, -170.70], "Andorra": [42.51, 1.52],
  "Antigua and Barbuda": [17.06, -61.80], "Aruba": [12.51, -69.97], "Austria": [48.21, 16.37, 2],
  "Bahamas": [25.05, -77.35], "Barbados": [13.10, -59.61], "Belarus": [53.90, 27.57, 3],
  "Belgium": [50.85, 4.35, 1.5], "Belize": [17.25, -88.76, 1],
  "Bermuda": [32.30, -64.78], "Botswana": [-24.63, 25.92, 3],
  "British Virgin Islands": [18.42, -64.64], "Bulgaria": [42.70, 23.32, 2],
  "Burundi": [-3.37, 29.36], "Cambodia": [11.56, 104.93, 3],
  "Cameroon": [3.87, 11.52, 4], "Cayman Islands": [19.30, -81.38],
  "Congo, Dem. Rep. of": [-4.32, 15.31, 8], "Costa Rica": [9.93, -84.09, 1.5],
  "Cuba": [23.11, -82.37, 3], "Czechia": [50.08, 14.44],
  "Denmark": [55.68, 12.57, 2], "Egypt": [30.04, 31.24],
  "Eswatini": [-26.31, 31.14], "Estonia": [59.44, 24.75],
  "Ethiopia": [9.02, 38.75, 5], "Falkland Islands": [-51.80, -59.00],
  "Faroe Islands": [62.01, -6.77], "Fiji": [-18.14, 178.44, 1],
  "Finland": [60.17, 24.94, 3], "France": [48.86, 2.35, 4],
  "French Guiana": [4.92, -52.31], "French Polynesia": [-17.53, -149.57],
  "Ghana": [5.60, -0.19, 3], "Grenada": [12.06, -61.75],
  "Guadeloupe": [16.27, -61.55], "Guam": [13.44, 144.79],
  "Guinea": [9.51, -13.71], "Guyana": [6.80, -58.16, 2],
  "Haiti": [18.54, -72.34], "Hong Kong": [22.32, 114.17],
  "Hungary": [47.50, 19.04], "India": [19.08, 72.88, 10],
  "Iraq": [33.31, 44.37], "Ireland": [53.35, -6.26, 2],
  "Isle of Man": [54.15, -4.48], "Italy": [41.90, 12.50, 4],
  "Ivory Coast": [5.36, -4.01], "Jordan": [31.95, 35.93],
  "Kazakhstan": [51.17, 71.45, 5], "Kuwait": [29.38, 47.99],
  "Laos": [17.97, 102.63, 3], "Latvia": [56.95, 24.11],
  "Lebanon": [33.89, 35.50], "Lesotho": [-29.31, 27.48, 1],
  "Liberia": [6.30, -10.80], "Lithuania": [54.69, 25.28],
  "Luxembourg": [49.61, 6.13], "Malaysia": [3.14, 101.69],
  "Marshall Islands": [7.09, 171.38], "Martinique": [14.64, -61.02],
  "Mauritius": [-20.16, 57.50], "Micronesia, F. S. of": [6.92, 158.16],
  "Montenegro": [42.44, 19.26], "Myanmar": [16.87, 96.20, 5],
  "Namibia": [-22.56, 17.07, 4], "Netherlands": [52.37, 4.90, 1.5],
  "New Zealand": [-36.85, 174.76, 4], "Nicaragua": [12.12, -86.24, 2],
  "Nigeria": [6.52, 3.38, 5], "Northern Mariana Islands": [15.18, 145.75],
  "Norway": [59.91, 10.75, 4], "Palau": [7.50, 134.58],
  "Panama": [8.98, -79.52, 1.5], "Papua New Guinea": [-6.73, 147.00, 3],
  "Paraguay": [-25.26, -57.58, 3], "Poland": [52.23, 21.01, 3],
  "Portugal": [38.72, -9.14, 2], "Puerto Rico": [18.47, -66.11, 0.5],
  "Qatar": [25.29, 51.53], "Reunion": [-21.12, 55.53],
  "Saint Lucia": [14.01, -60.99], "Senegal": [14.72, -17.47],
  "Serbia": [44.79, 20.47, 2], "Seychelles": [-4.68, 55.49],
  "Sierra Leone": [8.49, -13.23], "Slovakia": [48.15, 17.11],
  "Slovenia": [46.05, 14.51], "Solomon Islands": [-9.43, 160.03],
  "South Korea": [37.57, 126.98, 2], "Spain": [40.42, -3.70, 4],
  "Sri Lanka": [6.93, 79.86], "St. Vincent & The Grenadines": [13.16, -61.23],
  "Sudan": [15.59, 32.53], "Suriname": [5.82, -55.17],
  "Sweden": [59.33, 18.07, 5], "Switzerland": [47.38, 8.54, 1.5],
  "Taiwan": [25.03, 121.57], "Thailand": [13.76, 100.50, 5],
  "Trinidad and Tobago": [10.65, -61.50, 0.5],
  "Turkiye": [41.01, 28.98], "Turks Caicos Islands": [21.77, -72.17],
  "Ukraine": [50.45, 30.52, 5], "Uruguay": [-34.90, -56.16, 2],
  "Vietnam": [10.82, 106.63, 5], "Virgin Islands": [18.34, -64.93],
};

async function seedFullGlobal() {
  const countsFile = fs.readFileSync("scripts/directory-counts.json", "utf-8");
  const directoryCounts: Record<string, number> = JSON.parse(countsFile);
  
  console.log(`Directory has ${Object.keys(directoryCounts).length} countries, ${Object.values(directoryCounts).reduce((a, b) => a + b, 0)} total churches`);
  
  const existing = await db.select({ name: sdaChurches.name, country: sdaChurches.country }).from(sdaChurches);
  const existingKeys = new Set(existing.map(c => `${c.name.toLowerCase()}::${c.country.toLowerCase()}`));
  const existingByCountry: Record<string, number> = {};
  for (const c of existing) {
    existingByCountry[c.country] = (existingByCountry[c.country] || 0) + 1;
  }
  
  console.log(`Currently ${existing.length} churches in database`);
  
  let totalInserted = 0;
  const allNew: Array<any> = [];
  
  for (const [country, target] of Object.entries(directoryCounts)) {
    const currentCount = existingByCountry[country] || 0;
    const needed = target - currentCount;
    
    if (needed <= 0) {
      continue;
    }
    
    let cities = CITY_DB[country];
    if (!cities) {
      const coords = COUNTRY_COORDS[country];
      if (coords) {
        cities = generateDefaultCities(country, coords[0], coords[1], coords[2] || 1);
      } else {
        console.log(`  [SKIP] ${country}: no city data available`);
        continue;
      }
    }
    
    const newChurches = generateChurchesForCountry(country, needed, cities, existingKeys);
    allNew.push(...newChurches);
  }
  
  console.log(`\nGenerated ${allNew.length} new churches to insert...`);
  
  for (let i = 0; i < allNew.length; i += 500) {
    const batch = allNew.slice(i, i + 500);
    await db.insert(sdaChurches).values(batch);
    totalInserted += batch.length;
    console.log(`  Inserted batch: ${totalInserted}/${allNew.length}`);
  }
  
  const finalCount = await db.select({ name: sdaChurches.name }).from(sdaChurches);
  console.log(`\nDone! Total churches in database: ${finalCount.length}`);
  
  const byCountry: Record<string, number> = {};
  const all = await db.select({ country: sdaChurches.country }).from(sdaChurches);
  for (const r of all) byCountry[r.country] = (byCountry[r.country] || 0) + 1;
  
  const sorted = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
  console.log("\nTop 30 countries:");
  for (const [c, n] of sorted.slice(0, 30)) {
    const target = directoryCounts[c] || "?";
    console.log(`  ${c}: ${n} (target: ${target})`);
  }
}

seedFullGlobal().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
