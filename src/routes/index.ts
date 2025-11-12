import express from "express";
import { uploadSingleImage, propertiesFunctions } from "./../method/properties";
const router = express.Router();
const dashboard = require("./../method/dashboard");
const files = require("./../method/files");
import userFunctions from "../method/user";
import { authMiddleware } from "../middleware/auth";
import defectsFunctions, { uploadCommentAttachmentsMiddleware } from "../method/defect";

//  ########################################
//  ############ - USER - ##############
//  ########################################

router.post("/user/login", userFunctions.login);
router.post("/user/registration", userFunctions.registration);
router.post("/user/getById", userFunctions.getById);

//  ########################################
//  ############ - IMAGE - ##############
//  ########################################

router.post(
  "/upload/image",
  files.uploadMiddleware,
  files.handleImageUpload
);

router.post(
  "/upload/images",
  files.uploadMultipleMiddleware,
  files.handleMultipleImageUpload
);

router.post("/upload/documents",
  files.uploadDocumentsMiddleware,
  files.handleMultipleDocumentUpload
);

//  ########################################
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

router.post(
  "/property/addRentalImages",
  propertiesFunctions.addRentalImages
);

//  ########################################
//  ############# - DEFECT - ###############
//  ########################################

router.post("/defect/addDefect", defectsFunctions.addDefect);

router.post("/defect/getAllDefects", defectsFunctions.getAllDefects);

router.post("/defect/updateStatus", defectsFunctions.updateDefectStatus);

router.post("/defect/listByUser", defectsFunctions.listByUser);

// list
router.get("/defects/:defectId/comments",  defectsFunctions.listDefectComments);
// add (attachments opcjonalne)
router.post("/defects/:defectId/comments", uploadCommentAttachmentsMiddleware, defectsFunctions.addDefectComment);

module.exports = router;
