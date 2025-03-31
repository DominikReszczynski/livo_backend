import express from "express";
const router = express.Router();
const expanse = require("./../method/properties");
const dashboard = require("./../method/dashboard");
const user = require("./../method/user");
const image = require("./../method/image");

// ! ########################################
// ! ############ - EXPANSES - ##############
// ! ########################################

router.post("/expanse/add", expanse.addExpanse);
router.post("/expanse/getAnyExpansesByUserId", expanse.getAllExpansesByAuthor);
router.post(
  "/expanse/getAllExpansesByAuthorExcludingCurrentMonth",
  expanse.getExpansesGroupedByMonth
);
router.post(
  "/expanse/getExpansesByAuthorForCurrentMonth",
  expanse.getExpansesByAuthorForCurrentMonth
);
router.post(
  "/expanse/getExpensesGroupedByCategory",
  expanse.getExpensesGroupedByCategory
);
router.delete("/expanse/removeExpanse", expanse.removeExpanse);

// ! ########################################
// ! ############ - DASHBOARD - ##############
// ! ########################################

// router.post("/dashboard/chat", dashboard.chatWithCohere);

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

module.exports = router;
