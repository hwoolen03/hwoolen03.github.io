import * as tf from '@tensorflow/tfjs';  // Ensure correct import

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
                } else {
                    findMyHolidayButton.addEventListener('click', () => {
                        console.log("Find My Holiday button clicked");
                        triggerPersonalization(user);
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

// Fetch flight data
const fetchFlightData = async (destination, dates, departureLocation, budget, numPeople) => {
    try {
        console.log("Fetching flight data...");
        const response = await fetch(`https://aviation-edge.com/v2/public/flights?key=87034c-82c494&destination=${destination}&dates=${dates}&departureLocation=${departureLocation}&budget=${budget}&numPeople=${numPeople}`);
        const data = await response.json();
        console.log("Flight data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching flight data:", error);
    }
};

// Fetch hotel data
const fetchHotelData = async (destination, checkInDate, checkOutDate, budget, numPeople) => {
    try {
        console.log("Fetching hotel data...");
        const response = await fetch(`https://api.makcorps.com/free`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2ODcyNjc5NzIsImlhdCI6MTY4NzI2NjE3MiwibmJmIjoxNjg3MjY2MTcyLCJpZGVudGl0eSI6MjExMH0.HqBtNdrOg21LzKY7RmylIQpda7H9vG3dO5y4Qu9Q1s0'
            },
            body: JSON.stringify({
                destination: destination,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                budget: budget,
                guests: numPeople
            })
        });
        const data = await response.json();
        console.log("Hotel data fetched:", data);
        return data;
    } catch (error) {
        console.error("Error fetching hotel data:", error);
    }
};

// Preprocess user data for the model
const preprocessUserData = (user) => {
    // Example preprocessing
    console.log("Preprocessing user data:", user);
    return {
        name: user.name,
        email: user.email,
        preferences: user.preferences || {},
    };
};

// Train a simple model (for demonstration purposes)
const trainModel = async (data) => {
    console.log("Training model...");
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: [data.length]}));
    model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
    model.compile({loss: 'binaryCrossentropy', optimizer: 'adam'});

    const xs = tf.tensor2d(data.map(d => [d.preferences]));
    const ys = tf.tensor2d(data.map(d => d.label), [data.length, 1]);

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

        const model = await trainModel([userData]);
        console.log("Model:", model);

        const input = tf.tensor2d([userData.preferences]);
        const output = model.predict(input);
        console.log("Recommendations generated:", output.dataSync());

        return output.dataSync();
    } catch (error) {
        console.error("Error generating recommendations:", error);
    }
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log("Personalizing content for user:", user);
        const recommendations = await generateRecommendations(user);
        console.log("Recommendations:", recommendations);

        const destination = recommendations[0];
        const checkInDate = document.getElementById('holidayDate').value;
        const checkOutDate = document.getElementById('returnDate').value;
        const departureLocation = document.getElementById('departureLocation').value;
        const budget = document.getElementById('budget').value;
        const numPeople = document.getElementById('numPeople').value;

        console.log("Inputs - Destination:", destination, "CheckInDate:", checkInDate, "CheckOutDate:", checkOutDate, "DepartureLocation:", departureLocation, "Budget:", budget, "NumPeople:", numPeople);

        const flightData = await fetchFlightData(destination, checkInDate + '_' + checkOutDate, departureLocation, budget, numPeople);
        console.log("Flight Data:", flightData);

        const hotelData = await fetchHotelData(destination, checkInDate, checkOutDate, budget, numPeople);
        console.log("Hotel Data:", hotelData);

        const welcomeMessage = `Hello, ${user.name}!`;
        const userEmail = `Your email: ${user.email}`;
        const flightInfo = `Flights to ${destination}: ${JSON.stringify(flightData)}`;
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
    await personalizeContent(user);

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
};
