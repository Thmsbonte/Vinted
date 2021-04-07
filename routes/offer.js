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
  const {
    title,
    description,
    price,
    brand,
    size,
    condition,
    color,
    location,
  } = req.fields;
  try {
    if (req.user) {
      // Si l'utilisateur est authentifié on vérifie que les champs sont renseignés
      if (
        title &&
        description &&
        price &&
        brand &&
        size &&
        condition &&
        color &&
        location &&
        req.files.picture0
      ) {
        if (description.length <= 500) {
          if (title.length <= 50) {
            if (price <= 100000) {
              // Si tous les champs sont biens renseignés on crée une nouvelle annonce  sans image, qu'on lie à l'utilisateur
              const offer = new Offer({
                product_name: title,
                product_description: description,
                product_price: price,
                product_details: [
                  { MARQUE: brand },
                  { TAILLE: size },
                  { ETAT: condition },
                  { COULEUR: color },
                  { EMPLACEMENT: location },
                ],
                owner: req.user,
              });
              // on upload l'image sur Cloudinary avec l'id de l'offre en chemin
              const picturesUploaded = [];
              for (let i = 0; i < Object.keys(req.files).length; i++) {
                const pictureToUpload = req.files[`picture${i}`]?.path;
                const pictureCloudinary = await cloudinary.uploader.upload(
                  pictureToUpload,
                  { folder: `/vinted/offers/${offer._id}` }
                );
                picturesUploaded.push(pictureCloudinary);
              }

              // Si l'uploade de l'image s'est bien passé on ajoute l'image à l'annonce et on la sauvegarde dans la BDD
              if (picturesUploaded.length === Object.keys(req.files).length) {
                offer.product_image = picturesUploaded;
                await offer.save();
                res.status(200).json(offer);
              } else {
                res.status(400).json({
                  message:
                    "We have encoutered a problem with the upload of your picture. Please try again",
                });
              }
            } else {
              res.status(400).json({ message: "Prix maximum 100 000 euros" });
            }
          } else {
            res.status(400).json({ message: "Titre : maximum 50 caractères" });
          }
        } else {
          res
            .status(400)
            .json({ message: "Description : maximum 500 caractères" });
        }
      } else {
        res.status(400).json({ message: "Champ(s) manquant(s)" });
      }
    } else {
      res.status(400).json({ message: "L'authentification a échoué" });
    }
  } catch (error) {
    res.status(403).json({ message: error.message });
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
          { EMPLACEMENT: req.fields.location },
        ];
        await offer.save();
        res.status(200).json(offer);
      } else {
        res
          .status(400)
          .json({ message: "Vous n'êtes pas autorisé à modifier cet article" });
      }
    } else {
      res.status(400).json({ message: "Champ(s) manquant(s)" });
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
          .json({ message: "Vous n'êtes pas autorisé à modifier cet article" });
      }
    } else {
      res.status(400).json({ message: "Champ(s) manquant(s)" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE AN OFFER
router.post("/offer/delete", async (req, res) => {
  const { offer_id, user_id } = req.fields;
  try {
    // On vérifie que l'id de l'annonce est bien transmis
    if (offer_id && user_id) {
      const offer = await Offer.findById(offer_id).populate("owner");
      if (offer.owner._id.toString() === user_id) {
        await offer.deleteOne();
        res.status(200).json({
          message: `Votre article ${offer.product_name} a été supprimé`,
        });
      } else {
        res
          .status(400)
          .json({ message: "Vous n'êtes pas autorisé à modifier cet article" });
      }
      // On vérifie que l'annonce existe et appartient à l'utilisateur authentifié
    } else {
      res.status(400).json({ message: "Champ(s) manquant(s)" });
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
        res.status(400).json({ message: "Cet article n'existe pas" });
      }
    } else {
      res.status(400).json({ message: "Champ(s) manquant(s)" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ROUTES EXPORT
module.exports = router;
