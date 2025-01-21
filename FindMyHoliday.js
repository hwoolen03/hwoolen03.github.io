let auth0Client = null;

// Configure the Auth0 client
const configureClient = async () => {
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Error configuring Auth0 client:", error);
    }
};

// Sign out the user
const signOut = async () => {
    try {
        if (auth0Client) {
            await auth0Client.logout({
                returnTo: window.location.origin
            });
            console.log("User signed out successfully");
            window.location.href = "index.html";
        } else {
            console.error("Auth0 client is not initialized");
        }
    } catch (error) {
        console.error("Error signing out user:", error);
    }
};

// Handle authentication callback
const handleAuthCallback = async () => {
    try {
        if (auth0Client) {
            const isAuthenticated = await auth0Client.isAuthenticated();
            console.log("Is Authenticated:", isAuthenticated);
            if (isAuthenticated) {
                const user = await auth0Client.getUser();
                console.log("User:", user);
                await personalizeContent(user); // Use user data for personalization

                const userName = user.name;

                // Create and display the welcome message
                const welcomeMessage = `Welcome to the Power of Atlas ${userName}`;
                const h2Element = document.querySelector('.holiday-text');
                if (h2Element) {
                    h2Element.textContent = welcomeMessage;
                }

                const findMyHolidayButton = document.getElementById('findMyHolidayButton');
                console.log("Find My Holiday Button:", findMyHolidayButton);
                if (!findMyHolidayButton) {
                    console.error("Find My Holiday Button not found");
                }

                console.log("User is authenticated:", user);
            } else {
                const query = window.location.search;
                if (query.includes("code=") && query.includes("state=")) {
                    await auth0Client.handleRedirectCallback();
                    window.location.href = "FindMyHoliday.html";
                    console.log("Handled redirect callback");
                }
            }
        } else {
            console.error("Auth0 client is not initialized");
        }
    } catch (error) {
        console.error("Error handling authentication callback:", error);
    }
};

// Fetch flight data
const fetchFlightData = async (destination, dates, departureLocation, budget, numPeople) => {
    try {
        const response = await fetch(`https://aviation-edge.com/v2/public/flights?key=your_api_key&destination=${destination}&dates=${dates}&departureLocation=${departureLocation}&budget=${budget}&numPeople=${numPeople}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching flight data:", error);
    }
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    console.log("Personalizing content for user:", user);
    const userName = user.name;
    const userEmail = user.email;
    const destination = document.getElementById('destination').value;
    const dates = document.getElementById('holidayDate').value + '_' + document.getElementById('returnDate').value;
    const departureLocation = document.getElementById('departureLocation').value;
    const budget = document.getElementById('budget').value;
    const numPeople = document.getElementById('numPeople').value;

    // Fetch flight data
    const flightData = await fetchFlightData(destination, dates, departureLocation, budget, numPeople);

    // Personalize the content based on fetched data
    if (userName) {
        document.getElementById('welcome-message').innerText = `Hello, ${userName}!`;
    }
    if (userEmail) {
        document.getElementById('user-email').innerText = `Your email: ${userEmail}`;
    }

    // Display flight data
    document.getElementById('flight-info').innerText = `Flights to ${destination}: ${JSON.stringify(flightData)}`;
};

window.onload = async () => {
    await configureClient();
    handleAuthCallback();

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
        console.log("Sign-out button event listener added");
    } else {
        console.error("Sign-out button not found");
    }
};
