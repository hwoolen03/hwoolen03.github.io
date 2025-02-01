const API_HEADERS = {
    'x-rapidapi-key': '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3', // REPLACE WITH YOUR API KEY
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Auth0 Configuration
let auth0Client;
const configureClient = async () => {
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Auth0 configuration error:", error);
        throw new Error('Failed to initialize authentication');
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
        alert('Error signing out: ' + error.message);
    }
};

// IATA to City Mapping
const getCityName = (iataCode) => {
    const mapping = { 
        SYD: 'Sydney',
        PAR: 'Paris',
        JFK: 'New York',
        LHR: 'London',
        CDG: 'Paris',
        HND: 'Tokyo'
    };
    return mapping[iataCode] || iataCode;
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
    try {
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

        const ys = tf.tensor2d([[1]]);
        await model.fit(xs, ys, { epochs: 10 });
        return model;
    } catch (error) {
        console.error("Model training error:", error);
        throw new Error('Failed to generate recommendations');
    }
};

const generateRecommendations = async (user, inputs) => {
    try {
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
    } catch (error) {
        console.error("Recommendation error:", error);
        throw new Error('Failed to generate travel recommendations');
    }
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
    try {
        const url = `https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights?fromId=${fromIATA}&toId=${toIATA}&date=${date}`;
        const response = await fetch(url, { 
            method: 'GET', 
            headers: API_HEADERS,
            signal: AbortSignal.timeout(8000)
        });
        
        const data = await response.json();
        console.log('Flights API Response:', data);
        
        if (!response.ok || data.status === false) {
            const errorMsg = data.message?.join(', ') || 'Unknown flight search error';
            throw new Error(`Flights: ${errorMsg}`);
        }
        return data;
    } catch (error) {
        console.error('Flight API Error:', error);
        return { status: false, message: error.message };
    }
};

const fetchHotelData = async (destinationIATA, budget, checkInDate, checkOutDate) => {
    try {
        const cityName = getCityName(destinationIATA);
        const destResponse = await fetch(
            `https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=${encodeURIComponent(cityName)}`,
            { method: 'GET', headers: API_HEADERS }
        );

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData);
        
        if (!destData.data?.[0]?.dest_id) {
            throw new Error(`No destinations found for ${cityName}`);
        }

        const hotelUrl = new URL('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels');
        hotelUrl.searchParams.append('dest_id', destData.data[0].dest_id);
        hotelUrl.searchParams.append('search_type', 'CITY');
        hotelUrl.searchParams.append('date_from', checkInDate);
        hotelUrl.searchParams.append('date_to', checkOutDate);
        hotelUrl.searchParams.append('price_max', budget);
        hotelUrl.searchParams.append('adults', '1');

        const hotelResponse = await fetch(hotelUrl, { 
            method: 'GET', 
            headers: API_HEADERS 
        });

        const hotelData = await hotelResponse.json();
        console.log('Hotels API Response:', hotelData);
        
        if (!hotelResponse.ok || hotelData.status === false) {
            const errorMessages = hotelData.message
                ?.map(msg => msg?.message || JSON.stringify(msg))
                ?.join(', ') || 'Unknown hotel error';
            throw new Error(`Hotels: ${errorMessages}`);
        }
        
        return hotelData;
    } catch (error) {
        console.error('Hotel API Error:', error.message);
        return { status: false, message: error.message };
    }
};

// Main Workflow
const personalizeContent = async (user) => {
    try {
        const inputs = {
            checkInDate: document.getElementById('holidayDate').value,
            checkOutDate: document.getElementById('returnDate').value,
            departureLocation: document.getElementById('departureLocation').value.toUpperCase(),
            budget: document.getElementById('budget').value
        };

        console.log('Processing inputs:', inputs);
        
        if (!/^\d+$/.test(inputs.budget)) {
            throw new Error('Budget must be a number without currency symbols');
        }

        const destinationIATA = await generateRecommendations(user, inputs);
        console.log('Recommended destination:', destinationIATA);

        const [flights, hotels] = await Promise.all([
            searchRoundtripFlights(inputs.departureLocation, destinationIATA, inputs.checkInDate),
            fetchHotelData(destinationIATA, inputs.budget, inputs.checkInDate, inputs.checkOutDate)
        ]);

        return {
            destination: destinationIATA,
            flights,
            hotels,
            dates: { checkIn: inputs.checkInDate, checkOut: inputs.checkOutDate },
            budget: inputs.budget
        };
    } catch (error) {
        console.error('Personalization error:', error);
        throw error;
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

window.onload = async () => {
    try {
        await configureClient();
        const user = await auth0Client.getUser();
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Event Listeners
        document.getElementById('signOutBtn').addEventListener('click', signOut);

        document.getElementById('findMyHolidayButton').addEventListener('click', async () => {
            try {
                showLoading();
                const results = await personalizeContent(user);
                console.log('Final results:', results);
                
                document.getElementById('results').innerHTML = `
                    <h3>Your ${results.destination} Package</h3>
                    <p>Dates: ${results.dates.checkIn} to ${results.dates.checkOut}</p>
                    <p>Budget: $${results.budget}</p>
                    <div class="results-content">
                        <div class="flights-results">
                            <h4>Flights</h4>
                            <pre>${results.flights.status 
                                ? JSON.stringify(results.flights.data?.slice(0, 2), null, 2) 
                                : 'Error: ' + results.flights.message}</pre>
                        </div>
                        <div class="hotels-results">
                            <h4>Hotels</h4>
                            <pre>${results.hotels.status 
                                ? JSON.stringify(results.hotels.data?.slice(0, 2), null, 2) 
                                : 'Error: ' + results.hotels.message}</pre>
                        </div>
                    </div>
                `;
            } catch (error) {
                showError(error.message);
            } finally {
                showLoading(false);
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application');
    }
};
