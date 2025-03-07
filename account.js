// API Headers and Configuration
const API_HEADERS = {
    'x-rapidapi-key': '223e1d4481mshc763834ea442154p1feb5cjsnf57de44ce22c',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

const API_CONFIG = {
    baseUrl: 'https://booking-com15.p.rapidapi.com',  // Remove "/api/v2"
    delay: 1000,
    defaultParams: {
        currency_code: 'USD',
        units: 'metric',
        language_code: 'en-us'
    }
};

// Add this at the top with other constants
const API_DELAY = 1000; // Delay between API calls in milliseconds

// Add this utility function for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Add this utility function for API retry mechanism
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      console.log(`Retry ${i+1}/${retries} failed for ${url}`);
      if (i === retries - 1) throw err;
      await delay(2000); // Longer delay for retries
    }
  }
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
const searchRoundtripFlights = async (fromIATA, toIATA, date) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener('readystatechange', function () {
        if (this.readyState === this.DONE) {
            if (this.status === 404) {
                console.error(`Flight data not found for route: ${fromIATA} to ${toIATA}`);
                return;
            }
            console.log(this.responseText);
        }
    });

    xhr.open('GET', `${API_CONFIG.baseUrl}/api/v1/flights/getMinPrice?fromId=${fromIATA}.AIRPORT&toId=${toIATA}.AIRPORT&cabinClass=ECONOMY&currency_code=USD`);
    xhr.setRequestHeader('x-rapidapi-key', API_HEADERS['x-rapidapi-key']);
    xhr.setRequestHeader('x-rapidapi-host', API_HEADERS['x-rapidapi-host']);
    xhr.send();
};

