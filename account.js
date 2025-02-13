const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Auth0 Configuration
let auth0Client;
let user; // Define the user variable in the global scope

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
            .filter(dest => dest.cost.total <= budget * 1.3 && dest.cost.total >= budget * 0.7) // Changed from 1.15/0.85
            .sort((a, b) => a.cost.total - b.cost.total)
            .slice(0, maxResults);
    }
};

// API Functions (remain unchanged)
const searchRoundtripFlights = async (fromIATA, toIATA, date) => { /* existing implementation */ };
const fetchHotelData = async (destinationIATA, budget, checkInDate, checkOutDate) => { /* existing implementation */ };

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

// Add the new window.onload function here
window.onload = async () => {
    try {
        await configureClient();

        const isRedirect = window.location.search.includes('code=') || window.location.search.includes('error=');
        if (isRedirect) {
            try {
                const { appState } = await auth0Client.handleRedirectCallback();
                const storedState = localStorage.getItem('auth_state');
                if (storedState !== appState.state) {
                    throw new Error("Invalid state");
                }
                localStorage.removeItem('auth_state');
                window.history.replaceState({}, document.title, 'https://hwoolen03.github.io/indexsignedin');
            } catch (error) {
                console.error("Redirect callback error:", error);
                showError('Authentication error. Please try again.');
                return;
            }
        }

        const isAuthenticated = await auth0Client.isAuthenticated();

        // Toggle button visibility based on authentication
        if (!isAuthenticated) {
            console.log("User is not authenticated");
            // Show login buttons
            document.getElementById('btn-login-github').style.display = "block";
            document.getElementById('btn-login-google').style.display = "block";
            document.getElementById('btn-login-figma').style.display = "block";
            document.getElementById('signOutBtn').style.display = "none";
        } else {
            // User is authenticated
            user = await auth0Client.getUser();
            console.log("User authenticated:", user);
            // Hide login buttons, show sign-out
            document.getElementById('btn-login-github').style.display = "none";
            document.getElementById('btn-login-google').style.display = "none";
            document.getElementById('btn-login-figma').style.display = "none";
            document.getElementById('signOutBtn').style.display = "block";
            // Proceed with app logic
        }

        // Add login button event listeners
        document.getElementById('btn-login-github').addEventListener('click', async () => {
            await auth0Client.loginWithRedirect({ connection: 'github' });
        });

        document.getElementById('btn-login-google').addEventListener('click', async () => {
            await auth0Client.loginWithRedirect({ connection: 'google' });
        });

        document.getElementById('btn-login-figma').addEventListener('click', async () => {
            await auth0Client.loginWithRedirect({ connection: 'figma' });
        });

        // Sign-out button
        document.getElementById('signOutBtn').addEventListener('click', signOut);

        // Rest of your code (findMyHolidayButton event listener, etc.)
        // ...
    } catch (error) {
        console.error("Initialization error:", error);
        showError('Failed to initialize. Please refresh.');
    }
};

// Existing window.onload function content
window.onload = async () => {
    try {
        await configureClient(); // Configure Auth0 Client

        // Check if the current URL contains the Auth0 redirect response
        const isRedirect = window.location.search.includes('code=') || window.location.search.includes('error=');
        if (isRedirect) {
            // Handle the Auth0 redirect response
            try {
                const { appState } = await auth0Client.handleRedirectCallback();
                // Retrieve state from local storage
                const storedState = localStorage.getItem('auth_state');
                if (storedState !== appState.state) {
                    throw new Error("Invalid state");
                }
                localStorage.removeItem('auth_state'); // Clean up state
                // Redirect the user to the intended page after successful authentication
                window.history.replaceState({}, document.title, 'https://hwoolen03.github.io/indexsignedin');
            } catch (error) {
                console.error("Invalid state during redirect callback:", error);
                showError('Invalid state during authentication. Please try again.');
                return;
            }
        } else {
            // Check if user is authenticated
            const isAuthenticated = await auth0Client.isAuthenticated();

            if (!isAuthenticated) {
                console.log("No user authenticated, redirecting to login page");
                window.location.href = 'https://hwoolen03.github.io'; // Redirect to the login page
            } else {
                // If authenticated, proceed with the user logic
                user = await auth0Client.getUser(); // Assign the user variable
                console.log("User authenticated:", user); // Log the authenticated user info

                // Ensure authentication buttons are displayed
                document.getElementById('btn-login-github').style.display = "block";
                document.getElementById('btn-login-google').style.display = "block";
                document.getElementById('btn-login-figma').style.display = "block";

                // You can proceed with the application logic now that the user is authenticated
            }
        }

        // Sign-out button logic
        document.getElementById('signOutBtn').addEventListener('click', signOut);

        // Main button logic for finding holidays
        document.getElementById('findMyHolidayButton').addEventListener('click', async () => {
            try {
                showLoading();
                const results = await personalizeContent(user); // Use the authenticated user details

                document.getElementById('results').innerHTML = results.map(result => `
                    <div class="destination-card">
                        <h3>${result.city}</h3>
                        <p>Estimated Total: $${result.cost.total}</p>
                        <div class="price-breakdown">
                            <span>✈️ $${result.cost.flight}</span>
                            <span>🏨 $${result.cost.hotel}</span>
                        </div>
                        <div class="api-results">
                            ${result.flights.data ? `<pre>${JSON.stringify(result.flights.data.slice(0, 2), null, 2)}</pre>` : ''}
                            ${result.hotels.data ? `<pre>${JSON.stringify(result.hotels.data.slice(0, 2), null, 2)}</pre>` : ''}
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
        console.error("Error during initialization:", error);
        showError('Initialization failed. Please refresh the page.');
    }
};
