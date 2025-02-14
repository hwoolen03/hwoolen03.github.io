const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3',
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
            redirect_uri: "https://hwoolen03.github.io/indexsignedin"
        });
        console.log("Auth0 client configured successfully");
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
            .filter(dest => dest.cost.total <= budget * 1.3 && dest.cost.total >= budget * 0.7)
            .sort((a, b) => a.cost.total - b.cost.total)
            .slice(0, maxResults);
    }
};

// API Functions
const searchRoundtripFlights = async (fromIATA, toIATA, date) => { /* implementation */ };
const fetchHotelData = async (destinationIATA, budget, checkInDate, checkOutDate) => { /* implementation */ };

// UI Handlers
const showLoading = (show = true) => {
    document.querySelector('.loading-indicator').hidden = !show;
    document.getElementById('findMyHolidayButton').disabled = show;
};

const showError = (message) => {
    const errorElement = document.querySelector('.api-error');
    errorElement.textContent = message;
    errorElement.hidden = false;
    setTimeout(() => errorElement.hidden = true, 5000);
};

// Main Workflow
const personalizeContent = async (user) => {
    const inputs = {
        checkInDate: document.getElementById('holidayDate').value,
        checkOutDate: document.getElementById('returnDate').value,
        departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
        budget: parseInt(document.getElementById('budget').value)
    };

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
                fetchHotelData(rec.iata, inputs.budget, inputs.checkInDate, inputs.checkOutDate)
            ])
        )
    );

    return recommendations.map((rec, index) => ({
        ...rec,
        flights: apiResults[index].value[0],
        hotels: apiResults[index].value[1]
    }));
};

// Auth State Management
const updateAuthState = async () => {
    try {
        const isAuthed = await auth0Client.isAuthenticated();
        document.body.classList.toggle('authenticated', isAuthed);
        document.body.classList.toggle('unauthenticated', !isAuthed);
    } catch (error) {
        console.error("Auth state check failed:", error);
    }
};

// Main Initialization
window.onload = async () => {
    try {
        await configureClient();

        // Handle Auth0 redirect callback
        const isRedirect = window.location.search.includes('code=') || window.location.search.includes('error=');
        if (isRedirect) {
            try {
                const { appState } = await auth0Client.handleRedirectCallback();
                const storedState = sessionStorage.getItem('auth_state');
                
                console.log("Stored state:", storedState);
                console.log("App state from Auth0:", appState?.customState);
                
                if (storedState !== appState?.customState) {
                    throw new Error("Invalid state");
                }

                sessionStorage.removeItem('auth_state');
                window.history.replaceState({}, document.title, "https://hwoolen03.github.io/indexsignedin");
            } catch (error) {
                console.error("Redirect error:", error);
                showError('Authentication failed. Please try again.');
                return;
            }
        }

        // Update authentication state
        const isAuthenticated = await auth0Client.isAuthenticated();
        await updateAuthState();

        // Update UI elements
        document.getElementById('btn-login-github').style.display = isAuthenticated ? 'none' : 'block';
        document.getElementById('btn-login-google').style.display = isAuthenticated ? 'none' : 'block';
        document.getElementById('btn-login-figma').style.display = isAuthenticated ? 'none' : 'block';
        document.getElementById('signOutBtn').style.display = isAuthenticated ? 'block' : 'none';

        // Get user data if authenticated
        if (isAuthenticated) {
            user = await auth0Client.getUser();
            console.log("Authenticated user:", user);
        }

        // Setup login buttons
        const setupLoginButton = (id, connection) => {
            document.getElementById(id).addEventListener('click', async () => {
                const state = Math.random().toString(36).substring(2);
                sessionStorage.setItem('auth_state', state);
                console.log("State stored before redirect:", state);
                await auth0Client.loginWithRedirect({
                    connection: connection,
                    appState: { customState: state }
                });
            });
        };

        setupLoginButton('btn-login-github', 'github');
        setupLoginButton('btn-login-google', 'google');
        setupLoginButton('btn-login-figma', 'figma');

        // Setup signout
        document.getElementById('signOutBtn').addEventListener('click', signOut);

        // Main application handler
        document.getElementById('findMyHolidayButton').addEventListener('click', async () => {
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
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                showError(error.message);
            } finally {
                showLoading(false);
            }
        });

    } catch (error) {
        console.error("Initialization error:", error);
        showError('Failed to initialize. Please refresh.');
    }
};

// Call this after auth initialization
window.addEventListener('load', async () => {
    try {
        await auth0Client.checkSession();
        await updateAuthState();
    } catch (error) {
        console.error('Auth check failed:', error);
        document.body.classList.add('unauthenticated');
    }
});
