// API Headers and Configuration
const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3',
    'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
};

const API_CONFIG = {
    baseUrl: 'https://sky-scrapper.p.rapidapi.com',
    delay: 1000,
    defaultParams: {
        currency: 'USD',
        market: 'en-US',
        countryCode: 'US'
    }
};

// Enhanced API rate limiting configuration
const API_RATE_LIMIT = {
    requestsPerMinute: 25,     // Maximum requests per minute (adjust based on API limits)
    timeWindow: 60000,         // Time window in milliseconds (1 minute)
    requestCount: 0,           // Current request count
    windowStartTime: Date.now() // Time when the current window started
};
//dobie
// Add this at the top with other constants
const API_DELAY = 1000; // Base delay between API calls in milliseconds

// Add this utility function for rate limiting with enhanced logging
const delay = async (ms) => {
    console.log(`Waiting for ${ms}ms before next API call`);
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Enhanced utility function for API retry mechanism with exponential backoff
const fetchWithRetry = async (url, options, retries = 3) => {
    // Reset rate limit window if needed
    if (Date.now() - API_RATE_LIMIT.windowStartTime > API_RATE_LIMIT.timeWindow) {
        console.log('Resetting rate limit window');
        API_RATE_LIMIT.requestCount = 0;
        API_RATE_LIMIT.windowStartTime = Date.now();
    }
    
    // Check if we're about to exceed rate limit
    if (API_RATE_LIMIT.requestCount >= API_RATE_LIMIT.requestsPerMinute) {
        const waitTime = API_RATE_LIMIT.timeWindow - (Date.now() - API_RATE_LIMIT.windowStartTime) + 1000;
        console.warn(`Rate limit approached (${API_RATE_LIMIT.requestCount} requests). Waiting ${waitTime}ms before continuing.`);
        await delay(waitTime > 0 ? waitTime : 2000);
        
        // Reset after waiting
        API_RATE_LIMIT.requestCount = 0;
        API_RATE_LIMIT.windowStartTime = Date.now();
    }
    
    // Track this request
    API_RATE_LIMIT.requestCount++;
    
    let lastError;
    let backoffDelay = 1000; // Start with 1 second
    
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`API request to: ${url.toString().substring(0, 100)}...`);
            console.log(`Request attempt ${i+1}/${retries}`);
            
            const response = await fetch(url, options);
            
            // Handle different response status codes
            if (response.status === 200) {
                return response;
            } else if (response.status === 403) {
                console.error(`403 Forbidden: API key may be invalid or lacks permission. URL: ${url.toString().substring(0, 100)}...`);
                validateApiKey();
                throw new Error(`API access forbidden (403). Please check API key validity and permissions.`);
            } else if (response.status === 429) {
                // Too Many Requests - use exponential backoff
                console.warn(`429 Too Many Requests received. Implementing exponential backoff.`);
                await delay(backoffDelay);
                backoffDelay *= 2; // Double the delay for next retry
                continue; // Try again after waiting
            } else if (response.status === 404) {
                console.warn(`404 Not Found for URL: ${url.toString().substring(0, 100)}...`);
                return response; // Return the 404 response for handling by the calling function
            } else {
                console.warn(`Unexpected status: ${response.status} for URL: ${url.toString().substring(0, 100)}...`);
                // For other status codes, throw an error to trigger retry
                throw new Error(`API returned status ${response.status}`);
            }
        } catch (err) {
            lastError = err;
            console.log(`Attempt ${i+1}/${retries} failed: ${err.message}`);
            
            if (i === retries - 1) {
                console.error(`All ${retries} attempts failed for ${url.toString().substring(0, 100)}...`);
                throw err;
            }
            
            // Exponential backoff with jitter for network errors
            const jitter = Math.random() * 500;
            const waitTime = backoffDelay + jitter;
            console.log(`Waiting ${waitTime}ms before retry ${i+2}`);
            await delay(waitTime);
            backoffDelay *= 2; // Double the delay for next retry
        }
    }
    
    throw lastError;
};

// Function to validate API key and log diagnostic information
const validateApiKey = () => {
    console.log(`Current API key: ${API_HEADERS['x-rapidapi-key'].substring(0, 8)}...`);
    console.log(`API host: ${API_HEADERS['x-rapidapi-host']}`);
    
    // Check if key appears valid (basic format check)
    if (!API_HEADERS['x-rapidapi-key'] || API_HEADERS['x-rapidapi-key'].length < 20) {
        console.error('API key appears to be invalid or missing');
    }
};

// Location ID cache to minimize API calls
const locationIdCache = {};

