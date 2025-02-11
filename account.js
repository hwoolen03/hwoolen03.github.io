const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Auth0 Configuration
let auth0Client;
const configureClient = async () => {
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: "https://hwoolen03.github.io/indexsignedin" // Set redirect_uri to the specific page URL
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Auth0 configuration error:", error);
        showError('Authentication failed. Please refresh the page.');
        throw error;
    }
};

const handleAuthRedirect = async () => {
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        try {
            await auth0Client.handleRedirectCallback();
            // Clean up the URL to avoid triggering another redirect loop
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error("Redirect handling failed:", error);
            // Redirect to the home page if there’s an issue
            window.location.replace("https://hwoolen03.github.io");
        }
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

window.onload = async () => {
    try {
        await configureClient();  // Configure Auth0 Client
        await handleAuthRedirect();  // Handle authentication callback

        // Check if user is authenticated
        const isAuthenticated = await auth0Client.isAuthenticated();

        if (!isAuthenticated) {
            console.log("No user authenticated, redirecting to login page");
            // Redirect to the login page (update this with your desired login flow)
            window.location.href = 'login.html'; // Ensure this is your login page, or adjust accordingly
        } else {
            // If authenticated, proceed with the user logic
            const user = await auth0Client.getUser();
            console.log("User authenticated:", user); // Log the authenticated user info

            // Main button logic for finding holidays
            document.getElementById('findMyHolidayButton').addEventListener('click', async () => {
                try {
                    showLoading();
                    const results = await personalizeContent(user); // Use the authenticated user details

                    // Render the results to the UI
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

            // Handle sign-out button
            document.getElementById('signOutBtn').addEventListener('click', signOut);
        }
    } catch (error) {
        showError('Failed to initialize application. Please try again.');
    }
};

