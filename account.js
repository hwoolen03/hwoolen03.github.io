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

// Fetch data utility function
const fetchData = async (url, options) => {
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// Fetch hotel data
const fetchHotelData = async (destination) => {
    try {
        console.log(`Fetching hotel data for destination ${destination}...`);
        return await fetchData(`https://travel-api-proxy.onrender.com/api/hotels/search?query=${destination}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching hotel data:', error);
        return null;
    }
};

// Fetch hotel payment features
const fetchHotelPaymentFeatures = async (hotelId) => {
    try {
        console.log(`Fetching payment features for hotel ID ${hotelId}...`);
        return await fetchData(`https://travel-api-proxy.onrender.com/api/hotels/payment-features?hotel_id=${hotelId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching hotel payment features:', error);
        return null;
    }
};

// Search for roundtrip flights
const searchRoundtripFlights = async (fromEntityId, toEntityId) => {
    const url = `https://travel-api-proxy.onrender.com/api/flights/search?fromId=${fromEntityId}&toId=${toEntityId}&pageNo=1&adults=1&children=0%2C17&sort=BEST&cabinClass=ECONOMY&currency_code=AED`;
    try {
        console.log(`Fetching roundtrip flights from ${fromEntityId} to ${toEntityId}...`);
        const data = await fetchData(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Roundtrip flight data fetched:', data);
        if (data.status === false) {
            console.error('Error fetching roundtrip flights:', data.message);
            return null;
        }
        if (data.flights && data.flights.length > 0) {
            const flightId = data.flights[0].id;
            console.log('First flight ID:', flightId);
            return flightId;
        } else {
            console.error('No flights found');
            return null;
        }
    } catch (error) {
        console.error('Error searching for roundtrip flights:', error);
        return null;
    }
};

// Fetch cheapest one-way flight
const fetchCheapestOneWayFlight = async (fromEntityId, toEntityId) => {
    const url = `https://travel-api-proxy.onrender.com/api/flights/min-price?fromId=${fromEntityId}&toId=${toEntityId}&cabinClass=ECONOMY&currency_code=AED`;
    try {
        console.log(`Fetching cheapest one-way flight from ${fromEntityId} to ${toEntityId}...`);
        return await fetchData(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching cheapest one-way flight:', error);
        return null;
    }
};

// Fetch flight details
const fetchFlightDetails = async (flightId) => {
    const url = `https://travel-api-proxy.onrender.com/api/flights/details?flightId=${flightId}`;
    try {
        console.log(`Fetching flight details for ${flightId}...`);
        return await fetchData(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching flight details:', error);
        return null;
    }
};

// Preprocess user data for the model
const preprocessUserData = (user) => {
    const preferences = user.preferences ? Object.values(user.preferences) : [0];
    const validPreferences = preferences.every(pref => typeof pref === 'number' && !isNaN(pref));
    if (!validPreferences) {
        throw new Error('User preferences contain invalid values');
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
            throw new Error('User preferences are empty or invalid');
        }

        const model = await trainModel([userData]);
        const input = tf.tensor2d([userData.preferences]);
        const output = model.predict(input);
        const recommendations = output.dataSync();

        if (!recommendations || recommendations.length === 0 || isNaN(recommendations[0])) {
            throw new Error('Invalid recommendations generated');
        }

        const destination = mapRecommendationToDestination(recommendations[0]);
        if (!destination) {
            throw new Error('Invalid destination mapping');
        }

        return destination;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        throw error;
    }
};

// Map recommendation score to a valid destination identifier
const mapRecommendationToDestination = (score) => {
    const destinations = ['PARI', 'CDG', 'JFK', 'LHR', 'SFO'];
    return destinations[Math.floor(score * destinations.length)];
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log('Personalizing content for user:', user);
        const destination = await generateRecommendations(user);
        if (!destination) {
            throw new Error('No valid recommendations generated');
        }
        console.log('Mapped Destination:', destination);

        const checkInDate = document.getElementById('holidayDate').value;
        const checkOutDate = document.getElementById('returnDate').value;
        const departureLocation = document.getElementById('departureLocation').value;

        console.log('Inputs - Destination:', destination, 'CheckInDate:', checkInDate, 'CheckOutDate:', checkOutDate, 'DepartureLocation:', departureLocation);

        const [roundtripFlights, cheapestOneWay] = await Promise.all([
            searchRoundtripFlights(departureLocation, destination),
            fetchCheapestOneWayFlight(departureLocation, destination)
        ]);

        if (!roundtripFlights) {
            throw new Error('Error searching for roundtrip flights');
        }
        if (!cheapestOneWay) {
            throw new Error('Error fetching cheapest one-way flight');
        }

        const flightId = roundtripFlights; // Assuming the flight ID is returned
        const flightDetailsData = await fetchFlightDetails(flightId);

        const hotelData = await fetchHotelData(destination);
        if (!hotelData) {
            throw new Error('Error fetching hotel data');
        }

        const welcomeMessage = `Hello, ${user.name}!`;
        const userEmail = `Your email: ${user.email}`;
        const flightInfo = `Flights to ${destination}: ${JSON.stringify(roundtripFlights)}`;
        const hotelInfo = `Hotels in ${destination}: ${JSON.stringify(hotelData)}`;

        console.log('Redirecting to HolidayResults.html with data');

        window.location.href = `HolidayResults.html?welcomeMessage=${encodeURIComponent(welcomeMessage)}&userEmail=${encodeURIComponent(userEmail)}&flightInfo=${encodeURIComponent(flightInfo)}&hotelInfo=${encodeURIComponent(hotelInfo)}`;
    } catch (error) {
        console.error('Error personalizing content:', error);
    }
};

// Validate inputs function
const validateInputs = () => {
    const checkInDate = document.getElementById('holidayDate').value;
    const checkOutDate = document.getElementById('returnDate').value;
    const departureLocation = document.getElementById('departureLocation').value;

    if (!checkInDate || !checkOutDate || !departureLocation) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Additional validation logic can be added here

    return true;
};

const triggerPersonalization = async (user) => {
    await personalizeContent(user);
};

window.onload = async () => {
    console.log('Window loaded, configuring Auth0 client...');
    await configureClient();
    const user = await auth0Client.getUser();
    console.log('User retrieved:', user);

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            console.log('Sign-out button clicked');
            signOut();
        });
        console.log('Sign-out button event listener added');
    } else {
        console.error('Sign-out button not found');
    }

    const findMyHolidayButton = document.getElementById('findMyHolidayButton');
    if (findMyHolidayButton) {
        findMyHolidayButton.addEventListener('click', async () => {
            console.log('Find My Holiday button clicked');
            if (validateInputs()) {
                await triggerPersonalization(user);
            }
        });
    } else {
        console.error('Find My Holiday Button not found');
    }
};