// Enhanced function to get location ID from Sky-Scrapper API with better error handling
const getLocationIdFromAPI = async (cityName) => {
    try {
        // Check cache first
        if (locationIdCache[cityName]) {
            console.log(`Using cached location ID for ${cityName}: ${locationIdCache[cityName]}`);
            return locationIdCache[cityName];
        }
        
        console.log(`Fetching location ID for ${cityName} from API`);
        const url = `${API_CONFIG.baseUrl}/api/v1/hotels/searchDestinationOrHotel`;
        const searchUrl = new URL(url);
        
        searchUrl.searchParams.append('query', cityName);
        
        const response = await fetchWithRetry(searchUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error('Access forbidden when fetching location ID. Check API permissions.');
                throw new Error(`API access denied for location search (403)`);
            }
            throw new Error(`Failed to get location ID: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Location search response:', data);
        
        if (!data || !data.data || data.data.length === 0) {
            throw new Error(`No location found for ${cityName}`);
        }
        
        // Find the first city-type result
        const cityResult = data.data.find(loc => loc.type === "CITY") || data.data[0];
        const locationId = cityResult.entityId;
        
        // Cache the result
        locationIdCache[cityName] = locationId;
        
        console.log(`Found location ID for ${cityName}: ${locationId}`);
        return locationId;
        
    } catch (error) {
        console.error(`Error getting location ID for ${cityName}:`, error);
        // Fall back to the helper function
        return getLocationIdForCity(cityName);
    }
};

// Helper function to map city names to location IDs
const getLocationIdForCity = (cityName) => {
    // Common city IDs mapping (fallback only)
    const cityIdMap = {
        'New York': '27537542', // Using Sky-Scrapper entityId for New York
        'London': '27544008',   // Using Sky-Scrapper entityId for London
        'Paris': '27539733',    // Using Sky-Scrapper entityId for Paris
        'Tokyo': '27542059',    // Using Sky-Scrapper entityId for Tokyo
        'Chicago': '27538539',  // Using Sky-Scrapper entityId for Chicago
        'Los Angeles': '27544994',
        'Dallas': '27536671',
        'Manila': '27536917',
        'Berlin': '27547053',
        'Bangkok': '27536671',
        'Mumbai': '27539729',
        'Sydney': '27544067'
    };
    
    // If we have a direct mapping, use it
    if (cityIdMap[cityName]) {
        return cityIdMap[cityName];
    }
    
    // Otherwise return a fallback (could be improved with a geocoding service)
    console.log(`No location ID mapping for ${cityName}, using fallback`);
    return cityName; // Use the name as a fallback search term
};

// Auth0 Configuration
let auth0Client;
let user;

const configureClient = async () => {
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: "https://hwoolen03.github.io/indexsignedin",
            advancedOptions: {
                defaultScope: 'openid profile email',
                audience: 'https://travel-planner-api',
                useRefreshTokens: true,
            },
            cacheLocation: 'localstorage',
            leeway: 30
        });
    } catch (error) {
        console.error("Auth0 configuration error:", error);
        showError('Authentication failed. Please refresh the page.');
        throw error;
    }
};

const signOut = async () => {
    try {
        if (auth0Client) {
            await auth0Client.logout({ returnTo: window.location.origin });
        }
    } catch (error) {
        console.error("Sign out error:", error);
        showError('Error signing out. Please try again.');
    }
};

// Client-Side Recommendation Engine
const DESTINATION_GENERATOR = {
    regions: {
        northAmerica: { flightBase: 300, hotelBase: 80, codePrefix: 'NA', multiplier: 1.0, name: 'North America' },
        europe: { flightBase: 400, hotelBase: 100, codePrefix: 'EU', multiplier: 1.1, name: 'Europe' },
        asia: { flightBase: 500, hotelBase: 60, codePrefix: 'AS', multiplier: 0.95, name: 'Asia' },
        oceania: { flightBase: 700, hotelBase: 120, codePrefix: 'OC', multiplier: 1.2, name: 'Oceania' }
    },

    generateDestinations(perRegion = 25) {
        const cityNames = {
            northAmerica: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
            europe: ['London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Vienna', 'Amsterdam', 'Prague', 'Brussels', 'Budapest'],
            asia: ['Tokyo', 'Seoul', 'Shanghai', 'Beijing', 'Bangkok', 'Mumbai', 'Jakarta', 'Manila', 'Kuala Lumpur', 'Singapore'],
            oceania: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland', 'Adelaide', 'Gold Coast', 'Canberra', 'Wellington', 'Christchurch']
        };

        const destinations = [];
        Object.entries(this.regions).forEach(([regionKey, config]) => {
            const cities = cityNames[regionKey];
            for (let i = 0; i < perRegion && i < cities.length; i++) {
                destinations.push({
                    iata: `${config.codePrefix}${(i + 1).toString().padStart(2, '0')}`,
                    city: cities[i],
                    region: regionKey,
                    avgFlightPrice: this.calculateSeasonalPrices(config.flightBase),
                    avgHotelPrice: Math.round(config.hotelBase * (0.8 + Math.random() * 0.4)),
                    multiplier: config.multiplier
                });
            }
        });
        return destinations;
    },

    calculateSeasonalPrices(base) {
        return {
            summer: Math.round(base * 1.2),
            winter: Math.round(base * 0.8),
            spring: Math.round(base * 1.05),
            fall: Math.round(base * 1.1)
        };
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

const TravelPlanner = {
    destinations: DESTINATION_GENERATOR.generateDestinations(25),

    getSeason(date) {
        const month = new Date(date).getMonth() + 1;
        if ([12, 1, 2].includes(month)) return 'winter';
        if ([3, 4, 5].includes(month)) return 'spring';
        if ([6, 7, 8].includes(month)) return 'summer';
        return 'fall';
    },

    calculateNights(checkIn, checkOut) {
        return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    },

    calculateTripCost(destination, checkInDate, nights) {
        const season = this.getSeason(checkInDate);
        const flightCost = destination.avgFlightPrice[season] * destination.multiplier;
        const hotelCost = destination.avgHotelPrice * nights * destination.multiplier;
        return {
            flight: Math.round(flightCost),
            hotel: Math.round(hotelCost),
            total: Math.round(flightCost + hotelCost)
        };
    },

    findDestinations(budget, checkInDate, checkOutDate, departureLocation, maxResults = 5) {
        const nights = this.calculateNights(checkInDate, checkOutDate);
        return this.destinations
            .map(dest => {
                const tripCost = this.calculateTripCost(dest, checkInDate, nights);
                return {
                    ...dest,
                    cost: tripCost
                };
            })
            .filter(dest => dest.cost.total <= budget)
            .sort((a, b) => a.cost.total - b.cost.total)
            .slice(0, maxResults);
    }
};

const calculateDistance = (fromIATA, toIATA) => {
    // Placeholder function to calculate distance between two IATA codes
    // In a real-world scenario, you would use an API or a database to get the actual distance
    const distances = {
        'LON': { 'NYC': 5567, 'PAR': 344, 'BER': 930, 'MAD': 1264, 'ROM': 1434 },
        // Add more distances as needed
    };
    return distances[fromIATA]?.[toIATA] || 0;
};

const estimateFlightCost = (distance) => {
    // Simple estimation based on distance
    const costPerKm = 0.1; // Example cost per kilometer
    return distance * costPerKm;
};

// API Functions
// Update searchRoundtripFlights function
const searchRoundtripFlights = async (fromAirport, toAirport, date) => {
    try {
        console.log(`Searching flights from ${fromAirport} to ${toAirport}`);
        
        // First get SkyIDs for the airports
        const originSkyId = await getAirportSkyId(fromAirport);
        const destinationSkyId = await getAirportSkyId(toAirport);
        
        if (!originSkyId || !destinationSkyId) {
            throw new Error('Could not resolve airport codes to SkyIDs');
        }
        
        // Get entity IDs for the airports (might need to implement this function)
        const originEntityId = await getEntityIdForAirport(fromAirport);
        const destinationEntityId = await getEntityIdForAirport(toAirport);
        
        const url = new URL(`${API_CONFIG.baseUrl}/api/v2/flights/searchFlights`);
        url.searchParams.append('originSkyId', originSkyId);
        url.searchParams.append('destinationSkyId', destinationSkyId);
        url.searchParams.append('originEntityId', originEntityId);
        url.searchParams.append('destinationEntityId', destinationEntityId);
        url.searchParams.append('cabinClass', 'economy');
        url.searchParams.append('adults', '1');
        url.searchParams.append('sortBy', 'best');
        url.searchParams.append('currency', API_CONFIG.defaultParams.currency);
        url.searchParams.append('market', API_CONFIG.defaultParams.market);
        url.searchParams.append('countryCode', API_CONFIG.defaultParams.countryCode);
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Flight search failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error searching flights:', error);
        return null;
    }
};

// New function to get SkyId for an airport
const getAirportSkyId = async (airportCode) => {
    try {
        const url = new URL(`${API_CONFIG.baseUrl}/api/v1/flights/searchAirport`);
        url.searchParams.append('query', airportCode);
        url.searchParams.append('locale', 'en-US');
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Airport search failed: ${response.status}`);
        }
        
        const data = await response.json();
        const airport = data.data.find(item => item.iata === airportCode);
        
        if (airport) {
            return airport.skyId;
        }
        
        return airportCode; // fallback to using the code itself
    } catch (error) {
        console.error(`Error getting SkyId for ${airportCode}:`, error);
        return airportCode; // fallback
    }
};

