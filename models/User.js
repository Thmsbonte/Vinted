const mongoose = require("mongoose");

// USER MODEL
const User = mongoose.model("User", {
  email: {
    unique: true,
    type: String,
  },
  account: {
    username: {
      required: true,
      type: String,
    },
    phone: String,
    avatar: Object, // nous verrons plus tard comment uploader une image
  },
  newsletter: false,
  token: String,
  hash: String,
  salt: String,
});

module.exports = User;
