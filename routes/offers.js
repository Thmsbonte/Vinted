const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// MODELS IMPORT
const Offer = require("../models/Offer");
const User = require("../models/User");

// DISPLAY THE OFFERS OF THE WELCOME PAGE
router.get("/offers", async (req, res) => {
  try {
    // On initialise les variables qu'on va utiliser dans notre requête
    let filter = {};
    let page = 1;
    let limit = 20;
    let sort = {};
    // On vérifie si des paramètres query sont envoyés et on met à jour les variables le cas échéant
    if (req.query.page > 0) {
      page = Number(req.query.page);
    }
    if (req.query.title) filter.product_name = new RegExp(req.query.title, "i");
    if (req.query.priceMax) {
      filter.product_price = { $lte: req.query.priceMax };
    }
    if (req.query.priceMin) {
      if (filter.product_price) {
        filter.product_price.$gte = req.query.priceMin;
      } else {
        filter.product_price = { $gte: req.query.priceMin };
      }
    }
    if (req.query.sort) {
      const whatToSort = req.query.sort.split("-")[0];
      const howToSort = req.query.sort.split("-")[1];
      if (whatToSort === "price") sort.product_price = howToSort;
      if (whatToSort === "name") sort.product_name = howToSort;
    }
    // On fait notre requête à la BDD à partir des variables
    const offers = await Offer.find(filter)
      .limit(limit)
      .skip(limit * (page - 1))
      .sort(sort)
      .populate({ path: "owner", select: "account email token" });
    res.status(200).json(offers);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// GET SPECIFIC USER OFFERS
router.post("/my-offers", async (req, res) => {
  const { user_id } = req.fields;
  console.log("01", user_id);
  try {
    if (user_id) {
      const myOffers = await Offer.find({ owner: user_id }).populate({
        path: "owner",
        select: "account email token",
      });
      if (myOffers) {
        res.status(200).json(myOffers);
      } else {
        res.status(400).json({ message: "Pas d'article trouvé" });
      }
    } else {
      res.status(403).json({ message: "Utilisateur non connecté" });
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

module.exports = router;
