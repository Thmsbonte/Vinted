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
    swap,
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
                product_swap: swap,
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
router.post("/offer/update/:offer_id", isAuthenticated, async (req, res) => {
  const { offer_id } = req.params;
  const {
    title,
    description,
    price,
    brand,
    size,
    condition,
    color,
    location,
    swap,
    user_id,
  } = req.fields;
  try {
    // On vérifie que les champs existent
    if (offer_id) {
      // On vérifie que l'annonce existe et appartient à l'utilisateur
      const offer = await Offer.findById(offer_id).populate("owner");
      if (offer.owner._id.toString() === req.user._id.toString()) {
        // Si oui on met à jour l'annonce et on répond à l'utilisateur authentifié
        offer.product_name = title;
        offer.product_description = description;
        offer.product_price = price;
        offer.product_swap = swap;
        offer.product_details = [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: location },
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

// UPDATE AN IMAGE TO AN OFFER
router.post("/offer/updatepicture", isAuthenticated, async (req, res) => {
  try {
    // On vérifie que les champs existent
    if (req.fields.offer_id) {
      // On vérifie que l'annonce existe et appartient à l'utilisateur
      const offer = await Offer.findById(req.fields.offer_id).populate({
        path: "owner",
      });
      if (offer.owner._id.toString() === req.user._id.toString()) {
        // Si oui on met à jour l'image et on répond à l'utilisateur authentifié
        const addPicture = req.files.picture.path;
        const pictureCloudinary = await cloudinary.uploader.upload(addPicture, {
          folder: `/vinted/offers/${offer._id}`,
        });
        // Si l'uploade de l'image s'est bien passé on ajoute l'image à l'annonce et on la sauvegarde dans la BDD
        if (pictureCloudinary) {
          const newProductImages = [...offer.product_image];
          newProductImages.push(pictureCloudinary);
          offer.product_image = newProductImages;
          await offer.save();
          res.status(200).json(pictureCloudinary);
        } else {
          res.status(400).json({
            message:
              "We have encoutered a problem with the upload of your picture. Please try again",
          });
        }
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

// DELETE AN IMAGE OF AN OFFER
router.post("/offer/deletepicture", isAuthenticated, async (req, res) => {
  const { offer_id, image_index } = req.fields;
  try {
    // On vérifie que les champs existent
    if (offer_id && image_index >= 0) {
      // On vérifie que l'annonce existe et appartient à l'utilisateur
      const offer = await Offer.findById(offer_id).populate({
        path: "owner",
      });
      if (offer.owner._id.toString() === req.user._id.toString()) {
        const result = await cloudinary.uploader.destroy(
          offer.product_image[image_index].public_id
        );
        if (result) {
          const newPictures = [...offer.product_image];
          newPictures.splice(image_index, 1);
          offer.product_image = newPictures;
          await offer.save();
          res.status(200).json(offer.product_image);
        } else {
          res
            .status(400)
            .json({ message: "Votre image n'a pas pu être supprimée" });
        }
        // const newCloudinaryPicture = await cloudinary.uploader.upload(
        //   newPicture,
        //   { public_id: offer.product_image.public_id, overwrite: true }
        // );
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
router.post("/offer/delete", isAuthenticated, async (req, res) => {
  const { offer_id } = req.fields;
  try {
    // On vérifie que l'id de l'annonce est bien transmis
    if (offer_id) {
      console.log("02", offer_id);
      const offer = await Offer.findById(offer_id).populate("owner");
      if (offer.owner._id.toString() === req.user._id.toString()) {
        //Je supprime ce qui il y a dans le dossier
        await cloudinary.api.delete_resources_by_prefix(
          `vinted/offers/${offer_id}`
        );
        //Une fois le dossier vide, je peux le supprimer !
        await cloudinary.api.delete_folder(`vinted/offers/${offer_id}`);
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
