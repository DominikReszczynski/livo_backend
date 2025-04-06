import express from "express";
import { uploadSingle, propertiesFunctions } from "./../method/properties";
const router = express.Router();
const dashboard = require("./../method/dashboard");
const user = require("./../method/user");
const image = require("./../method/image");

// ! ########################################
// ! ############ - USER - ##############
// ! ########################################

router.post("/user/login", user.login);
router.post("/user/registration", user.registration);

// ! ########################################
// ! ############ - IMAGE - ##############
// ! ########################################

router.post(
  "/upload/image",
  dashboard.uploadMiddleware,
  dashboard.handleImageUpload
);

router.post(
  "/upload/images",
  image.uploadMultipleMiddleware,
  image.handleMultipleImageUpload
);

// ! ########################################
// ! ############ - PROPERTY - ##############
// ! ########################################
router.post(
  "/property/addProperty",
  uploadSingle,
  propertiesFunctions.addProperty
);
router.post(
  "/property/getAllByOwner",
  propertiesFunctions.getAllPropertiesByOwner
);

module.exports = router;
