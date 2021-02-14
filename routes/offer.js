const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const formidable = require("express-formidable");
router.use(formidable());
const cloudinary = require("cloudinary").v2;

// MODEL IMPORT
const User = require("../models/User");
const Offer = require("../models/Offer");

// MIDDLEWARE IMPORT
const isAuthenticated = require("../middleware/isAuthenticated");

// PUBLISH AN OFFER
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    if (req.user) {
      // Si l'utilisateur est authentifié on vérifie que les champs sont renseignés
      if (
        req.fields.title &&
        req.fields.description &&
        req.fields.price &&
        req.fields.brand &&
        req.fields.size &&
        req.fields.condition &&
        req.fields.color &&
        req.fields.city &&
        req.files.picture.path
      ) {
        if (req.fields.description.length <= 500) {
          if (req.fields.title.length <= 50) {
            if (req.fields.price <= 100000) {
              // Si tous les champs sont biens renseignés on crée une nouvelle annonce  sans image, qu'on lie à l'utilisateur
              const offer = new Offer({
                product_name: req.fields.title,
                product_description: req.fields.description,
                product_price: req.fields.price,
                product_details: [
                  { MARQUE: req.fields.brand },
                  { TAILLE: req.fields.size },
                  { ETAT: req.fields.condition },
                  { COULEUR: req.fields.color },
                  { EMPLACEMENT: req.fields.city },
                ],
                owner: req.user,
              });
              // on upload l'image sur Cloudinary avec l'id de l'offre en chemin
              const pictureToUpload = req.files.picture.path;
              const pictureCloudinary = await cloudinary.uploader.upload(
                pictureToUpload,
                { folder: "/vinted/offers/" + offer._id }
              );
              // Si l'uploade de l'image s'est bien passé on ajoute l'image à l'annonce et on la sauvegarde dans la BDD
              if (pictureCloudinary) {
                offer.product_image = pictureCloudinary;
                await offer.save();
                res.status(200).json(offer);
              } else {
                res.status(400).json({
                  message:
                    "We have encoutered a problem with the upload of your picture. Please try again",
                });
              }
            } else {
              res.status(400).json({ message: "Price : maximum 100000" });
            }
          } else {
            res.status(400).json({ message: "Title : maximum 50 characters" });
          }
        } else {
          res
            .status(400)
            .json({ message: "Description : maximum 500 characters" });
        }
      } else {
        res.status(400).json({ message: "Missing fields" });
      }
    } else {
      res.status(400).json({ message: "Authentication failed" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE AN OFFER
router.put("/offer/update", isAuthenticated, async (req, res) => {
  try {
    // On vérifie que les champs existent
    if (req.fields.id) {
      // On vérifie que l'annonce existe et appartient à l'utilisateur
      const offer = await Offer.findById(req.fields.id).populate("owner");
      if (offer.owner._id.toString() === req.user._id.toString()) {
        // Si oui on met à jour l'annonce et on répond à l'utilisateur authentifié
        offer.product_name = req.fields.title;
        offer.product_description = req.fields.description;
        offer.product_price = req.fields.price;
        offer.product_details = [
          { MARQUE: req.fields.brand },
          { TAILLE: req.fields.size },
          { ETAT: req.fields.condition },
          { COULEUR: req.fields.color },
          { EMPLACEMENT: req.fields.city },
        ];
        await offer.save();
        res.status(200).json(offer);
      } else {
        res
          .status(400)
          .json({ message: "Your are not allowed to modify this offer" });
      }
    } else {
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE THE IMAGE OF AN OFFER
router.put("/offer/updatepicture", isAuthenticated, async (req, res) => {
  try {
    // On vérifie que les champs existent
    if (req.fields.id) {
      // On vérifie que l'annonce existe et appartient à l'utilisateur
      const offer = await Offer.findById(req.fields.id).populate({
        path: "owner",
      });
      if (offer.owner._id.toString() === req.user._id.toString()) {
        // Si oui on met à jour l'image et on répond à l'utilisateur authentifié
        console.log(offer);
        const newPicture = req.files.picture.path;
        const newCloudinaryPicture = await cloudinary.uploader.upload(
          newPicture,
          { public_id: offer.product_image.public_id, overwrite: true }
        );
        offer.product_image = newCloudinaryPicture;
        await offer.save();
        res.status(200).json(offer);
      } else {
        res
          .status(400)
          .json({ message: "Your are not allowed to modify this picture" });
      }
    } else {
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE AN OFFER
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    // On vérifie que l'id de l'annonce est bien transmis
    if (req.fields.id) {
      const offer = await Offer.findById(req.fields.id).populate("owner");
      if (offer.owner._id.toString() === req.user._id.toString()) {
        await offer.deleteOne();
        res.status(200).json({
          message: `Your offer ${offer.product_name} has been deleted`,
        });
      } else {
        res
          .status(400)
          .json({ message: "Your are not allowed to delete this offer" });
      }
      // On vérifie que l'annonce existe et appartient à l'utilisateur authentifié
    } else {
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DISPLAY THE DETAILS OF AN OFFER
router.get("/offer/:id", async (req, res) => {
  try {
    // On vérifie qu'un id est envoyé et qu'il existe dans la BDD
    if (req.params.id) {
      const offer = await Offer.findById(req.params.id).populate({
        path: "owner",
        select: "account",
      });
      if (offer) {
        res.status(200).json(offer);
      } else {
        res.status(400).json({ message: "This offer doesn't exist" });
      }
    } else {
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ROUTES EXPORT
module.exports = router;
