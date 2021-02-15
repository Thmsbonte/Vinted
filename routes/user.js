const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// DB MODELS IMPORT
const User = require("../models/User");
const Offer = require("../models/Offer");

// SIGN UP ROUTE
router.post("/user/signup", async (req, res) => {
  try {
    // Est-ce que l'email, le username et le mdp sont renseignés
    if (req.fields.email && req.fields.username && req.fields.password) {
      // Est-ce que l'email existe déjà dans la BDD
      const mail = await User.findOne({ email: req.fields.email });
      if (!mail) {
        // Hash generation
        const salt = uid2(16);
        const hash = SHA256(req.fields.password + salt).toString(encBase64);
        const token = uid2(16);
        // Creation de l'utilisateur dans la BDD
        const user = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },
          newsletter: req.fields.newsletter,
          token: token,
          hash: hash,
          salt: salt,
        });
        // Si l'utilisateur a uploadé une photo de profile, on l'ajoute à Cloudinary
        if (req.files.avatar) {
          const pictureToUpload = req.files.avatar.path;
          const pictureCloudinary = await cloudinary.uploader.upload(
            pictureToUpload,
            {
              folder: "vinted/user/" + user._id,
            }
          );
          user.account.avatar = pictureCloudinary;
        }
        await user.save();
        // Réponse au client
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: {
            username: user.account.username,
            phone: user.account.phone,
          },
        });
      } else {
        res.status(400).json({ message: "User already exist" });
      }
    } else {
      res.status(400).json({ message: "Missing fields" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// LOGIN ROUTE
router.post("/user/login", async (req, res) => {
  try {
    // Si mail est présent, vérification que l'utilisateur existe
    if (req.fields.email) {
      const user = await User.findOne({ email: req.fields.email });
      if (user) {
        // Si oui, génération de son hash
        const hash = SHA256(req.fields.password + user.salt).toString(
          encBase64
        );
        // Vérification avec les information issues de la BDD. Si OK, réponse à l'utilisateur
        console.log("yes");
        if (hash === user.hash) {
          res.status(200).json({
            _id: user._id,
            token: user.token,
            account: {
              username: user.account.username,
              phone: user.account.phone,
            },
          });
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(400).json({ message: "Missing fields" });
    }
  } catch (error) {
    res.status(400).json({ message: "Request to failed, please try again" });
  }
});

module.exports = router;
