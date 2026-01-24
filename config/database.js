const Mongoose = require('mongoose');

const connectDB = async () => {
    let connectionAttempts = 0;
    const maxAttempts = 5;

    while (connectionAttempts < maxAttempts) {
        try {
            console.log(`Attempt ${connectionAttempts + 1}: Connecting to MongoDB at ${process.env.CONNECT_DB}`);
            await Mongoose.connect(process.env.CONNECT_DB, {
                serverSelectionTimeoutMS: 5000,
            });
            console.log('MongoDB connected');
            return;
        } catch (error) {
            connectionAttempts++;
            console.error(`Failed to connect to MongoDB (attempt ${connectionAttempts}):`, error.message);

            if (connectionAttempts >= maxAttempts) {
                console.error('Maximum connection attempts reached. Giving up...');
                throw error;
            }

            console.log(`Waiting 5 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

module.exports = connectDB;
