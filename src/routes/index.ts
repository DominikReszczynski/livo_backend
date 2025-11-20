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
router.post("/user/updateProfile", authMiddleware, userFunctions.updateProfile);

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
  authMiddleware,
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
  "/property/update",
  authMiddleware,
  uploadSingleImage,
  propertiesFunctions.updateProperty
);

router.post(
  "/property/delete",
  authMiddleware,
  propertiesFunctions.deleteProperty
);

router.post(
  
  "/property/getAllByOwner",
  authMiddleware,
  propertiesFunctions.getAllPropertiesByOwner
);
router.post("/property/setPin", authMiddleware, propertiesFunctions.setPin);

router.post("/property/removePin", authMiddleware, propertiesFunctions.removePin);

router.post(
  "/property/addTenantToProperty",
  authMiddleware,
  propertiesFunctions.addTenantToProperty
);

router.post(
  "/property/getAllByTenant",
  authMiddleware,
  propertiesFunctions.getAllPropertiesByTenant
);

router.post(
  "/property/addRentalImages",
  authMiddleware,
  propertiesFunctions.addRentalImages
);

//  ########################################
//  ############# - DEFECT - ###############
//  ########################################

router.post("/defect/addDefect", authMiddleware, defectsFunctions.addDefect);

router.post("/defect/getAllDefects", authMiddleware, defectsFunctions.getAllDefects);

router.post("/defect/updateStatus",authMiddleware, defectsFunctions.updateDefectStatus);

router.post("/defect/listByUser", authMiddleware, defectsFunctions.listByUser);

// list
router.get("/defects/:defectId/comments",  authMiddleware, defectsFunctions.listDefectComments);
// add (attachments opcjonalne)
router.post("/defects/:defectId/comments", authMiddleware, uploadCommentAttachmentsMiddleware, defectsFunctions.addDefectComment);

module.exports = router;
