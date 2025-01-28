let auth0Client = null;

// Configure the Auth0 client
const configureClient = async () => {
    if (auth0Client) return; // Avoid re-initialization
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Error configuring Auth0 client:", error);
        alert("Authentication service is not available. Please try again later.");
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
            alert("Authentication service is not available. Please try again later.");
        }
    } catch (error) {
        console.error("Error signing out user:", error);
        alert("An error occurred during sign-out. Please try again.");
    }
};

// Handle authentication callback
const handleAuthCallback = async () => {
    try {
        if (!auth0Client) {
            console.error("Auth0 client is not initialized");
            alert("Authentication service is not available. Please try again later.");
            return;
        }

        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Is Authenticated:", isAuthenticated);

        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log("User:", user);

            // Attach event listeners to buttons
            attachButtonListeners(user);

            console.log("User is authenticated:", user);
        } else {
            const query = window.location.search;
            if (query.includes("code=") && query.includes("state=")) {
                await auth0Client.handleRedirectCallback();
                window.location.href = "indexsignedin.html";
                console.log("Handled redirect callback");
            }
        }
    } catch (error) {
        console.error("Error handling authentication callback:", error);
        alert("An error occurred during authentication. Please try again.");
    }
};

// Attach event listeners to buttons
const attachButtonListeners = (user) => {
    const signOutBtn = document.getElementById('signOutBtn');
    const myAccountBtn = document.getElementById('myAccountBtn');
    const findMyHolidayButton = document.getElementById('findMyHolidayButton');

    if (signOutBtn) {
        console.log("Sign-out button found");
        signOutBtn.addEventListener('click', signOut);
        console.log("Sign-out button event listener added");
    } else {
        console.error("Sign-out button not found");
    }

    if (myAccountBtn) {
        console.log("My Account button found");
        myAccountBtn.addEventListener('click', () => {
            window.location.href = 'MyAccount.html';
        });
        console.log("My Account button event listener added");
    } else {
        console.error("My Account button not found");
    }

    if (findMyHolidayButton) {
        console.log("Find My Holiday button found");
        findMyHolidayButton.addEventListener('click', async () => {
            console.log("Find My Holiday button clicked");
            if (validateInputs()) {
                await triggerPersonalization(user);
            }
        });
        console.log("Find My Holiday button event listener added");
    } else {
        console.error("Find My Holiday button not found");
    }
};

// Validate input fields
const validateInputs = () => {
    const checkInDate = document.getElementById('holidayDate').value;
    const checkOutDate = document.getElementById('returnDate').value;
    const budget = document.getElementById('budget').value;
    const numPeople = document.getElementById('numPeople').value;

    const currentDate = new Date();
    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    let valid = true;

    if (checkIn < currentDate || checkIn > nextYearDate || checkOut < currentDate || checkOut > nextYearDate) {
        flashRed('holidayDate', "Check-in and check-out dates must be within the next year.");
        flashRed('returnDate', "Check-in and check-out dates must be within the next year.");
        valid = false;
    }

    if (isNaN(budget) || budget <= 0 || budget > 5000) {
        flashRed('budget', "Budget must be a number between 1 and 5000.");
        valid = false;
    }

    if (isNaN(numPeople) || numPeople <= 0 || numPeople > 5) {
        flashRed('numPeople', "Number of people must be between 1 and 5.");
        valid = false;
    }

    return valid;
};

const flashRed = (elementId, message) => {
    const element = document.getElementById(elementId);
    element.style.border = '2px solid red';
    element.setAttribute('title', message);
    setTimeout(() => {
        element.style.border = '';
        element.removeAttribute('title');
    }, 2000);
};

// Fetch configuration data
const fetchConfigData = async () => {
    try {
        const response = await fetch("https://travel-api-proxy.onrender.com/get-config", {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching configuration data:", error);
        return null;
    }
};

// Fetch airport data
const fetchAirportData = async () => {
    try {
        const response = await fetch("https://travel-api-proxy.onrender.com/flights/airports", {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching airport data:", error);
        return null;
    }
};

// Fetch Sky IDs
const fetchSkyIds = async () => {
    try {
        console.log("Fetching Sky IDs...");
        const response = await fetch("https://travel-api-proxy.onrender.com/flights/skyId-list", {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log("Sky IDs fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching Sky IDs:", error);
        return null;
    }
};

// Utility to retry fetch requests with exponential backoff
const retryFetch = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response.json();
            } else {
                console.error(`Attempt ${i + 1} failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} error: ${error.message}`);
        }
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
};

// Search for roundtrip flights
const searchRoundtripFlights = async (fromEntityId, toEntityId) => {
    const url = `https://travel-api-proxy.onrender.com/api/v1/search-roundtrip`;
    const params = {
        fromEntityId: fromEntityId,
        toEntityId: toEntityId
    };
    try {
        console.log(`Fetching roundtrip flights from ${fromEntityId} to ${toEntityId}...`);
        const data = await retryFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            },
            body: JSON.stringify(params)
        });
        console.log("Roundtrip flight data fetched:", data);
        if (data.flights && data.flights.length > 0) {
            const flightId = data.flights[0].id;
            console.log("First flight ID:", flightId);
            return flightId;
        } else {
            console.error("No flights found");
            return null;
        }
    } catch (error) {
        console.error("Error searching for roundtrip flights:", error);
        return null;
    }
};

// Fetch cheapest one-way flight
const fetchCheapestOneWayFlight = async (fromEntityId, toEntityId, departDate, market, currency, locale) => {
    const url = `https://travel-api-proxy.onrender.com/api/v1/cheapest-one-way`;
    const params = {
        fromEntityId: fromEntityId,
        toEntityId: toEntityId,
        departDate: departDate,
        market: market,
        currency: currency,
        locale: locale
    };
    try {
        console.log(`Fetching cheapest one-way flight from ${fromEntityId} to ${toEntityId}...`);
        const data = await retryFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        console.log("Cheapest one-way flight data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching cheapest one-way flight:", error);
        return null;
    }
};

// Fetch flight details
const fetchFlightDetails = async (flightId) => {
    const url = `https://travel-api-proxy.onrender.com/flights/detail?flightId=${flightId}`;
    try {
        console.log(`Fetching flight details for ${flightId}...`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log("Flight details fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching flight details:", error);
        return null;
    }
};

// Fetch hotel data
const fetchHotelData = async (destination) => {
    try {
        console.log(`Fetching hotel data for destination ${destination}...`);
        const response = await fetch(`https://travel-api-proxy.onrender.com/v2/regions?query=${destination}&domain=AR&locale=es_AR`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY // Corrected
            }
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log("Hotel data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching hotel data:", error);
        return null;
    }
};

// Preprocess user data for the model
const preprocessUserData = (user) => {
    const preferences = user.preferences ? Object.values(user.preferences) : [0];
    const validPreferences = preferences.every(pref => typeof pref === 'number' && !isNaN(pref));
    if (!validPreferences) {
        throw new Error("User preferences contain invalid values");
    }
    return {
        name: user.name,
        email: user.email,
        preferences: preferences
    };
};

// Train a simple model (for demonstration purposes)
const trainModel = async (data) => {
    if (data.length === 0) {
        throw new Error("No data provided for training");
    }
    const inputShape = [data[0].preferences.length];
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 10, activation: 'relu', inputShape: inputShape }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ loss: 'binaryCrossentropy', optimizer: 'adam' });

    const xs = tf.tensor2d(data.map(d => d.preferences));
    const ys = tf.tensor2d(data.map(d => d.label || 1), [data.length, 1]);

    await model.fit(xs, ys, { epochs: 10 });
    return model;
};

