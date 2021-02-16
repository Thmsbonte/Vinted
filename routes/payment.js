const express = require("express");
const isAuthenticated = require("../middleware/isAuthenticated");
const router = express.Router();
const formidable = require("express-formidable");
router.use(formidable());
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_API_SECRET);
const mongoose = require("mongoose");

// MODEL IMPORT
const User = require("../models/User");
const Offer = require("../models/Offer");

router.post("/payment", async (req, res) => {
  const stripeToken = req.fields.stripeToken;
  const user_id = req.fields.user_id;
  const offer_id = req.fields.offer_id;

  try {
    if (offer_id) {
      // If we have a offer id, request to get offer information from DB
      const offer = await Offer.findById(offer_id);
      const price = Number(offer.product_price) * 100;
      try {
        // Request to do the payment
        const response = await stripe.charges.create({
          amount: price,
          currency: "eur",
          description: offer.product_description,
          source: stripeToken,
        });

        res.status(200).json(response);
      } catch (error) {
        console.log(error.message);
        res.status(400).json({ message: "Payment failed, please try again" });
      }
    } else {
      res.status(400).json({ message: "Offer unknown" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: "Payment failed, please try again" });
  }
});

module.exports = router;
