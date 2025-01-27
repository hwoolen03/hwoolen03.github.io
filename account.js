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
                } else {
                    findMyHolidayButton.addEventListener('click', async () => {
                        console.log("Find My Holiday button clicked");
                        if (validateInputs()) {
                            await triggerPersonalization(user);
                        }
                    });
                }

                console.log("User is authenticated:", user);
            } else {
                const query = window.location.search;
                if (query.includes("code=") && query.includes("state=")) {
                    await auth0Client.handleRedirectCallback();
                    window.location.href = "indexsignedin.html";
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
        flashRed('holidayDate');
        flashRed('returnDate');
        valid = false;
    }

    if (isNaN(budget) || budget <= 0 || budget > 5000) {
        flashRed('budget');
        valid = false;
    }

    if (isNaN(numPeople) || numPeople <= 0 || numPeople > 5) {
        flashRed('numPeople');
        valid = false;
    }

    return valid;
};

const flashRed = (elementId) => {
    const element = document.getElementById(elementId);
    element.style.border = '2px solid red';
    setTimeout(() => {
        element.style.border = '';
    }, 2000);
};

// Fetch configuration data
const fetchConfigData = async () => {
    try {
        const response = await fetch("https://sky-scanner3.p.rapidapi.com/get-config", {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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
        const response = await fetch("https://sky-scanner3.p.rapidapi.com/flights/airports", {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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
        const response = await fetch("https://sky-scanner3.p.rapidapi.com/flights/skyId-list", {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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

// Utility to retry fetch requests
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
        await new Promise(res => setTimeout(res, delay));
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
};

// Search for roundtrip flights
const searchRoundtripFlights = async (fromEntityId, toEntityId) => {
    const url = `https://sky-scanner3.p.rapidapi.com/api/v1/search-roundtrip`;
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
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
            },
            body: JSON.stringify(params)
        });
        console.log("Roundtrip flight data fetched:", data);
        // Assuming the response has a structure like { flights: [{ id: 'flight1', ... }, ...] }
        if (data.flights && data.flights.length > 0) {
            const flightId = data.flights[0].id; // Extract the first flight's ID
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
const fetchCheapestOneWayFlight = async (fromEntityId, toEntityId) => {
    const url = `https://sky-scanner3.p.rapidapi.com/api/v1/cheapest-one-way`;
    const params = {
        fromEntityId: fromEntityId,
        toEntityId: toEntityId,
        departDate: '2024-06-15',
        market: 'US',
        currency: 'USD',
        locale: 'en-US'
    };
    try {
        console.log(`Fetching cheapest one-way flight from ${fromEntityId} to ${toEntityId}...`);
        const data = await retryFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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
    const url = `https://sky-scanner3.p.rapidapi.com/flights/detail?flightId=${flightId}`;
    try {
        console.log(`Fetching flight details for ${flightId}...`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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
        // Replace with actual API endpoint and parameters
        const response = await fetch(`https://hotels-com-provider.p.rapidapi.com/v2/regions?query=${destination}&domain=AR&locale=es_AR`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'hotels-com-provider.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
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

        const [configData, airportData] = await Promise.all([fetchConfigData(), fetchAirportData()]);
        if (!configData) {
            throw new Error("Error fetching configuration data");
        }
        if (!airportData) {
            throw new Error("Error fetching airport data");
        }

        const [roundtripFlights, cheapestOneWay, flightDetails] = await Promise.all([
            searchRoundtripFlights(departureLocation, destination),
            fetchCheapestOneWayFlight(departureLocation, destination)
        ]);

        if (!roundtripFlights) {
            throw new Error("Error searching for roundtrip flights");
        }
        if (!cheapestOneWay) {
            throw new Error("Error fetching cheapest one-way flight");
        }

        const flightId = roundtripFlights; // Assuming the flight ID is returned
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

        window.location.href = `HolidayResults.html?welcomeMessage=${encodeURIComponent(welcomeMessage)}&userEmail=${encodeURIComponent(userEmail)}&flightInfo=${encodeURIComponent(flightInfo)}&hotelInfo=${encodeURIComponent(hotelInfo)}`;
    } catch (error) {
        console.error("Error personalizing content:", error);
    }
};

const triggerPersonalization = async (user) => {
    await personalizeContent(user);
};

// Add event listener for the sign-out button
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
