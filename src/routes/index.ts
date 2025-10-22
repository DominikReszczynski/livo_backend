import express from "express";
import { uploadSingleImage, propertiesFunctions } from "./../method/properties";
const router = express.Router();
const dashboard = require("./../method/dashboard");
const image = require("./../method/image");
import userFunctions from "../method/user";
import { authMiddleware } from "../middleware/auth";

//  ########################################
//  ############ - USER - ##############
//  ########################################

router.post("/user/login", userFunctions.login);
router.post("/user/registration", userFunctions.registration);

//  ########################################
//  ############ - IMAGE - ##############
//  ########################################

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

// ########################################
//  ############ - PROPERTY - ##############
//  ########################################

router.post(
  "/property/addProperty",
  authMiddleware,
  uploadSingleImage,
  propertiesFunctions.addProperty
);

router.post(
  "/property/getAllByOwner",
  propertiesFunctions.getAllPropertiesByOwner
);
router.post("/property/setPin", propertiesFunctions.setPin);

router.post("/property/removePin", propertiesFunctions.removePin);

router.post(
  "/property/addTenantToProperty",
  propertiesFunctions.addTenantToProperty
);

router.post(
  "/property/getAllByTenant",
  propertiesFunctions.getAllPropertiesByTenant
);

module.exports = router;
