let auth0Client = null;

// Auth0 Client Configuration
const configureClient = async () => {
    if (auth0Client) return;
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin,
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Error configuring Auth0 client:", error);
        alert("Authentication service is unavailable. Please try again later.");
    }
};

// Authentication Handlers
const signOut = async () => {
    if (!auth0Client) {
        console.error("Auth0 client is not initialized");
        alert("Authentication service is unavailable. Please try again later.");
        return;
    }

    try {
        await auth0Client.logout({ returnTo: window.location.origin });
        console.log("User signed out successfully");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out user:", error);
        alert("An error occurred during sign-out. Please try again.");
    }
};

const handleAuthCallback = async () => {
    if (!auth0Client) {
        console.error("Auth0 client is not initialized");
        alert("Authentication service is unavailable. Please try again later.");
        return;
    }

    try {
        if (await auth0Client.isAuthenticated()) {
            const user = await auth0Client.getUser();
            console.log("User is authenticated:", user);
            attachButtonListeners(user);
        } else {
            const query = window.location.search;
            if (query.includes("code=") && query.includes("state=")) {
                await auth0Client.handleRedirectCallback();
                console.log("Handled redirect callback");
                window.location.href = "indexsignedin.html";
            }
        }
    } catch (error) {
        console.error("Error handling authentication callback:", error);
        alert("An error occurred during authentication. Please try again.");
    }
};

// DOM Interaction
const attachButtonListeners = (user) => {
    const buttons = [
        { id: "signOutBtn", action: signOut },
        { id: "myAccountBtn", action: () => (window.location.href = "MyAccount.html") },
        {
            id: "findMyHolidayButton",
            action: async () => {
                if (validateInputs()) await triggerPersonalization(user);
            },
        },
    ];

    buttons.forEach(({ id, action }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener("click", action);
            console.log(`${id} event listener added`);
        } else {
            console.error(`${id} not found`);
        }
    });
};

// Validation Utilities
const validateInputs = () => {
    const checkInDate = new Date(document.getElementById("holidayDate").value).toISOString().split('T')[0];
    const checkOutDate = new Date(document.getElementById("returnDate").value).toISOString().split('T')[0];
    const budget = parseFloat(document.getElementById("budget").value);
    const numPeople = parseInt(document.getElementById("numPeople").value, 10);

    const currentDate = new Date().toISOString().split('T')[0];
    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
    const nextYearDateString = nextYearDate.toISOString().split('T')[0];

    let valid = true;

    const validations = [
        {
            condition: checkInDate < currentDate || checkInDate > nextYearDateString || 
                      checkOutDate < currentDate || checkOutDate > nextYearDateString,
            element: ["holidayDate", "returnDate"],
            message: "Dates must be within the next year.",
        },
        {
            condition: isNaN(budget) || budget <= 0 || budget > 5000,
            element: "budget",
            message: "Budget must be a number between 1 and 5000.",
        },
        {
            condition: isNaN(numPeople) || numPeople <= 0 || numPeople > 5,
            element: "numPeople",
            message: "Number of people must be between 1 and 5.",
        },
    ];

    validations.forEach(({ condition, element, message }) => {
        if (condition) {
            valid = false;
            [].concat(element).forEach((id) => flashRed(id, message));
        }
    });

    return valid;
};

const flashRed = (elementId, message) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.border = "2px solid red";
    element.setAttribute("title", message);

    setTimeout(() => {
        element.style.border = "";
        element.removeAttribute("title");
    }, 2000);
};

// API Integrations
const searchRoundtripFlights = async (from, to) => {
    try {
        const response = await fetch(
            `https://travel-api-proxy.onrender.com/api/flights?from=${from}&to=${to}`
        );
        return await response.json();
    } catch (error) {
        console.error("Flight search error:", error);
        return null;
    }
};

const fetchCheapestOneWayFlight = async (from, to, date) => {
    try {
        const response = await fetch(
            `https://travel-api-proxy.onrender.com/api/cheap-flights?from=${from}&to=${to}&date=${date}`
        );
        return await response.json();
    } catch (error) {
        console.error("Cheap flight search error:", error);
        return null;
    }
};

const generateRecommendations = async (user) => {
    try {
        const userMetadata = user['https://travel.app/metadata'] || {};
        const recommendationFactors = {
            budget: parseFloat(document.getElementById("budget").value),
            people: parseInt(document.getElementById("numPeople").value, 10),
            preferences: userMetadata.preferences || 'general',
            pastTrips: userMetadata.pastTrips || []
        };

        const response = await fetch('https://travel-api-proxy.onrender.com/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recommendationFactors)
        });

        const data = await response.json();
        return data.recommendations;
    } catch (error) {
        console.error("Recommendation error:", error);
        throw new Error("Failed to generate recommendations");
    }
};

// Core Logic
const triggerPersonalization = async (user) => {
    try {
        console.log("Starting personalization process...");
        const destination = await generateRecommendations(user);
        console.log("Selected destination:", destination);

        const checkInDate = document.getElementById("holidayDate").value;
        const checkOutDate = document.getElementById("returnDate").value;
        const departureLocation = document.getElementById("departureLocation").value;

        const [configData, airportData] = await Promise.all([
            fetchConfigData(),
            fetchAirportData()
        ]);

        const [roundtripFlights, cheapestOneWay] = await Promise.all([
            searchRoundtripFlights(departureLocation, destination),
            fetchCheapestOneWayFlight(departureLocation, destination, checkInDate)
        ]);

        const hotelData = await fetchHotelData(destination);

        const urlParams = new URLSearchParams({
            welcomeMessage: sanitizeInput(`Hello, ${user.name}!`),
            userEmail: sanitizeInput(`Your email: ${user.email}`),
            flightInfo: sanitizeInput(JSON.stringify(roundtripFlights)),
            hotelInfo: sanitizeInput(JSON.stringify(hotelData)),
        }).toString();

        window.location.href = `HolidayResults.html?${urlParams}`;
    } catch (error) {
        console.error("Personalization error:", error);
        alert("An error occurred while personalizing your content. Please try again.");
    }
};

// Helper Functions
const sanitizeInput = (input) => input.replace(/[^a-zA-Z0-9 ]/g, "");

const retryFetch = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response.json();
            console.error(`Attempt ${i + 1} failed: ${response.statusText}`);
        } catch (error) {
            console.error(`Attempt ${i + 1} error: ${error.message}`);
        }
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
};

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
    await configureClient();
    await handleAuthCallback();

    // Debugging safeguards
    const button = document.getElementById('findMyHolidayButton');
    if (button) {
        console.log('Find Holiday button initialized');
        button.addEventListener('click', () => console.log('Button click detected'));
    } else {
        console.error('Find Holiday button missing');
    }
});
