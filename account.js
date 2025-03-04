// API Headers and Configuration
const API_HEADERS = {
    'x-rapidapi-key': '223e1d4481mshc763834ea442154p1feb5cjsnf57de44ce22c',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

const API_CONFIG = {
    baseUrl: 'https://booking-com15.p.rapidapi.com/api/v2',
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

    xhr.open('GET', `${API_CONFIG.baseUrl}/flights/getMinPrice?fromId=${fromIATA}.AIRPORT&toId=${toIATA}.AIRPORT&cabinClass=ECONOMY&currency_code=USD`);
    xhr.setRequestHeader('x-rapidapi-key', API_HEADERS['x-rapidapi-key']);
    xhr.setRequestHeader('x-rapidapi-host', API_HEADERS['x-rapidapi-host']);
    xhr.send();
};

// Replace the fetchHotelData function
const fetchHotelData = async (cityName, budget, checkInDate, checkOutDate) => {
    try {
        // Get destination ID
        const destinationUrl = `${API_CONFIG.baseUrl}/hotels/searchDestination`;
        const searchUrl = new URL(destinationUrl);
        searchUrl.searchParams.append('query', cityName);
        
        const destResponse = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) {
            throw new Error(`Failed to find destination: ${destResponse.status}`);
        }

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData); // Debug log
        
        if (!destData?.data?.length) {
            throw new Error(`No destination found for ${cityName}`);
        }

        const destId = destData.data[0].dest_id;
        if (!destId || destId.startsWith('-')) {
            throw new Error(`Invalid destination ID for ${cityName}`);
        }
        
        await delay(API_CONFIG.delay);

        // Updated hotel search URL with v2 endpoint
        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/hotels/search`);
        const searchParams = {
            ...API_CONFIG.defaultParams,
            dest_id: destId,
            checkin: checkInDate,
            checkout: checkOutDate,
            adults: '2',
            room_qty: '1',
            page_number: '1',
            sort_order: 'PRICE',
            filter_by: 'HOTEL'
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
        
        if (!hotelData?.data || hotelData.data.length === 0) {
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
        const destinationUrl = `${API_CONFIG.baseUrl}/hotels/searchDestination`;
        const searchUrl = new URL(destinationUrl);
        searchUrl.searchParams.append('query', location);
        
        const destResponse = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) {
            throw new Error(`Failed to find destination: ${destResponse.status}`);
        }

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData); // Debug log
        
        if (!destData?.data?.length) {
            throw new Error(`No destination found for ${location}`);
        }

        const destId = destData.data[0].dest_id;
        if (!destId || destId.startsWith('-')) {
            throw new Error(`Invalid destination ID for ${location}`);
        }
        
        await delay(API_CONFIG.delay);

        const hotelUrl = new URL(`${API_CONFIG.baseUrl}/hotels/search`);
        const searchParams = {
            ...API_CONFIG.defaultParams,
            dest_id: destId,
            checkin: checkInDate,
            checkout: checkOutDate,
            adults: '2',
            room_qty: '1',
            page_number: '1',
            sort_order: 'PRICE',
            filter_by: 'HOTEL'
        };

        Object.entries(searchParams).forEach(([key, value]) => {
            hotelUrl.searchParams.append(key, value);
        });

        const hotelResponse = await fetchWithRetry(hotelUrl.toString(), {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!hotelResponse.ok) {
            throw new Error(`Hotel search failed: ${hotelResponse.status} - ${await hotelResponse.text()}`);
        }

        const hotelData = await hotelResponse.json();
        
        if (!hotelData?.data || hotelData.data.length === 0) {
            throw new Error(`No hotels found in ${location}`);
        }

        return hotelData;
    } catch (error) {
        console.error('Hotel verification error:', error);
        throw new Error(`Couldn't find hotels in ${location}: ${error.message}`);
    }
};

const fetchHotelPhotos = (hotelId) => {
    return new Promise((resolve, reject) => {
        console.log(`Fetching photos for hotel ID: ${hotelId}`); // Add logging
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.responseType = 'blob';

        xhr.addEventListener('readystatechange', function () {
            if (this.readyState === this.DONE) {
                if (this.status === 404) {
                    console.error(`Photos not found for hotel ID: ${hotelId}`);
                    return reject(new Error('Photos not found'));
                }
                try {
                    const blob = this.response;
                    const imageUrl = URL.createObjectURL(blob);
                    console.log(`Fetched photo URL: ${imageUrl}`); // Add logging
                    resolve(imageUrl);
                } catch (err) {
                    console.error('Error processing hotel photo:', err); // Add logging
                    reject(err);
                }
            }
        });

        xhr.open('GET', `${API_CONFIG.baseUrl}/hotels/getHotelPhotos?hotel_id=${hotelId}`);
        xhr.setRequestHeader('x-rapidapi-key', API_HEADERS['x-rapidapi-key']);
        xhr.setRequestHeader('x-rapidapi-host', API_HEADERS['x-rapidapi-host']);
        xhr.send();
    });
};

