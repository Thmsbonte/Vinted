const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const userToken = req.headers.authorization.replace("Bearer ", "");
      const user = await User.findOne({ token: userToken }).select(
        "account email token"
      );
      if (user) {
        req.user = user;
        return next();
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(400).json({ message: "Please login." });
    }
    // On vérifie qu'on a bien un token
    // Si oui on interroge la BDD pour savoir si le token existe
    // Si oui on récupère l'utilisateur et on l'ajoute à l'objet req
  } catch (error) {}
  res.status(400).json({ error: error.message });
};

module.exports = isAuthenticated;