// Generate recommendations
const generateRecommendations = async (user) => {
    try {
        const userData = preprocessUserData(user);
        if (!userData.preferences || userData.preferences.length === 0) {
            throw new Error("User preferences are empty or invalid");
        }

        const model = await trainModel([userData]);
        const input = tf.tensor2d([userData.preferences]);
        const output = model.predict(input);
        const recommendations = output.dataSync();

        if (!recommendations || recommendations.length === 0 || isNaN(recommendations[0])) {
            throw new Error("Invalid recommendations generated");
        }

        const destination = mapRecommendationToDestination(recommendations[0]);
        if (!destination) {
            throw new Error("Invalid destination mapping");
        }

        return destination;
    } catch (error) {
        console.error("Error generating recommendations:", error);
        throw error;
    }
};

// Map recommendation score to a valid destination identifier
const mapRecommendationToDestination = (score) => {
    const destinations = ["PARI", "CDG", "JFK", "LHR", "SFO"];
    return destinations[Math.floor(score * destinations.length)];
};

// Fetch all required data
const fetchAllData = async (destination, departureLocation) => {
    const [configData, airportData] = await Promise.all([fetchConfigData(), fetchAirportData()]);
    if (!configData || !airportData) {
        throw new Error("Error fetching configuration or airport data");
    }
    return { configData, airportData };
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log("Personalizing content for user:", user);
        const destination = await generateRecommendations(user);
        if (!destination) {
            throw new Error("No valid recommendations generated");
        }
        console.log("Mapped Destination:", destination);

        const checkInDate = document.getElementById('holidayDate').value;
        const checkOutDate = document.getElementById('returnDate').value;
        const departureLocation = document.getElementById('departureLocation').value;

        console.log("Inputs - Destination:", destination, "CheckInDate:", checkInDate, "CheckOutDate:", checkOutDate, "DepartureLocation:", departureLocation);

        const { configData, airportData } = await fetchAllData(destination, departureLocation);

        const [roundtripFlights, cheapestOneWay] = await Promise.all([
            searchRoundtripFlights(departureLocation, destination),
            fetchCheapestOneWayFlight(departureLocation, destination, checkInDate, 'US', 'USD', 'en-US')
        ]);

        if (!roundtripFlights) {
            throw new Error("Error searching for roundtrip flights");
        }
        if (!cheapestOneWay) {
            throw new Error("Error fetching cheapest one-way flight");
        }

        const flightId = roundtripFlights;
        const flightDetailsData = await fetchFlightDetails(flightId);

        const hotelData = await fetchHotelData(destination);
        if (!hotelData) {
            throw new Error("Error fetching hotel data");
        }

        const welcomeMessage = `Hello, ${user.name}!`;
        const userEmail = `Your email: ${user.email}`;
        const flightInfo = `Flights to ${destination}: ${JSON.stringify(roundtripFlights)}`;
        const hotelInfo = `Hotels in ${destination}: ${JSON.stringify(hotelData)}`;

        console.log("Redirecting to HolidayResults.html with data");

        window.location.href = `HolidayResults.html?welcomeMessage=${encodeURIComponent(sanitizeInput(welcomeMessage))}&userEmail=${encodeURIComponent(sanitizeInput(userEmail))}&flightInfo=${encodeURIComponent(sanitizeInput(flightInfo))}&hotelInfo=${encodeURIComponent(sanitizeInput(hotelInfo))}`;
    } catch (error) {
        console.error("Error personalizing content:", error);
        alert("An error occurred while personalizing your content. Please try again.");
    }
};

const triggerPersonalization = async (user) => {
    await personalizeContent(user);
};

// Sanitize input to prevent injection attacks
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9 ]/g, '');
};

// Initialize the app
window.onload = async () => {
    console.log("Window onload event fired");
    await configureClient();
    await handleAuthCallback();
};