const fetchHotelPrice = (hotelId, checkInDate, checkOutDate) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener('readystatechange', function () {
            if (this.readyState === this.DONE) {
                if (this.status === 404) {
                    console.error(`Hotel price not found for hotel ID: ${hotelId}`);
                    return reject(new Error('Hotel price not found'));
                }
                try {
                    const priceData = JSON.parse(this.responseText);
                    resolve(priceData);
                } catch (err) {
                    console.error('Error fetching hotel price:', err); // Improved logging
                    reject(err);
                }
            }
        });

        xhr.open('GET', `${API_CONFIG.baseUrl}/hotels/getHotelPrice?hotel_id=${hotelId}&checkin_date=${checkInDate}&checkout_date=${checkOutDate}&currency_code=USD`);
        xhr.setRequestHeader('x-rapidapi-key', API_HEADERS['x-rapidapi-key']);
        xhr.setRequestHeader('x-rapidapi-host', API_HEADERS['x-rapidapi-host']);
        xhr.send();
    });
};

// Function to validate date inputs
const validateDates = (checkInDate, checkOutDate) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();

    if (isNaN(checkIn) || isNaN(checkOut)) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }
    if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past.');
    }
    if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date.');
    }
};

// UI Handlers
const showLoading = (show = true) => {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.hidden = !show;
    }
    document.getElementById('findMyHolidayButton').disabled = show;
};

// Update showError function to create container if it doesn't exist
const showError = (message, fatal = false) => {
    let errorElement = document.querySelector('.api-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'api-error';
        document.body.appendChild(errorElement);
    }

    errorElement.innerHTML = `
        <div class="error-message ${fatal ? 'fatal' : ''}">
            ${message}
            ${fatal ? '<button class="reload-btn">Reload Page</button>' : ''}
        </div>
    `;

    errorElement.hidden = false;
    if (fatal) {
        errorElement.querySelector('.reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
    } else {
        setTimeout(() => errorElement.hidden = true, 5000);
    }
};

// Main Workflow
// Update personalizeContent function to handle API calls sequentially
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
    for (const rec of recommendations) {
        try {
            console.log(`Processing destination: ${rec.city}`);
            await delay(API_DELAY);
            
            const hotelData = await verifyHotelIds(rec.city, inputs.checkInDate, inputs.checkOutDate);
            console.log(`Found ${hotelData?.data?.length || 0} hotels for ${rec.city}`);
            
            // Only process first hotel to avoid overloading API
            if (hotelData?.data?.length > 0) {
                const firstHotel = hotelData.data[0];
                console.log(`Selected hotel: ${firstHotel.hotel_name || 'Unknown'}`);
                
                let hotelPhoto = null;
                let hotelPrice = null;
                
                try {
                    if (firstHotel.hotel_id) {
                        await delay(API_DELAY);
                        hotelPhoto = await fetchHotelPhotos(firstHotel.hotel_id);
                        
                        await delay(API_DELAY);
                        hotelPrice = await fetchHotelPrice(
                            firstHotel.hotel_id, 
                            inputs.checkInDate, 
                            inputs.checkOutDate
                        );
                    }
                } catch (innerError) {
                    console.warn(`Error fetching hotel details for ${rec.city}:`, innerError);
                }
                
                results.push({
                    ...rec,
                    hotels: hotelData,
                    photos: hotelPhoto,
                    price: hotelPrice
                });
            } else {
                results.push({
                    ...rec,
                    hotels: null,
                    error: 'No hotels found'
                });
            }
            
        } catch (error) {
            console.error(`Error processing ${rec.city}:`, error);
            results.push({
                ...rec,
                error: error.message
            });
        }
    }

    return results;
}

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

const setupEventListeners = () => {
    const addAuthHandler = (id, connection) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    const state = generateRandomState();
                    // Store state before redirect
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
            showLoading();
            triggerFireworks(); // Trigger fireworks animation
            const results = await personalizeContent(user);

            document.getElementById('results').innerHTML = results.map(result => `
                <div class="destination-card">
                    <h3>${result.city}</h3>
                    <p>Estimated Total: $${result.cost.total}</p>
                    <div class="price-breakdown">
                        <span>✈️ $${result.cost.flight}</span>
                        <span>🏨 $${result.cost.hotel}</span>
                    </div>
                    <div class="api-results">
                        ${result.flights?.data ? `<pre>${JSON.stringify(result.flights.data.slice(0, 2), null, 2)}</pre>` : ''}
                        ${result.hotels?.data ? `<pre>${JSON.stringify(result.hotels.data.slice(0, 2), null, 2)}</pre>` : ''}
                        ${result.photos ? `<img src="${result.photos}" alt="Hotel Photo"/>` : ''}
                        ${result.price ? `<pre>${JSON.stringify(result.price, null, 2)}</pre>` : ''} <!-- Display hotel price -->
                    </div>
                </div>
            `).join('');
        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    });
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