// Replace the fetchHotelData function
const fetchHotelData = async (cityName, budget, checkInDate, checkOutDate) => {
    try {
        // Get destination ID
        const destinationUrl = `${API_CONFIG.baseUrl}/api/v1/hotels/locations`;  // Updated to v1
        const searchUrl = new URL(destinationUrl);
        searchUrl.searchParams.append('query', encodeURIComponent(cityName));  // Properly encode the city name
        
        const destResponse = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) {
            throw new Error(`Failed to find destination: ${destResponse.status}`);
        }

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData); // Debug log
        
        if (!destData?.length) {
            throw new Error(`No destination found for ${cityName}`);
        }

        // Log the first destination to see its format
        console.log('First destination entry:', destData[0]);
        
        const destId = destData[0].dest_id;
        if (!destId) {
            throw new Error(`Missing destination ID for ${cityName}`);
        }
        
        await delay(API_CONFIG.delay);

        // Updated hotel search URL with v1 endpoint
        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/search`);
        const searchParams = {
            ...API_CONFIG.defaultParams,
            dest_id: destId,
            checkin_date: checkInDate, // Changed from arrival_date
            checkout_date: checkOutDate, // Changed from departure_date
            adults: '2',
            room_qty: '1', // Changed from rooms
            page_number: '1',
            sort_order: 'PRICE',
            filter_by_currency: 'USD'
        };

        Object.entries(searchParams).forEach(([key, value]) => {
            hotelUrl.searchParams.append(key, value);
        });

        const hotelResponse = await fetchWithRetry(hotelUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!hotelResponse.ok) {
            throw new Error(`Hotel search failed: ${hotelResponse.status}`);
        }

        const hotelData = await hotelResponse.json();
        
        if (!hotelData?.results || hotelData.results.length === 0) {
            throw new Error(`No hotels found in ${cityName}`);
        }

        return hotelData;

    } catch (error) {
        console.error('Hotel data fetch error:', error);
        throw error;
    }
};

// Update verifyHotelIds function
const verifyHotelIds = async (location, checkInDate, checkOutDate) => {
    try {
        console.log(`Searching for destination: ${location}`);
        const destinationUrl = `${API_CONFIG.baseUrl}/api/v1/hotels/locations`;
        const searchUrl = new URL(destinationUrl);
        searchUrl.searchParams.append('query', encodeURIComponent(location));
        
        const destResponse = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) {
            console.log('Destination search error response:', await destResponse.text());
            throw new Error(`Failed to find destination: ${destResponse.status}`);
        }

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData); // Debug log
        
        if (!destData?.length) {
            console.log('Empty destination data, trying alternative search');
            // Try with a broader search term
            return await searchDestinationByCountry(location, checkInDate, checkOutDate);
        }

        // Log all destination entries to find the correct one
        console.log('Destination entries:', destData);
        
        // Find the most relevant destination entry
        const destEntry = findBestDestinationMatch(destData, location);
        if (!destEntry) {
            throw new Error(`No suitable destination found for ${location}`);
        }
        
        console.log('Selected destination entry:', destEntry);
        
        // Extract destination ID
        const destId = destEntry.dest_id;
        
        if (!destId) {
            throw new Error(`Missing destination ID for ${location}`);
        }
        
        console.log(`Using destination ID: ${destId} for ${location}`);
        
        await delay(API_CONFIG.delay);

        // Updated hotel search URL with correct parameter names
        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/search`);
        const searchParams = {
            ...API_CONFIG.defaultParams,
            dest_id: destId,
            checkin_date: checkInDate, // Changed from arrival_date
            checkout_date: checkOutDate, // Changed from departure_date
            adults: '2',
            room_qty: '1', // Changed from rooms
            page_number: '1',
            sort_order: 'PRICE',
            filter_by_currency: 'USD'
        };

        Object.entries(searchParams).forEach(([key, value]) => {
            hotelUrl.searchParams.append(key, value);
        });
        
        console.log('Hotel search URL:', hotelUrl.toString());

        const hotelResponse = await fetchWithRetry(hotelUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!hotelResponse.ok) {
            console.log('Hotel search error response:', await hotelResponse.text());
            throw new Error(`Hotel search failed: ${hotelResponse.status}`);
        }

        const hotelData = await hotelResponse.json();
        console.log('Full hotel search response:', hotelData); // Debug full response
        
        // Check for API response status
        if (hotelData.status === false) {
            console.log('API Error Details:', hotelData.message);
            const errorMessage = Array.isArray(hotelData.message) 
                ? hotelData.message.join(', ') 
                : (hotelData.message || 'Unknown API error');
                
            throw new Error(`API Error: ${errorMessage}`);
        }
        
        if (!hotelData?.results || hotelData.results.length === 0) {
            // Fall back to mock data
            console.log(`No hotels found for ${location}, falling back to mock data`);
            return createMockHotelData(location);
        }

        return {
            data: hotelData.results,
            count: hotelData.results.length
        };
    } catch (error) {
        console.error('Hotel verification error:', error);
        // Always return mock data instead of throwing again
        return createMockHotelData(location);
    }
};

// Helper function to find best destination match - UPDATED
const findBestDestinationMatch = (destinations, searchTerm) => {
    searchTerm = searchTerm.toLowerCase();
    
    // Filter out hotel-type destinations first, prefer cities
    const cityDestinations = destinations.filter(dest => 
        dest.dest_type?.toLowerCase() === 'city'
    );

    // Use city destinations if available, otherwise fall back to all destinations
    const destinationsToScore = cityDestinations.length > 0 ? cityDestinations : destinations;
    
    const scored = destinationsToScore.map(dest => {
        let score = 0;
        
        // Type priority scoring - prefer cities
        if (dest.dest_type?.toLowerCase() === 'city') {
            score += 500;
        } else if (dest.dest_type?.toLowerCase() === 'district') {
            score += 300;
        } else if (dest.dest_type?.toLowerCase() === 'region') {
            score += 200;
        }

        // Name matching scoring
        const nameMatches = [
            dest.city_name?.toLowerCase(),
            dest.name?.toLowerCase(),
            dest.label?.toLowerCase()
        ].filter(Boolean);

        nameMatches.forEach(name => {
            if (name === searchTerm) score += 500;
            if (name.includes(searchTerm)) score += 300;
        });

        return { dest, score };
    });

    scored.sort((a, b) => b.score - a.score);
    console.log('Destination scores:', scored.map(s => ({ 
        name: s.dest.name || s.dest.city_name || s.dest.label, 
        type: s.dest.dest_type,
        score: s.score 
    })));
    
    return scored[0]?.dest || destinations[0];
};

