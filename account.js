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
        showError('Authentication failed. Please refresh the page.');
        throw error;
    }
};

const signOut = async () => {
    try {
        if (auth0Client) {
            await auth0Client.logout({
                returnTo: window.location.origin
            });
        }
    } catch (error) {
        console.error("Sign out error:", error);
        showError('Error signing out. Please try again.');
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
                tf.layers.dense({
                    units: 8,
                    activation: 'relu',
                    inputShape: [userData.preferences.length + 2]
                }),
                tf.layers.dense({ units: 4, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });

        model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        const xs = tf.tensor2d([[
            ...userData.preferences,
            parseFloat(userData.budget) / 5000,
            new Date(userData.checkInDate).getMonth() / 11
        ]]);

        const ys = tf.tensor2d([[1]]);
        await model.fit(xs, ys, {
            epochs: 10,
            batchSize: 1,
            validationSplit: 0.2
        });

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
        const url = new URL('https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights');
        url.searchParams.append('fromId', fromIATA);
        url.searchParams.append('toId', toIATA);
        url.searchParams.append('date', date);
        url.searchParams.append('currency', 'USD');

        const response = await fetch(url, {
            method: 'GET',
            headers: API_HEADERS,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log('Flights API Response:', data);

        if (data.status === false) {
            throw new Error(data.message?.join(', ') || 'Flight search failed');
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
        const destUrl = new URL('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination');
        destUrl.searchParams.append('query', cityName);

        const destResponse = await fetch(destUrl, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!destResponse.ok) throw new Error(`Destination lookup failed: ${destResponse.status}`);

        const destData = await destResponse.json();
        console.log('Destination API Response:', destData);

        const destId = destData.data?.[0]?.dest_id;
        if (!destId) throw new Error('No destination ID found');

        const hotelUrl = new URL('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels');
        hotelUrl.searchParams.append('dest_id', destId);
        hotelUrl.searchParams.append('search_type', 'CITY');
        hotelUrl.searchParams.append('date_from', checkInDate);
        hotelUrl.searchParams.append('date_to', checkOutDate);
        hotelUrl.searchParams.append('price_max', budget);
        hotelUrl.searchParams.append('adults', '1');
        hotelUrl.searchParams.append('currency', 'USD');

        const hotelResponse = await fetch(hotelUrl, {
            method: '
::contentReference[oaicite:0]{index=0}
 