// New function to get entity ID for an airport
const getEntityIdForAirport = async (airportCode) => {
    try {
        const url = new URL(`${API_CONFIG.baseUrl}/api/v1/flights/searchAirport`);
        url.searchParams.append('query', airportCode);
        url.searchParams.append('locale', 'en-US');
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Airport search failed: ${response.status}`);
        }
        
        const data = await response.json();
        const airport = data.data.find(item => item.iata === airportCode);
        
        if (airport && airport.entityId) {
            return airport.entityId;
        }
        
        // Fallback to common airport entityIds
        const entityIdMap = {
            'JFK': '27537542', // New York
            'LHR': '27544008', // London
            'CDG': '27539733'  // Paris
        };
        
        return entityIdMap[airportCode] || '27537542'; // fallback to NYC if unknown
    } catch (error) {
        console.error(`Error getting entity ID for ${airportCode}:`, error);
        return '27537542'; // Default to NYC entity ID
    }
};

// Replace fetchHotelData function
const fetchHotelData = async (cityName, budget, checkInDate, checkOutDate) => {
    try {
        // Get the proper location ID first
        const entityId = await getLocationIdFromAPI(cityName);
        console.log(`Using entity ID for ${cityName}: ${entityId}`);
        
        // Use search endpoint with the correct parameters
        const url = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/searchHotels`);
        
        // Set required parameters for search endpoint
        url.searchParams.append('entityId', entityId);
        url.searchParams.append('checkin', checkInDate);
        url.searchParams.append('checkout', checkOutDate);
        url.searchParams.append('adults', '2');
        url.searchParams.append('rooms', '1');
        url.searchParams.append('limit', '30');
        url.searchParams.append('currency', API_CONFIG.defaultParams.currency);
        url.searchParams.append('market', API_CONFIG.defaultParams.market);
        url.searchParams.append('countryCode', API_CONFIG.defaultParams.countryCode);
        url.searchParams.append('sorting', '-relevance');
        
        console.log('Hotel search URL:', url.toString());
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`Failed to find properties: ${response.status}`);
        }

        const propertyData = await response.json();
        console.log('Property API Response:', propertyData); // Debug log
        
        if (!propertyData || !propertyData.data || propertyData.data.hotels.length === 0) {
            throw new Error(`No properties found for ${cityName}`);
        }
        
        return {
            data: propertyData.data.hotels,
            count: propertyData.data.hotels.length
        };

    } catch (error) {
        console.error('Hotel data fetch error:', error);
        // Fall back to mock data
        return createMockHotelData(cityName);
    }
};

