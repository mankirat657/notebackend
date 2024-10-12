const mongoose = require('mongoose');

const uri = 'mongodb+srv://mankiratmatharu:kspT1rNux9pVM67X@cluster0.txhxn.mongodb.net/note?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
  try {
    await mongoose.connect(uri); 
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

