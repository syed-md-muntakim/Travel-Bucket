// Liza — Travel Recommendation System (Module 3)
// Curated catalog of popular Bangladeshi travel destinations, keyed by
// district name so it lines up with Trip.destinationDistrict. Districts not
// listed here fall back to a generic "explore" entry.
const destinations = {
  "Cox's Bazar": { category: "beach", emoji: "🏖️", description: "Home to the world's longest natural sea beach, with golden sand stretching over 120km.", highlight: "World's longest sea beach" },
  "Bandarban": { category: "hill", emoji: "⛰️", description: "Misty hills, waterfalls and tribal culture in Bangladesh's most scenic hill district.", highlight: "Nilgiri & Nilachal hill views" },
  "Rangamati": { category: "hill", emoji: "🛶", description: "Lake district of the hill tracts, famous for Kaptai Lake and the hanging bridge.", highlight: "Kaptai Lake boat rides" },
  "Khagrachhari": { category: "hill", emoji: "🌄", description: "Home to the Alutila natural cave and hill trails near Sajek.", highlight: "Alutila natural cave" },
  "Panchagarh": { category: "hill", emoji: "🏔️", description: "On a clear day, the northern tip of Bangladesh offers views of the Kanchenjunga range.", highlight: "Himalayan skyline views" },
  "Sylhet": { category: "tea-garden", emoji: "🍃", description: "Rolling tea gardens, rainforests and the swamp forest of Ratargul.", highlight: "Jaflong & tea estates" },
  "Moulvibazar": { category: "tea-garden", emoji: "🍵", description: "Sreemangal's tea capital, with the Lawachara rainforest close by.", highlight: "Sreemangal tea gardens" },
  "Habiganj": { category: "tea-garden", emoji: "🌿", description: "Quiet tea gardens and the Satchari rainforest in the northeast.", highlight: "Satchari National Park" },
  "Sunamganj": { category: "wetland", emoji: "🌊", description: "The vast Tanguar Haor wetland, best explored by boat.", highlight: "Tanguar Haor" },
  "Netrokona": { category: "wetland", emoji: "🚤", description: "Haor country with wide open-water views through the monsoon.", highlight: "Sunset over the haor" },
  "Khulna": { category: "forest", emoji: "🐅", description: "Gateway to the Sundarbans, the largest mangrove forest in the world.", highlight: "Sundarbans mangrove forest" },
  "Bagerhat": { category: "forest", emoji: "🕌", description: "Sundarbans access point and home to the UNESCO-listed Sixty Dome Mosque.", highlight: "Sixty Dome Mosque" },
  "Satkhira": { category: "forest", emoji: "🌴", description: "A quieter, western approach to the Sundarbans.", highlight: "Sundarbans west zone" },
  "Patuakhali": { category: "beach", emoji: "🌅", description: "Home to Kuakata, the 'Sea Beach of Panorama' with both sunrise and sunset views.", highlight: "Kuakata panoramic beach" },
  "Barguna": { category: "beach", emoji: "🏝️", description: "Coastal district neighbouring Kuakata, with quiet fishing villages.", highlight: "Coastal fishing villages" },
  "Naogaon": { category: "historical", emoji: "🏛️", description: "Home to Paharpur, a UNESCO World Heritage Buddhist monastery.", highlight: "Somapura Mahavihara (Paharpur)" },
  "Bogura": { category: "historical", emoji: "🏺", description: "Ancient Mahasthangarh, one of the earliest urban archaeological sites in Bengal.", highlight: "Mahasthangarh ruins" },
  "Rajshahi": { category: "historical", emoji: "🥭", description: "Riverside city known for mango orchards and the Varendra Research Museum.", highlight: "Padma riverfront" },
  "Cumilla": { category: "historical", emoji: "🏯", description: "Home to the ancient Buddhist ruins of Mainamati.", highlight: "Mainamati ruins" },
  "Dhaka": { category: "city", emoji: "🏙️", description: "The capital — Old Dhaka's Mughal architecture, markets and river life.", highlight: "Lalbagh Fort & Old Dhaka" },
  "Chattogram": { category: "city", emoji: "🌉", description: "Port city with hilltop views, Foy's Lake and easy access to Cox's Bazar.", highlight: "Foy's Lake" },
  "Rangpur": { category: "historical", emoji: "🏰", description: "Home to the Tajhat Palace and the northern plains' rural charm.", highlight: "Tajhat Palace" },
  "Mymensingh": { category: "river", emoji: "🚣", description: "Riverside town on the Brahmaputra, home to the Shashi Lodge.", highlight: "Brahmaputra riverside" },
  "Jashore": { category: "city", emoji: "🌸", description: "Flower capital of Bangladesh, especially around Gadkhali.", highlight: "Gadkhali flower fields" },
};

const genericDestination = {
  category: "explore",
  emoji: "🧭",
  description: "An off-the-beaten-path district worth exploring for local culture and everyday Bangladeshi life.",
  highlight: "Local culture & cuisine",
};

const getDestinationInfo = (district) => destinations[district] || genericDestination;

module.exports = { destinations, getDestinationInfo };
