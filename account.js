
import * as tf from '@tensorflow/tfjs';

let auth0Client = null;
const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Auth0 Configuration
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

const signOut = async () => {
    try {
        if (auth0Client) {
            await auth0Client.logout({
                returnTo: window.location.origin
            });
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Sign out error:", error);
    }
};

// Personalization Algorithm
const preprocessUserData = (user) => {
    const preferences = user.preferences ? Object.values(user.preferences) : [0.5, 0.5, 0.5];
    return {
        name: user.name,
        email: user.email,
        preferences: preferences
    };
};

const trainModel = async (userData) => {
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ units: 8, activation: 'relu', inputShape: [userData.preferences.length + 2] }),
            tf.layers.dense({ units: 4, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
    });
    
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    
    const xs = tf.tensor2d([[
        ...userData.preferences,
        parseFloat(userData.budget) / 5000,
        new Date(userData.checkInDate).getMonth() / 11
    ]]);
    
    const ys = tf.tensor2d([[1]]); // Dummy training data
    await model.fit(xs, ys, { epochs: 10 });
    return model;
};

const generateRecommendations = async (user, inputs) => {
    const processedData = {
        ...preprocessUserData(user),
        ...inputs
    };

    const model = await trainModel(processedData);
    const input = tf.tensor2d([[
        ...processedData.preferences,
        parseFloat(inputs.budget) / 5000,
        new Date(inputs.checkInDate).getMonth() / 11
    ]]);
    
    const prediction = model.predict(input);
    return mapRecommendationToDestination(prediction.dataSync()[0]);
};

const mapRecommendationToDestination = (score) => {
    const destinations = [
        { code: 'PAR', threshold: 0.8, name: 'Paris' },
        { code: 'JFK', threshold: 0.6, name: 'New York' },
        { code: 'LHR', threshold: 0.4, name: 'London' },
        { code: 'SYD', threshold: 0.2, name: 'Sydney' }
    ];
    
    return destinations.reduce((closest, dest) => {
        return score >= dest.threshold ? dest : closest;
    }, destinations[destinations.length - 1]).code;
};

// API Functions
const searchRoundtripFlights = async (fromIATA, toIATA, date) => {
    const url = `https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights?fromId=${fromIATA}&toId=${toIATA}&date=${date}`;
    const response = await fetch(url, { method: 'GET', headers: API_HEADERS });
    return response.json();
};

const fetchHotelData = async (destinationIATA, budget) => {
    const destResponse = await fetch(
        `https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=${destinationIATA}`,
        { method: 'GET', headers: API_HEADERS }
    );
    
    const destData = await destResponse.json();
    const destId = destData.data[0]?.dest_id;
    
    const hotelResponse = await fetch(
        `https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels?dest_id=${destId}&price_max=${budget}`,
        { method: 'GET', headers: API_HEADERS }
    );
    
    return hotelResponse.json();
};

// Main Workflow
const personalizeContent = async (user) => {
    const inputs = {
        checkInDate: document.getElementById('holidayDate').value,
        checkOutDate: document.getElementById('returnDate').value,
        departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
        budget: document.getElementById('budget').value
    };

    const destinationIATA = await generateRecommendations(user, inputs);
    
    const [flights, hotels] = await Promise.all([
        searchRoundtripFlights(inputs.departureLocation, destinationIATA, inputs.checkInDate),
        fetchHotelData(destinationIATA, inputs.budget)
    ]);

    return {
        destination: destinationIATA,
        flights,
        hotels,
        dates: { checkIn: inputs.checkInDate, checkOut: inputs.checkOutDate },
        budget: inputs.budget
    };
};

// UI Handlers
const validateInputs = () => {
    const inputs = {
        checkInDate: document.getElementById('holidayDate').value,
        checkOutDate: document.getElementById('returnDate').value,
        departureLocation: document.getElementById('departureLocation').value,
        budget: document.getElementById('budget').value
    };

    if (!inputs.checkInDate || !inputs.checkOutDate) {
        alert('Please select both dates');
        return false;
    }

    if (!inputs.departureLocation.match(/^[A-Z]{3}$/i)) {
        alert('Please enter a valid 3-letter airport code');
        return false;
    }

    return true;
};

window.onload = async () => {
    await configureClient();
    const user = await auth0Client.getUser();

    // Sign Out Button
    document.getElementById('signOutBtn').addEventListener('click', signOut);

    // Find Holiday Button
    document.getElementById('findMyHolidayButton').addEventListener('click', async () => {
        if (validateInputs()) {
            try {
                const results = await personalizeContent(user);
                console.log('Holiday Package:', results);
                document.getElementById('results').innerHTML = `
                    <h3>Your ${results.destination} Package</h3>
                    <p>Dates: ${results.dates.checkIn} to ${results.dates.checkOut}</p>
                    <p>Budget: $${results.budget}</p>
                    <div class="results-container">
                        <div>Flights: ${JSON.stringify(results.flights.data?.slice(0, 2))}</div>
                        <div>Hotels: ${JSON.stringify(results.hotels.data?.slice(0, 2))}</div>
                    </div>
                `;
            } catch (error) {
                alert('Error creating package: ' + error.message);
            }
        }
    });
};
