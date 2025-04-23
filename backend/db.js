const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://remorsivemate:4wUlUhRsfn3NW6yY@cluster0.pxapqmk.mongodb.net/testdb?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Mongoose connected to MongoDB');
  } catch (err) {
    console.error('Mongoose connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
