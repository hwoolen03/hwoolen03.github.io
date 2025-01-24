// import * as tf from '@tensorflow/tfjs'; // Removed this line

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
            console.log("Attempting to sign out user...");
            console.log("auth0Client:", auth0Client);
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

// Flash red for invalid input fields
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
        console.log("Fetching configuration data...");
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
        console.log("Configuration data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching configuration data:", error);
        return null;
    }
};

// Fetch airport data
const fetchAirportData = async () => {
    try {
        console.log("Fetching airport data...");
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
        console.log("Airport data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching airport data:", error);
        return null;
    }
};

// Search for roundtrip flights
const searchRoundtripFlights = async (fromEntityId, toEntityId) => {
    try {
        console.log("Searching for roundtrip flights...");
        const response = await fetch(`https://sky-scanner3.p.rapidapi.com/flights/search-roundtrip?fromEntityId=${fromEntityId}&toEntityId=${toEntityId}`, {
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
        console.log("Roundtrip flight data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error searching for roundtrip flights:", error);
        return null;
    }
};

// Fetch cheapest one-way flight
const fetchCheapestOneWayFlight = async (fromEntityId, toEntityId) => {
    try {
        console.log("Fetching cheapest one-way flight...");
        const response = await fetch(`https://sky-scanner3.p.rapidapi.com/flights/cheapest-one-way?fromEntityId=${fromEntityId}&toEntityId=${toEntityId}`, {
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
        console.log("Cheapest one-way flight data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching cheapest one-way flight:", error);
        return null;
    }
};

// Fetch flight details
const fetchFlightDetails = async (flightId) => {
    try {
        console.log("Fetching flight details...");
        const response = await fetch(`https://sky-scanner3.p.rapidapi.com/flights/detail?flightId=${flightId}`, {
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

// Preprocess user data for the model
const preprocessUserData = (user) => {
    console.log("Preprocessing user data:", user);
    const preferences = user.preferences ? Object.values(user.preferences) : [0];
    // Check if preferences contain valid numbers
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
    console.log("Training model...");
    const inputShape = [data[0].preferences.length];
    console.log("Input Shape:", inputShape);

    const model = tf.sequential();
    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: inputShape}));
    model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
    model.compile({loss: 'binaryCrossentropy', optimizer: 'adam'});

    const xs = tf.tensor2d(data.map(d => d.preferences));
    const ys = tf.tensor2d(data.map(d => d.label || 1), [data.length, 1]); // Assuming a default label value of 1

    await model.fit(xs, ys, {epochs: 10});
    console.log("Model trained");
    return model;
};

// Generate recommendations
const generateRecommendations = async (user) => {
    try {
        console.log("Generating recommendations for user:", user);
        const userData = preprocessUserData(user);
        console.log("Preprocessed User Data:", userData);

        if (!userData.preferences || userData.preferences.length === 0) {
            throw new Error("User preferences are empty or invalid");
        }

        const model = await trainModel([userData]);
        console.log("Model:", model);

        const input = tf.tensor2d([userData.preferences]);
        console.log("Input for prediction:", input); // Log input values
        const output = model.predict(input);
        console.log("Model output:", output); // Log model output
        const recommendations = output.dataSync();
        console.log("Recommendations generated:", recommendations);

        // Validate the recommendations
        if (!recommendations || recommendations.length === 0 || isNaN(recommendations[0])) {
            console.error("Invalid recommendations generated:", recommendations);
            throw new Error("Invalid recommendations generated");
        }

        // Here you need to ensure the recommendation is a valid destination identifier
        const destination = mapRecommendationToDestination(recommendations[0]); // Example conversion, adjust as necessary

        return destination;
    } catch (error) {
        console.error("Error generating recommendations:", error);
        return NaN; // Return NaN to indicate error
    }
};

// Map recommendation score to a valid destination identifier
const mapRecommendationToDestination = (score) => {
    // This is an example mapping function, adjust as necessary
    const destinations = ["San Francisco", "New York", "Los Angeles", "Chicago", "Miami"]; // Example destination names
    return destinations[Math.floor(score * destinations.length)];
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log("Personalizing content for user:", user);
        const destination = await generateRecommendations(user);
        if (isNaN(destination)) {
            throw new Error("No valid recommendations generated");
        }
        console.log("Destination:", destination);

        const checkInDate = document.getElementById('holidayDate').value;
        const checkOutDate = document.getElementById('returnDate').value;
        const departureLocation = document.getElementById('departureLocation').value;
        const budget = document.getElementById('budget').value;
        const numPeople = document.getElementById('numPeople').value;

        console.log("Inputs - Destination:", destination, "CheckInDate:", checkInDate, "CheckOutDate:", checkOutDate, "DepartureLocation:", departureLocation, "Budget:", budget, "NumPeople:", numPeople);

        // Fetch both flight and hotel data concurrently
        const [configData, airportData, roundtripFlights, cheapestOneWay, flightDetails, hotelData] = await Promise.all([
            fetchConfigData(),
            fetchAirportData(),
            searchRoundtripFlights(departureLocation, destination),
            fetchCheapestOneWayFlight(departureLocation, destination),
            fetchFlightDetails("someFlightId"), // Replace with actual flight ID
            fetchHotelData(destination)
        ]);

        if (!configData) {
            throw new Error("Error fetching configuration data");
        }
        console.log("Configuration Data:", configData);

        if (!airportData) {
            throw new Error("Error fetching airport data");
        }
        console.log("Airport Data:", airportData);

        if (!roundtripFlights) {
            throw new Error("Error searching for roundtrip flights");
        }
        console.log("Roundtrip Flights:", roundtripFlights);

        if (!cheapestOneWay) {
            throw new Error("Error fetching cheapest one-way flight");
        }
        console.log("Cheapest One-Way Flight:", cheapestOneWay);

        if (!flightDetails) {
            throw new Error("Error fetching flight details");
        }
        console.log("Flight Details:", flightDetails);

        if (!hotelData) {
            throw new Error("Error fetching hotel data");
        }
        console.log("Hotel Data:", hotelData);

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

window.onload = async () => {
    console.log("Window loaded, configuring Auth0 client...");
    await configureClient();
    const user = await auth0Client.getUser();
    console.log("User retrieved:", user);

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            console.log("Sign-out button clicked");
            signOut();
        });
        console.log("Sign-out button event listener added");
    } else {
        console.error("Sign-out button not found");
    }

    const findMyHolidayButton = document.getElementById('findMyHolidayButton');
    if (findMyHolidayButton) {
        findMyHolidayButton.addEventListener('click', async () => {
            console.log("Find My Holiday button clicked");
            if (validateInputs()) {
                await triggerPersonalization(user);
            }
        });
    } else {
        console.error("Find My Holiday Button not found");
    }
};
