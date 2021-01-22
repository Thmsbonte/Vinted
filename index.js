const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(formidable());
app.use(cors());

// CLOUDINARY CONFIGURATION
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CONNECTION TO THE DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// ROUTE IMPORT
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);
const offersRoutes = require("./routes/offers");
app.use(offersRoutes);

// DEFAULT ROUTE
app.all("*", (req, res) => {
  res.status(404).json({ message: "This route doesn't exist" });
});

// START SERVER
app.listen(process.env.PORT, () => {
  console.log("Server has started");
});
