const express = require("express");
const isAuthenticated = require("../middleware/isAuthenticated");
const router = express.Router();
const formidable = require("express-formidable");
router.use(formidable());
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_API_SECRET);
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

// MODEL IMPORT
const User = require("../models/User");
const Offer = require("../models/Offer");

router.post("/payment", async (req, res) => {
  const stripeToken = req.fields.stripeToken;
  const user_id = req.fields.user_id;
  const offer_id = req.fields.offer_id;

  try {
    if (offer_id) {
      // If we have an offer id, request to get offer information from DB
      const offer = await Offer.findById(offer_id);
      const offerPrice = Number(offer.product_price);
      const deliveryFees = 4.5;
      const insuranceFees = 0.5;
      const totalPrice = (offerPrice + deliveryFees + insuranceFees) * 100;
      try {
        // Payment request
        const response = await stripe.charges.create({
          amount: totalPrice,
          currency: "eur",
          description: offer.product_description,
          source: stripeToken,
        });
        res.status(200).json(response);
        // If OK delete of the offer in the DB
        try {
          //Je supprime ce qui il y a dans le dossier Cloudniary
          await cloudinary.api.delete_resources_by_prefix(
            `vinted/offers/${offer_id}`
          );
          //Une fois le dossier vide, je peux le supprimer !
          await cloudinary.api.delete_folder(`vinted/offers/${offer_id}`);
          const deleteOffer = await Offer.findByIdAndDelete(offer_id).populate(
            "owner"
          ); // We also get the owner's offer to notify him (by email for instance -> not included in this version)
        } catch (error) {
          // If delete fails we have to generate an error in the back-office (to do)
          console.log(error.message);
        }
      } catch (error) {
        console.log(error.message);
        res
          .status(400)
          .json({ message: "Le paiement a échoué, merci de réessayer" });
      }
    } else {
      res.status(400).json({ message: "Article inconnnu" });
    }
  } catch (error) {
    console.log(error.message);
    res
      .status(400)
      .json({ message: "Le paiement a échoué, merci de réessayer" });
  }
});

module.exports = router;