// Update verifyHotelIds function
const verifyHotelIds = async (location, checkInDate, checkOutDate) => {
    try {
        console.log(`Searching for properties in: ${location}`);
        
        // Get the proper location ID first
        const entityId = await getLocationIdFromAPI(location);
        
        // Use search endpoint with correct parameters
        const url = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/searchHotels`);
        
        // Set required parameters
        url.searchParams.append('entityId', entityId);
        url.searchParams.append('checkin', checkInDate);
        url.searchParams.append('checkout', checkOutDate);
        url.searchParams.append('adults', '2');
        url.searchParams.append('rooms', '1');
        url.searchParams.append('limit', '30');
        url.searchParams.append('currency', API_CONFIG.defaultParams.currency);
        url.searchParams.append('market', API_CONFIG.defaultParams.market);
        url.searchParams.append('countryCode', API_CONFIG.defaultParams.countryCode);
        
        console.log('Property search URL:', url.toString());
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!response.ok) {
            console.log('Property search error response:', await response.text());
            throw new Error(`Failed to find properties: ${response.status}`);
        }

        const propertyData = await response.json();
        console.log('Property API Response:', propertyData); // Debug log
        
        if (!propertyData || !propertyData.data || propertyData.data.hotels.length === 0) {
            // Fall back to coordinate search if available, or mock data
            return await tryCoordinateSearch(location, checkInDate, checkOutDate);
        }
        
        return {
            data: propertyData.data.hotels,
            count: propertyData.data.hotels.length
        };
        
    } catch (error) {
        console.error('Property verification error:', error);
        // Always return mock data instead of throwing again
        return createMockHotelData(location);
    }
};

// Update searchDestinationByCountry to use entity IDs
const searchDestinationByCountry = async (location, checkInDate, checkOutDate) => {
    try {
        // Use location_id from API
        const entityId = await getLocationIdFromAPI(location);
        console.log(`Using entity ID for alternate search: ${entityId}`);
        
        // Use search endpoint with correct parameters
        const url = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/searchHotels`);
        
        // Set required parameters
        url.searchParams.append('entityId', entityId);
        url.searchParams.append('checkin', checkInDate);
        url.searchParams.append('checkout', checkOutDate);
        url.searchParams.append('adults', '2');
        url.searchParams.append('rooms', '1');
        url.searchParams.append('limit', '30');
        url.searchParams.append('currency', API_CONFIG.defaultParams.currency);
        url.searchParams.append('market', API_CONFIG.defaultParams.market);
        url.searchParams.append('countryCode', API_CONFIG.defaultParams.countryCode);
        
        console.log('Alternative property search URL:', url.toString());
        
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`Alternative property search failed: ${response.status}`);
        }

        const propertyData = await response.json();
        
        if (!propertyData || !propertyData.data || propertyData.data.hotels.length === 0) {
            // Try to create mock data as final fallback
            return createMockHotelData(location);
        }
        
        // Return in standard format
        return {
            data: propertyData.data.hotels,
            count: propertyData.data.hotels.length
        };
    } catch (error) {
        console.error('Alternative search error:', error);
        // Final fallback - create mock data
        return createMockHotelData(location);
    }
};

// Create mock hotel data as final fallback
const createMockHotelData = (location) => {
    console.log(`Creating mock data for ${location}`);
    
    // Generate more realistic prices based on different city tiers
    const cityTiers = {
        'New York': 250,
        'London': 220,
        'Paris': 200,
        'Tokyo': 180,
        'Sydney': 170,
        'Chicago': 160,
        'Berlin': 150,
        'Bangkok': 100,
        'Mumbai': 90
    };
    
    const basePrice = cityTiers[location] || 120; // Default price if city not in list
    const variability = 0.3; // 30% random variation
    
    const hotels = [
        {
            hotel_id: `mock-${location.replace(/\s/g, '-').toLowerCase()}-1`,
            hotel_name: `${location} Grand Hotel`,
            address: `123 Main Street, ${location}`,
            review_score: (Math.random() * 2 + 7).toFixed(1), // Score between 7.0-9.0
            price: Math.floor(basePrice * (1 + Math.random() * variability))
        },
        {
            hotel_id: `mock-${location.replace(/\s/g, '-').toLowerCase()}-2`,
            hotel_name: `${location} Plaza`,
            address: `456 First Avenue, ${location}`,
            review_score: (Math.random() * 2 + 7).toFixed(1),
            price: Math.floor(basePrice * (0.8 + Math.random() * variability))
        },
        {
            hotel_id: `mock-${location.replace(/\s/g, '-').toLowerCase()}-3`,
            hotel_name: `${location} Suites`,
            address: `789 Park Road, ${location}`,
            review_score: (Math.random() * 2 + 7).toFixed(1),
            price: Math.floor(basePrice * (0.7 + Math.random() * variability))
        }
    ];
    
    return {
        data: hotels,
        is_mock: true
    };
};

