import mongoose from "mongoose";
import User from "../models/user";
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
} from "../services/token";

const userFunctions = {
async getById(req: any, res: any): Promise<void> {
    try {
      const id = req.body.id;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).send({ success: false, message: "Nieprawidłowe ID." });
        return;
      }

      const user = await User.findById(id).select("_id email username phone");
      if (!user) {
        res.status(404).send({ success: false, message: "Użytkownik nie istnieje." });
        return;
      }

      res.status(200).send({ success: true, user });
    } catch (e) {
      console.error("❌ getById error:", e);
      res.status(500).send({ success: false, message: "Błąd serwera." });
    }
  },

// Rejestracja
async registration(req: any, res: any) {
  console.log("➡️ Rejestracja użytkownika:", req.body);
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).send({ success: false, message: "Missing email/username/password" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).send({ success: false, message: "User already exists" });
    }

    // ZAWSZE hashuj
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();

    return res.status(201).send({
      success: true,
      user: { _id: newUser._id, email: newUser.email, username: newUser.username },
    });
  } catch (e) {
    console.error("❌ Registration error:", e);
    return res.status(500).send({ success: false });
  }
},

// Logowanie
async login(req: any, res: any) {
  console.log("➡️ Login:", req.body);
  try {
    // pozwól logować się przez email LUB username (albo 'login'/'user')
    const { email, username, login, user, password } = req.body;
    const identifier = email || username || login || user;

    if (!identifier || !password) {
      return res.status(400).send({ success: false, message: "Missing identifier or password" });
    }

    const userData = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    console.log("Found userData:", userData);
    if (!userData) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const stored = String(userData.password ?? "");
    let isMatch = false;

    // jeśli wygląda jak bcrypt -> porównaj bcrytem
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
      isMatch = await bcrypt.compare(password, stored);
    } else {
      // tryb „legacy” dla środowiska dev/test (żeby nie walić 500)
      isMatch = password === stored;
    }

    if (!isMatch) {
      return res.status(401).send({ success: false, message: "Wrong password" });
    }

    const accessToken = signAccessToken(userData);
    const refreshToken = signRefreshToken(userData);

    return res.status(200).send({
      success: true,
      user: { email: userData.email, username: userData.username, _id: userData._id },
      tokens: { accessToken, refreshToken }, // USTALAMY JEDNOLITY KSZTAŁT
    });
  } catch (e) {
    console.error("❌ Login error:", e);
    return res.status(500).send({ success: false });
  }
}
};

export default userFunctions;