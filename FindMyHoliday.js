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

// Fetch flight data
const fetchFlightData = async (destination, dates, departureLocation, budget, numPeople) => {
    try {
        console.log("Fetching flight data...");
        const response = await fetch(`https://sky-scanner3.p.rapidapi.com/flights/price-calendar-web?fromEntityId=${departureLocation}&toEntityId=${destination}&yearMonth=${dates}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'sky-scanner3.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
            }
        });
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
        const response = await fetch(`https://hotels-com-free.p.rapidapi.com/suggest/v1.7/json?query=${destination}&locale=en_US`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'hotels-com-free.p.rapidapi.com',
                'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3'
            }
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
        preferences: user.preferences ? Object.values(user.preferences) : [0], // Ensure preferences have a default value
    };
};

// Train a simple model (for demonstration purposes)
const trainModel = async (data) => {
    console.log("Training model...");
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: [data[0].preferences.length]})); // Ensure input shape matches preferences length
    model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
    model.compile({loss: 'binaryCrossentropy', optimizer: 'adam'});

    const xs = tf.tensor2d(data.map(d => d.preferences)); // Ensure preferences are converted to array
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

        if (userData.preferences.length === 0) {
            throw new Error("User preferences are empty");
        }

        const model = await trainModel([userData]);
        console.log("Model:", model);

        const input = tf.tensor2d([userData.preferences]); // Ensure preferences are converted to array
        const output = model.predict(input);
        const recommendations = output.dataSync();
        console.log("Recommendations generated:", recommendations);

        return recommendations;
    } catch (error) {
        console.error("Error generating recommendations:", error);
    }
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log("Personalizing content for user:", user);
        const recommendations = await generateRecommendations(user);
        if (!recommendations || recommendations.length === 0) {
            throw new Error("No recommendations generated");
        }
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
