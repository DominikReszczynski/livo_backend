import mongoose from "mongoose";
import User, { IUser } from "../models/user";
import moment from "moment";
import dayjs from "dayjs";

var userFunctions = {
  async registration(req: any, res: any) {
    console.log("zaczynam dodawać");
    console.log(req.body);
    try {
      let newUser = new User(req.body);

      await newUser.save();
      return res.status(200).send({
        success: true,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).send({ success: false });
    }
  },

  async login(req: any, res: any) {
    console.log("login");
    try {
      const email = req.body.email;
      const password = req.body.password;
      console.log(email);
      console.log("All users: ", await User.find({}));

      const userData = await User.findOne({ email: email });
      console.log(userData);
      if (!userData) {
        return res
          .status(404)
          .send({ success: false, message: "User not found" });
      }

      if (userData.password !== password) {
        return res
          .status(401)
          .send({ success: false, message: "Wrong password" });
      }

      return res.status(200).send({ success: true, user: userData });
    } catch (e) {
      console.error("Login error:", e);
      return res.status(500).send({ success: false });
    }
  },
};

module.exports = userFunctions;
