// API Headers
const API_HEADERS = {
    'x-rapidapi-key': '223e1d4481mshc763834ea442154p1feb5cjsnf57de44ce22c',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
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
        northAmerica: { flightBase: 300, hotelBase: 80, codePrefix: 'NA', multiplier: 1.0 },
        europe: { flightBase: 400, hotelBase: 100, codePrefix: 'EU', multiplier: 1.1 },
        asia: { flightBase: 500, hotelBase: 60, codePrefix: 'AS', multiplier: 0.95 },
        oceania: { flightBase: 700, hotelBase: 120, codePrefix: 'OC', multiplier: 1.2 }
    },

    generateDestinations(perRegion = 25) {
        const destinations = [];
        Object.entries(this.regions).forEach(([regionKey, config]) => {
            for (let i = 1; i <= perRegion; i++) {
                destinations.push({
                    iata: `${config.codePrefix}${i.toString().padStart(2, '0')}`,
                    city: `${this.capitalize(regionKey)} City ${i}`,
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

    findDestinations(budget, checkInDate, checkOutDate, maxResults = 5) {
        const nights = this.calculateNights(checkInDate, checkOutDate);
        return this.destinations
            .map(dest => ({
                ...dest,
                cost: this.calculateTripCost(dest, checkInDate, nights)
            }))
            .filter(dest => {
                const budgetRange = dest.multiplier > 1
                    ? [budget * 0.6, budget * 1.4]
                    : [budget * 0.7, budget * 1.3];
                return dest.cost.total >= budgetRange[0] && dest.cost.total <= budgetRange[1];
            })
            .sort((a, b) => a.cost.total - b.cost.total)
            .slice(0, maxResults);
    }
};

// API Functions
const searchRoundtripFlights = async (fromIATA, toIATA, date) => { /* implementation */ };
const fetchHotelData = async (destinationIATA, budget, checkInDate, checkOutDate) => { /* implementation */ };
const fetchHotelPhotos = async () => {
    const response = await fetch(
        'https://booking-com15.p.rapidapi.com/api/v1/hotels/getHotelPhotos?hotel_id=5955189',
        { headers: API_HEADERS }
    );
    return response.json();
};

// UI Handlers
const showLoading = (show = true) => {
    document.querySelector('.loading-indicator').hidden = !show;
    document.getElementById('findMyHolidayButton').disabled = show;
};

const showError = (message, fatal = false) => {
    const errorElement = document.querySelector('.api-error');
    if (!errorElement) {
        console.error('Error container element not found');
        return;
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
const personalizeContent = async (user) => {
    const inputs = {
        checkInDate: document.getElementById('holidayDate').value,
        checkOutDate: document.getElementById('returnDate').value,
        departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
        budget: parseInt(document.getElementById('budget').value)
    };

    const today = new Date().setHours(0, 0, 0, 0);
    const checkIn = new Date(inputs.checkInDate).setHours(0, 0, 0, 0);

    if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past');
    }
    if (new Date(inputs.checkOutDate) < new Date(inputs.checkInDate)) {
        throw new Error('Check-out date must be after check-in date');
    }
    if (inputs.budget < 300) throw new Error('Budget must be at least $300');

    const recommendations = TravelPlanner.findDestinations(
        inputs.budget,
        inputs.checkInDate,
        inputs.checkOutDate
    );

    if (recommendations.length === 0) {
        throw new Error('No destinations match your budget. Try increasing by 20%');
    }

    const apiResults = await Promise.allSettled(
        recommendations.map(rec =>
            Promise.all([
                searchRoundtripFlights(inputs.departureLocation, rec.iata, inputs.checkInDate),
                fetchHotelData(rec.iata, inputs.budget, inputs.checkInDate, inputs.checkOutDate),
                fetchHotelPhotos()
            ])
        )
    );

    return recommendations.map((rec, index) => ({
        ...rec,
        flights: apiResults[index].value[0],
        hotels: apiResults[index].value[1],
        photos: apiResults[index].value[2]
    }));
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
                        ${result.photos?.data ? `<pre>${JSON.stringify(result.photos.data.slice(0, 2), null, 2)}</pre>` : ''}
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


