import express from "express";
const router = express.Router();
const test = require("./../method/test");
const expanse = require("./../method/expanses");
const dashboard = require("./../method/dashboard");
const user = require("./../method/user");
router.get("/hello", test.test);

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

router.post("/dashboard/chat", dashboard.chatWithCohere);

// ! ########################################
// ! ############ - USER - ##############
// ! ########################################

router.post("/user/login", user.login);
router.post("/user/registration", user.registration);

module.exports = router;