// Fallback function for destination search
const searchDestinationByCountry = async (location, checkInDate, checkOutDate) => {
    try {
        // For cities, try searching with "City, Country" format
        const commonDestinations = {
            'New York': 'New York, United States',
            'Los Angeles': 'Los Angeles, United States',
            'Chicago': 'Chicago, United States',
            'Dallas': 'Dallas, United States',
            'Manila': 'Manila, Philippines',
            'London': 'London, United Kingdom',
            'Paris': 'Paris, France',
            'Tokyo': 'Tokyo, Japan'
            // Add more as needed
        };
        
        const searchLocation = commonDestinations[location] || location;
        console.log(`Trying alternative search with: ${searchLocation}`);
        
        const destinationUrl = `${API_CONFIG.baseUrl}/api/v1/hotels/locations`;
        const searchUrl = new URL(destinationUrl);
        searchUrl.searchParams.append('query', encodeURIComponent(searchLocation));
        // Removed type parameter that was causing issues
        
        const destResponse = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) {
            throw new Error(`Failed to find alternative destination: ${destResponse.status}`);
        }

        const locationsData = await destResponse.json();
        console.log('Alternative location search response:', locationsData);
        
        if (!locationsData || !locationsData.length) {
            throw new Error(`No alternative destinations found for ${searchLocation}`);
        }
        
        // Find city type destination
        const cityDest = locationsData.find(loc => loc.dest_type === 'city');
        const destId = cityDest?.dest_id || locationsData[0]?.dest_id;
        
        if (!destId) {
            throw new Error(`No valid destination ID found for ${searchLocation}`);
        }
        
        console.log(`Using alternative destination ID: ${destId}`);
        
        await delay(API_CONFIG.delay);
        
        // Use v1 endpoint for hotel search
        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/api/v1/hotels/search`);
        const searchParams = {
            ...API_CONFIG.defaultParams,
            dest_id: destId,
            checkin_date: checkInDate,
            checkout_date: checkOutDate,
            adults: '2',
            room_qty: '1',
            page_number: '1'
        };

        Object.entries(searchParams).forEach(([key, value]) => {
            hotelUrl.searchParams.append(key, value);
        });
        
        console.log('Alternative hotel search URL:', hotelUrl.toString());

        const hotelResponse = await fetchWithRetry(hotelUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!hotelResponse.ok) {
            throw new Error(`Alternative hotel search failed: ${hotelResponse.status}`);
        }

        const hotelData = await hotelResponse.json();
        
        if (!hotelData?.results || hotelData.results.length === 0) {
            // Try to create mock data as final fallback
            return createMockHotelData(location);
        }
        
        // Return in standard format
        return {
            data: hotelData.results,
            count: hotelData.results.length
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

// Update personalizeContent function to handle errors better
const personalizeContent = async (user) => {
    const inputs = {
        checkInDate: document.getElementById('holidayDate').value,
        checkOutDate: document.getElementById('returnDate').value,
        departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
        budget: parseInt(document.getElementById('budget').value)
    };

    validateDates(inputs.checkInDate, inputs.checkOutDate);

    const recommendations = TravelPlanner.findDestinations(
        inputs.budget,
        inputs.checkInDate,
        inputs.checkOutDate,
        inputs.departureLocation
    );

    if (recommendations.length === 0) {
        throw new Error('No destinations match your budget. Try increasing by 20%');
    }

    console.log('Processing recommendations:', recommendations);
    
    const results = [];
    let successCount = 0;
    
    for (const rec of recommendations.slice(0, 5)) { // Process max 5 recommendations
        try {
            console.log(`Processing destination: ${rec.city}`);
            await delay(API_DELAY);
            
            // Get hotel data with fallback to mock data
            const hotelData = await verifyHotelIds(rec.city, inputs.checkInDate, inputs.checkOutDate);
            console.log(`Found ${hotelData?.data?.length || 0} hotels for ${rec.city}`);
            
            // Only process if we have hotel data
            if (hotelData?.data?.length > 0) {
                const firstHotel = hotelData.data[0];
                console.log(`Selected hotel: ${firstHotel.hotel_name || 'Unknown'}`);
                
                let hotelPhoto = null;
                let hotelPrice = null;
                
                // Only try to fetch additional data if not mock
                if (firstHotel.hotel_id && !hotelData.is_mock) {
                    try {
                        await delay(API_DELAY);
                        hotelPhoto = await fetchHotelPhotos(firstHotel.hotel_id);
                    } catch (photoError) {
                        console.warn(`Could not fetch hotel photo: ${photoError.message}`);
                    }
                    
                    try {
                        await delay(API_DELAY);
                        hotelPrice = await fetchHotelPrice(
                            firstHotel.hotel_id, 
                            inputs.checkInDate, 
                            inputs.checkOutDate
                        );
                    } catch (priceError) {
                        console.warn(`Could not fetch hotel price: ${priceError.message}`);
                    }
                }
                
                // Always have a fallback price
                if (!hotelPrice) {
                    hotelPrice = {
                        total_price: firstHotel.price || rec.cost.hotel,
                        currency: "USD",
                        is_estimate: !firstHotel.price
                    };
                }
                
                results.push({
                    ...rec,
                    hotels: hotelData,
                    photos: hotelPhoto,
                    price: hotelPrice,
                    firstHotel: firstHotel
                });
                
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
            
            const results = await personalizeContent(user);
            
            // Display results using template literals properly
            document.getElementById('results').innerHTML = results.map(result => `
                <div class="destination-card">
                    <h3>${result.city}</h3>
                    <p>Estimated Total: $${result.cost.total}</p>
                    <div class="price-breakdown">
                        <span>✈️ $${result.cost.flight}</span>
                        <span>🏨 $${result.cost.hotel}</span>
                    </div>
                    
                    ${result.firstHotel ? `
                    <div class="hotel-result">
                        <h4>${result.firstHotel.hotel_name || 'Hotel'}</h4>
                        <p>${result.firstHotel.address || ''}</p>
                        ${result.firstHotel.review_score ? 
                            `<p>Rating: ${result.firstHotel.review_score}/10</p>` : 
                            ''}
                        ${result.price?.total_price ? 
                            `<p class="hotel-price">$${result.price.total_price} ${result.price.is_estimate || result.price.is_mock ? '(estimated)' : ''}</p>` : 
                            ''}
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
};

document.addEventListener('DOMContentLoaded', () => {
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
        const url = `${API_CONFIG.baseUrl}/api/v1/hotels/details?hotel_id=${hotelId}`; // Updated to v1 path
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch hotel details: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Return the first photo URL or null if none available
        return data?.hotel?.photos?.[0]?.url_max || null; // Updated path to photo in response
    } catch (error) {
        console.error('Error fetching hotel photos:', error);
        return null;
    }
};

const fetchHotelPrice = async (hotelId, checkInDate, checkOutDate) => {
    try {
        const url = `${API_CONFIG.baseUrl}/api/v1/hotels/details?hotel_id=${hotelId}&checkin_date=${checkInDate}&checkout_date=${checkOutDate}`; // Updated to v1 path
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch hotel price: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract price information - updated to match v1 response format
        const priceInfo = data?.hotel?.price || {};
        return {
            total_price: priceInfo.gross || 0,
            currency: priceInfo.currency || 'USD'
        };
    } catch (error) {
        console.error('Error fetching hotel price:', error);
        throw error;
    }
};



