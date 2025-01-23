// Preprocess user data for the model
const preprocessUserData = (user) => {
    console.log("Preprocessing user data:", user);
    const preferences = user.preferences ? Object.values(user.preferences) : [0];
    // Check if preferences contain valid numbers
    const validPreferences = preferences.every(pref => typeof pref === 'number' && !isNaN(pref));
    if (!validPreferences) {
        throw new Error("User preferences are invalid");
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
    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: inputShape})); // Ensure input shape matches preferences length
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

        if (!userData.preferences || userData.preferences.length === 0) {
            throw new Error("User preferences are empty or invalid");
        }

        const model = await trainModel([userData]);
        console.log("Model:", model);

        const input = tf.tensor2d([userData.preferences]); // Ensure preferences are converted to array
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

        return recommendations;
    } catch (error) {
        console.error("Error generating recommendations:", error);
        return [NaN]; // Return NaN to indicate error
    }
};