// Update tryCoordinateSearch to use Sky-Scrapper's getNearByAirports
const tryCoordinateSearch = async (location, checkInDate, checkOutDate) => {
    try {
        // Try to get location ID from API first
        const entityId = await getLocationIdFromAPI(location);
        
        if (entityId) {
            console.log(`Found location ID for ${location}: ${entityId}`);
            
            // Use the location ID directly with search endpoint
            const url = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/searchHotels`);
            
            url.searchParams.append('entityId', entityId);
            url.searchParams.append('checkin', checkInDate);
            url.searchParams.append('checkout', checkOutDate);
            url.searchParams.append('adults', '2');
            url.searchParams.append('rooms', '1');
            url.searchParams.append('limit', '30');
            url.searchParams.append('currency', API_CONFIG.defaultParams.currency);
            url.searchParams.append('market', API_CONFIG.defaultParams.market);
            url.searchParams.append('countryCode', API_CONFIG.defaultParams.countryCode);
            
            const response = await fetchWithRetry(url.toString(), {
                method: 'GET',
                headers: API_HEADERS
            });

            if (response.ok) {
                const propertyData = await response.json();
                if (propertyData?.data?.hotels?.length > 0) {
                    return {
                        data: propertyData.data.hotels,
                        count: propertyData.data.hotels.length
                    };
                }
            }
        }
        
        // Fall back to nearby airports search if we have coordinates
        const coordinates = getLocationIdForCity(location);
        if (coordinates && coordinates.includes(',')) {
            // Looks like we have coordinates
            const [longitude, latitude] = coordinates.split(',');
            
            console.log(`Trying nearby airports search for ${location}: ${latitude}, ${longitude}`);
            return await searchHotelsByCoordinates(latitude, longitude, checkInDate, checkOutDate);
        }
    } catch (error) {
        console.error('Coordinate search failed:', error);
    }
    
    // Fall back to mock data
    console.log(`No properties found for ${location}, falling back to mock data`);
    return createMockHotelData(location);
};

// Update personalizeContent function to handle errors better
const personalizeContent = async (user) => {
    try {
        // Get input values from the form
        const inputs = {
            checkInDate: document.getElementById('holidayDate').value,
            checkOutDate: document.getElementById('returnDate').value,
            departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
            budget: parseInt(document.getElementById('budget').value) || 1500
        };
        
        // Validate inputs
        validateDates(inputs.checkInDate, inputs.checkOutDate);
        
        // Find destinations based on budget and dates
        const recommendations = TravelPlanner.findDestinations(
            inputs.budget,
            inputs.checkInDate,
            inputs.checkOutDate,
            inputs.departureLocation
        );
        
        // Process each recommendation to add hotel data
        const results = [];
        let successCount = 0;
        
        for (const rec of recommendations) {
            try {
                console.log(`Processing recommendation for ${rec.city}`);
                
                // Fetch hotels for this destination
                const hotels = await fetchHotelData(
                    rec.city,
                    inputs.budget * 0.6, // Allocate 60% of budget for hotel
                    inputs.checkInDate,
                    inputs.checkOutDate
                );
                
                if (hotels && hotels.data && hotels.data.length > 0) {
                    const firstHotel = hotels.data[0];
                    
                    // Extract hotel details
                    const hotelName = firstHotel.hotel_name || 'Hotel';
                    const hotelAddress = firstHotel.address || 'Address unavailable';
                    const reviewScore = firstHotel.review_score || 'N/A';
                    
                    // Try to get hotel photo
                    let photoUrl = null;
                    if (firstHotel.hotel_id) {
                        photoUrl = await fetchHotelPhotos(firstHotel.hotel_id);
                    }
                    
                    // Create result with initial cost estimate
                    const resultWithHotel = {
                        ...rec,
                        hotels: hotels,
                        firstHotel: {
                            ...firstHotel,
                            hotel_name: hotelName,
                            address: hotelAddress,
                            review_score: reviewScore
                        },
                        photos: photoUrl
                    };
                    
                    // Try to get real hotel price and update the cost
                    resultWithHotel.cost = await integrateRealHotelPrices(
                        resultWithHotel, 
                        inputs.checkInDate, 
                        inputs.checkOutDate
                    );
                    
                    // Add to results with hotel info
                    results.push(resultWithHotel);
                    
                    successCount++;
                } else {
                    // Should not reach here with our improved code
                    results.push({
                        ...rec,
                        hotels: null,
                        error: 'No hotels found'
                    });
                }
                
            } catch (error) {
                console.error(`Error processing ${rec.city}:`, error);
                // Add city to results with error info
                results.push({
                    ...rec,
                    error: error.message,
                    hotels: {
                        data: [],
                        is_mock: true
                    }
                });
            }
            
            // If we have 3 successful results, that's enough
            if (successCount >= 3) break;
        }

        return results;
    } catch (error) {
        console.error("Personalization error:", error);
        showError(error.message);
        return [];
    }
};

// Auth State Management
const updateAuthState = async () => {
    try {
        const isAuthed = await auth0Client.isAuthenticated();
        if (isAuthed) await validateSession();

        const toggleElement = (id, visible) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = visible ? 'block' : 'none';
            }
        };

        toggleElement('btn-login-github', !isAuthed);
        toggleElement('btn-login-google', !isAuthed);
        toggleElement('btn-login-figma', !isAuthed);
        toggleElement('signOutBtn', isAuthed);

        if (isAuthed) {
            const hideElement = document.getElementById('someElementToRemoveOrHide');
            if (hideElement) {
                hideElement.style.display = 'none';
            }
        } else {
            const showElement = document.getElementById('someElementToRemoveOrHide');
            if (showElement) {
                showElement.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Auth state update failed:", error);
    }
};

// Handle Auth0 redirect callback
const generateRandomState = () => {
    const state = btoa(Math.random().toString(36).substring(2));
    console.log("Generated state:", state);
    return state;
};

const handleAuth0Redirect = async () => {
    try {
        const query = window.location.search;
        if (query.includes('code=') || query.includes('error=')) {
            // Store current URL state before handling redirect
            const currentState = new URLSearchParams(window.location.search).get('state');
            console.log('Current state from URL:', currentState);
            
            // Get stored state from session storage
            const storedState = sessionStorage.getItem('auth_state');
            console.log('Stored state:', storedState);

            if (!storedState || storedState !== currentState) {
                console.error('State validation failed');
                throw new Error('Invalid state - Authentication attempt may have been compromised');
            }

            // Handle the redirect callback
            await auth0Client.handleRedirectCallback();
            
            // Clear state and redirect params after successful validation
            sessionStorage.removeItem('auth_state');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (error) {
        console.error("Redirect error:", error);
        sessionStorage.removeItem('auth_state');
        showError('Authentication failed. Please try again.', true);
        // Redirect to home page after error
        window.location.replace(window.location.origin);
    }
};

// Add session validation check
const validateSession = async () => {
    try {
        const token = await auth0Client.getTokenSilently();
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (Math.floor(Date.now() / 1000) - payload.auth_time > 3600) {
            await auth0Client.logout();
            window.location.reload();
        }
    } catch (error) {
        console.error('Session validation failed:', error);
    }
};

const handlePotentialRedirect = async () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('error')) {
        const errorDesc = urlParams.get('error_description');
        showError(`Authentication failed: ${errorDesc || 'Unknown error'}`, true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (urlParams.has('code')) {
        try {
            await handleAuth0Redirect();
            // After successful authentication, update UI
            await updateAuthState();
            window.location.href = "https://hwoolen03.github.io/indexsignedin";
        } catch (error) {
            console.error('Redirect handling failed:', error);
            showError('Authentication failed. Please try again.');
        }
    }
};

const triggerFireworks = () => {
    const container = document.getElementById('fireworkContainer');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.top = `${Math.random() * 100}%`;
        firework.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        container.appendChild(firework);
        
        setTimeout(() => {
            firework.remove();
        }, 1000);
    }
};

// Main Initialization
const initializeApp = async () => {
    try {
        await configureClient();
        await handlePotentialRedirect();
        await updateAuthState();
        setupEventListeners();

        if (!window.location.search) {
            sessionStorage.removeItem('auth_state');
        }
    } catch (error) {
        console.error('App initialization failed:', error);
        showError('Failed to initialize application', true);
    }
};

const setupEventListeners = () => {
    const addAuthHandler = (id, connection) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    // Store state before redirect
                    const state = generateRandomState();
                    sessionStorage.setItem('auth_state', state);
                    console.log('Storing state before redirect:', state);
                    
                    await auth0Client.loginWithRedirect({
                        connection,
                        authorizationParams: {
                            state: state,
                            redirect_uri: window.location.origin // Match the configuration
                        }
                    });
                } catch (error) {
                    console.error('Login redirect failed:', error);
                    sessionStorage.removeItem('auth_state');
                    showError('Login failed. Please try again.');
                }
            });
        }
    };
    
    addAuthHandler('btn-login-github', 'github');
    addAuthHandler('btn-login-google', 'google');
    addAuthHandler('btn-login-figma', 'figma');
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
    
    document.getElementById('findMyHolidayButton')?.addEventListener('click', async () => {
        try {
            showLoading(true);
            triggerFireworks(); // Trigger fireworks animation
            
            // Make sure user is defined, use empty object as fallback
            const userData = user || {};
            const results = await personalizeContent(userData);
            
            if (!results || results.length === 0) {
                throw new Error("No suitable destinations found for your criteria");
            }
            
            // Display results using template literals properly
            const resultsElement = document.getElementById('results');
            if (resultsElement) {
                resultsElement.innerHTML = results.map(result => `
                    <div class="destination-card">
                        <h3>${result.city}</h3>
                        <p>Estimated Total: $${result.cost.total}</p>
                        <div class="price-breakdown">
                            <span>✈️ $${result.cost.flight}</span>
                            <span>🏨 $${result.cost.hotel}${result.cost.is_real_price ? ' (actual)' : ' (est)'}</span>
                        </div>
                        
                        ${result.firstHotel ? `
                        <div class="hotel-result">
                            <h4>${result.firstHotel.hotel_name || 'Hotel'}</h4>
                            <p>${result.firstHotel.address || ''}</p>
                            ${result.firstHotel.review_score ? 
                                `<p>Rating: ${result.firstHotel.review_score}/10</p>` : 
                                ''}
                            ${result.cost.is_real_price ? 
                                `<p class="hotel-price">$${result.cost.hotel} (verified price)</p>` : 
                                `<p class="hotel-price">$${result.cost.hotel} (estimated)</p>`}
                            ${result.photos ? `<img src="${result.photos}" alt="Hotel Photo" class="hotel-photo"/>` : ''}
                        </div>
                        ` : ''}
                        
                        ${result.error ? `<p class="error">${result.error}</p>` : ''}
                        ${result.hotels?.is_mock ? `<p class="note">Note: Using estimated hotel data</p>` : ''}
                    </div>
                `).join('');
            } else {
                console.error('Results element not found in the DOM');
            }
            
        } catch (error) {
            showError(error.message || "An unknown error occurred");
        } finally {
            showLoading(false);
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('errorMessage')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.style.display = 'none';
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px 0';
        errorDiv.style.backgroundColor = '#ffeeee';
        errorDiv.style.border = '1px solid red';
        errorDiv.style.borderRadius = '5px';
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    if (!document.getElementById('loader')) {
        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'loader';
        loaderDiv.style.display = 'none';
        loaderDiv.innerHTML = 'Loading...';
        loaderDiv.style.textAlign = 'center';
        loaderDiv.style.padding = '20px';
        document.body.appendChild(loaderDiv);
    }
    
    if (!document.getElementById('results')) {
        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'results';
        resultsDiv.style.display = 'none';
        document.body.appendChild(resultsDiv);
    }
    
    // Initialize the application
    initializeApp().then(() => {
        if (window.performance?.navigation?.type === 2) {
            sessionStorage.removeItem('auth_state');
            window.location.reload();
        }
    });
});

window.addEventListener('load', async () => {
    try {
        await auth0Client.checkSession();
        await updateAuthState();
    } catch (error) {
        console.error('Auth check failed:', error);
        document.body.classList.add('unauthenticated');
    }
});

// Add the missing validateDates function and showError/showLoading functions
const validateDates = (checkInDate, checkOutDate) => {
    if (!checkInDate || !checkOutDate) {
        throw new Error('Please select check-in and check-out dates');
    }
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past');
    }
    
    if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
    }
    
    return true;
};

const showError = (message, isImportant = false) => {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        if (!isImportant) {
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    } else {
        console.error(message);
    }
};

const showLoading = (isLoading = true) => {
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
    if (results) results.style.display = isLoading ? 'none' : 'block';
};

// Add missing fetchHotelPhotos and fetchHotelPrice functions
const fetchHotelPhotos = async (hotelId) => {
    try {
        // Validate hotel ID first
        if (!isValidHotelId(hotelId)) {
            console.warn(`Invalid hotel ID skipped: ${hotelId}`);
            return null;
        }
        
        // Use hotel details endpoint for photos
        const url = `${API_CONFIG.baseUrl}/api/v1/hotels/data`;
        const detailsUrl = new URL(url);
        detailsUrl.searchParams.append('hotel_id', hotelId);
        detailsUrl.searchParams.append('locale', 'en-us');
        
        const response = await fetchWithRetry(detailsUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error(`403 Forbidden: No access to hotel data for ID: ${hotelId}`);
                return null;
            }
            throw new Error(`Failed to fetch property details: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract photo URL from the response data structure
        const photoUrl = data?.data?.photos?.[0]?.url_max ||
                        data?.data?.main_photo_url ||
                        null;
        
        return photoUrl;
    } catch (error) {
        console.error('Error fetching property photos:', error);
        return null;
    }
};

const fetchHotelPrice = async (hotelId, checkInDate, checkOutDate) => {
    try {
        // Validate hotel ID first
        if (!isValidHotelId(hotelId)) {
            console.warn(`Invalid hotel ID for price lookup: ${hotelId}`);
            throw new Error('Invalid hotel ID');
        }
        
        // Use hotel search endpoint with specific hotel ID to get price
        const url = `${API_CONFIG.baseUrl}/api/v1/hotels/search`;
        const detailsUrl = new URL(url);
        detailsUrl.searchParams.append('hotel_id', hotelId);
        detailsUrl.searchParams.append('checkin_date', checkInDate);
        detailsUrl.searchParams.append('checkout_date', checkOutDate);
        detailsUrl.searchParams.append('adults_number', '2');
        detailsUrl.searchParams.append('room_number', '1');
        detailsUrl.searchParams.append('locale', 'en-us');
        detailsUrl.searchParams.append('currency', 'USD');
        
        const response = await fetchWithRetry(detailsUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error(`403 Forbidden: No access to pricing data for hotel ID: ${hotelId}`);
                throw new Error('API access denied for pricing data');
            }
            throw new Error(`Failed to fetch property price: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract price information from response
        if (data?.data?.[0]) {
            return {
                total_price: data.data[0].price_breakdown?.gross_price || 
                             data.data[0].min_total_price || 0,
                currency: data.data[0].price_breakdown?.currency || 'USD'
            };
        }
        
        throw new Error('No price information found');
    } catch (error) {
        console.error('Error fetching property price:', error);
        throw error;
    }
};

// Add new function for searching hotels by coordinates
const searchHotelsByCoordinates = async (latitude, longitude, checkInDate, checkOutDate) => {
    try {
        console.log(`Searching for hotels at coordinates: ${latitude}, ${longitude}`);
        
        // Use the search endpoint with coordinates
        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/search-by-coordinates`);
        
        const searchParams = {
            ...API_CONFIG.defaultParams,
            latitude: latitude,
            longitude: longitude,
            checkin_date: checkInDate,
            checkout_date: checkOutDate,
            adults_number: '2',
            room_number: '1',
            page_number: '1',
            currency: 'USD'
        };

        Object.entries(searchParams).forEach(([key, value]) => {
            hotelUrl.searchParams.append(key, value);
        });
        
        console.log('Coordinate search URL:', hotelUrl.toString());

        const hotelResponse = await fetchWithRetry(hotelUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!hotelResponse.ok) {
            throw new Error(`Hotel coordinate search failed: ${hotelResponse.status}`);
        }

        const hotelData = await hotelResponse.json();
        
        if (!hotelData?.data || hotelData.data.length === 0) {
            throw new Error('No hotels found at these coordinates');
        }

        return {
            data: hotelData.data,
            count: hotelData.data.length
        };
    } catch (error) {
        console.error('Coordinate search error:', error);
        throw error;
    }
};

// Add this function to validate hotel IDs
const isValidHotelId = (hotelId) => {
    if (!hotelId) return false;
    
    // Check if it's a string or can be converted to a string
    const idStr = String(hotelId).trim();
    
    // Basic validation - ensure the ID isn't empty and has reasonable length
    return idStr.length > 0 && idStr.length < 100;
};

/**
 * Process hotel search response to standardize format
 * @param {Object} apiResponse - The raw API response
 * @param {string} cityName - The city name for this search
 * @param {boolean} isMock - Whether this is mock data
 * @returns {Object} Standardized hotel data response
 */
const processHotelSearchResponse = (apiResponse, cityName, isMock = false) => {
    try {
        console.log(`Processing hotel data for ${cityName}`);
        
        // Handle different response formats
        let hotelData = [];
        
        if (apiResponse?.data?.hotels && Array.isArray(apiResponse.data.hotels)) {
            console.log(`Found ${apiResponse.data.hotels.length} hotels in main response format`);
            hotelData = apiResponse.data.hotels;
        } else if (apiResponse?.data && Array.isArray(apiResponse.data)) {
            console.log(`Found ${apiResponse.data.length} hotels in alternate response format`);
            hotelData = apiResponse.data;
        } else {
            console.warn(`Unexpected hotel data format for ${cityName}, response structure:`, 
                         Object.keys(apiResponse || {}).join(', '));
            return { data: [], count: 0, is_mock: true, error: 'Invalid data format' };
        }
        
        // Standardize and clean hotel objects
        const processedHotels = hotelData.map(hotel => {
            return {
                hotel_id: hotel.hotel_id || `mock-${cityName}-${Math.random().toString(36).substring(2, 7)}`,
                hotel_name: hotel.name || hotel.hotel_name || `${cityName} Hotel`,
                address: hotel.address?.address_line1 || hotel.address || `${cityName}, Unknown Address`,
                review_score: hotel.review_score || hotel.rating || (Math.random() * 2 + 7).toFixed(1),
                price: hotel.price?.rate || hotel.price || Math.floor(Math.random() * 100) + 100,
                photo_url: hotel.photo?.main?.url_max || hotel.main_photo_url || null
            };
        });
        
        return {
            data: processedHotels,
            count: processedHotels.length,
            is_mock: isMock
        };
    } catch (error) {
        console.error(`Error processing hotel data for ${cityName}:`, error);
        return { data: [], count: 0, is_mock: true, error: error.message };
    }
};

// Add this function to fetch and integrate real hotel prices
const integrateRealHotelPrices = async (result, checkInDate, checkOutDate) => {
    try {
        if (result.firstHotel && result.firstHotel.hotel_id) {
            // Try to get actual price from API
            const priceData = await fetchHotelPrice(result.firstHotel.hotel_id, checkInDate, checkOutDate);
            
            if (priceData && priceData.total_price) {
                console.log(`Got real price for ${result.city}: $${priceData.total_price}`);
                
                // Update the cost breakdown with real hotel price
                const realHotelPrice = Math.round(priceData.total_price);
                const updatedTotal = result.cost.flight + realHotelPrice;
                
                // Return updated cost object
                return {
                    flight: result.cost.flight,
                    hotel: realHotelPrice,
                    total: updatedTotal,
                    is_real_price: true
                };
            }
        }
        return result.cost; // Return original cost if we couldn't get real price
    } catch (error) {
        console.warn(`Couldn't get real hotel price for ${result.city}:`, error);
        return result.cost;
    }
};

// Then modify the personalizeContent function to use real prices
const personalizeContent = async (user) => {
    try {
        // Get input values from the form
        const inputs = {
            checkInDate: document.getElementById('holidayDate').value,
            checkOutDate: document.getElementById('returnDate').value,
            departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
            budget: parseInt(document.getElementById('budget').value) || 1500
        };
        
        // Validate inputs
        validateDates(inputs.checkInDate, inputs.checkOutDate);
        
        // Find destinations based on budget and dates
        const recommendations = TravelPlanner.findDestinations(
            inputs.budget,
            inputs.checkInDate,
            inputs.checkOutDate,
            inputs.departureLocation
        );
        
        // Process each recommendation to add hotel data
        const results = [];
        let successCount = 0;
        
        for (const rec of recommendations) {
            try {
                console.log(`Processing recommendation for ${rec.city}`);
                
                // Fetch hotels for this destination
                const hotels = await fetchHotelData(
                    rec.city,
                    inputs.budget * 0.6, // Allocate 60% of budget for hotel
                    inputs.checkInDate,
                    inputs.checkOutDate
                );
                
                if (hotels && hotels.data && hotels.data.length > 0) {
                    const firstHotel = hotels.data[0];
                    
                    // Extract hotel details
                    const hotelName = firstHotel.hotel_name || 'Hotel';
                    const hotelAddress = firstHotel.address || 'Address unavailable';
                    const reviewScore = firstHotel.review_score || 'N/A';
                    
                    // Try to get hotel photo
                    let photoUrl = null;
                    if (firstHotel.hotel_id) {
                        photoUrl = await fetchHotelPhotos(firstHotel.hotel_id);
                    }
                    
                    // Create result with initial cost estimate
                    const resultWithHotel = {
                        ...rec,
                        hotels: hotels,
                        firstHotel: {
                            ...firstHotel,
                            hotel_name: hotelName,
                            address: hotelAddress,
                            review_score: reviewScore
                        },
                        photos: photoUrl
                    };
                    
                    // Try to get real hotel price and update the cost
                    resultWithHotel.cost = await integrateRealHotelPrices(
                        resultWithHotel, 
                        inputs.checkInDate, 
                        inputs.checkOutDate
                    );
                    
                    // Add to results with hotel info
                    results.push(resultWithHotel);
                    
                    successCount++;
                } else {
                    // Should not reach here with our improved code
                    results.push({
                        ...rec,
                        hotels: null,
                        error: 'No hotels found'
                    });
                }
                
            } catch (error) {
                console.error(`Error processing ${rec.city}:`, error);
                // Add city to results with error info
                results.push({
                    ...rec,
                    error: error.message,
                    hotels: {
                        data: [],
                        is_mock: true
                    }
                });
            }
            
            // If we have 3 successful results, that's enough
            if (successCount >= 3) break;
        }

        return results;
    } catch (error) {
        console.error("Personalization error:", error);
        showError(error.message);
        return [];
    }
};

// Update the event listener for the button to show if price is real or estimated
document.getElementById('findMyHolidayButton')?.addEventListener('click', async () => {
    try {
        showLoading(true);
        triggerFireworks(); // Trigger fireworks animation
        
        const results = await personalizeContent(user);
        
        // Display results using template literals properly
        document.getElementById('results').innerHTML = results.map(result => `
            <div class="destination-card">
                <h3>${result.city}</h3>
                <p>Estimated Total: $${result.cost.total}</p>
                <div class="price-breakdown">
                    <span>✈️ $${result.cost.flight}</span>
                    <span>🏨 $${result.cost.hotel}${result.cost.is_real_price ? ' (actual)' : ' (est)'}</span>
                </div>
                
                ${result.firstHotel ? `
                <div class="hotel-result">
                    <h4>${result.firstHotel.hotel_name || 'Hotel'}</h4>
                    <p>${result.firstHotel.address || ''}</p>
                    ${result.firstHotel.review_score ? 
                        `<p>Rating: ${result.firstHotel.review_score}/10</p>` : 
                        ''}
                    ${result.cost.is_real_price ? 
                        `<p class="hotel-price">$${result.cost.hotel} (verified price)</p>` : 
                        `<p class="hotel-price">$${result.cost.hotel} (estimated)</p>`}
                    ${result.photos ? `<img src="${result.photos}" alt="Hotel Photo" class="hotel-photo"/>` : ''}
                </div>
                ` : ''}
                
                ${result.error ? `<p class="error">${result.error}</p>` : ''}
                ${result.hotels?.is_mock ? `<p class="note">Note: Using estimated hotel data</p>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
});



