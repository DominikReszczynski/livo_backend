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
    const { email, username, password, phone } = req.body;

    if (!email || !username || !password || !phone) {
      return res.status(400).send({ success: false, message: "Missing email/username/password/phone" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).send({ success: false, message: "User already exists" });
    }

    // ZAWSZE hashuj
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, username, password: hashedPassword, phone });
    await newUser.save();

    return res.status(201).send({
      success: true,
      user: { _id: newUser._id, email: newUser.email, username: newUser.username, phone: newUser.phone },
    });
  } catch (e) {
    console.error("❌ Registration error:", e);
    return res.status(500).send({ success: false });
  }
},

// 🔐 Logowanie
async login(req: any, res: any) {
  console.log("➡️ Login:", { email: req.body.email, username: req.body.username });
  try {
    const { email, username, login, user, password } = req.body;
    const identifier = email || username || login || user;

    if (!identifier || !password) {
      return res.status(400).send({ success: false, message: "Missing identifier or password" });
    }

    const userData = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password');

    console.log("Found userData:", userData && {
      _id: userData._id, email: userData.email, username: userData.username
    });

    if (!userData) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const stored = String(userData.password ?? "");
    let isMatch = false;

    if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
      isMatch = await bcrypt.compare(password, stored);
    } else {
      // tryb legacy (dev/test)
      isMatch = password === stored;
    }

    if (!isMatch) {
      return res.status(401).send({ success: false, message: "Wrong password" });
    }

    const accessToken = signAccessToken(userData);
    const refreshToken = signRefreshToken(userData);

    return res.status(200).send({
      success: true,
      user: { email: userData.email, username: userData.username, phone: userData.phone , _id: userData._id },
      tokens: { accessToken, refreshToken },
    });
  } catch (e) {
    console.error("❌ Login error:", e);
    return res.status(500).send({ success: false });
  }
},
async updateProfile(req: any, res: any) {
  try {
    const uid = req.user?._id || req.body?.userId; // dev fallback
    if (!uid) return res.status(401).send({ success: false, message: "Unauthorized" });

    const { username, email, phone } = req.body || {};
    if (!username || !email) {
      return res.status(400).send({ success: false, message: "Brak wymaganych pól" });
    }

    const updated = await User.findByIdAndUpdate(
      uid,
      { $set: { username, email, phone: phone ?? null } },
      { new: true, runValidators: true, context: 'query' }
    ).lean();

    if (!updated) return res.status(404).send({ success: false, message: "User not found" });
    return res.status(200).send({ success: true, user: updated });
  } catch (e) {
    console.error("updateProfile error:", e);
    return res.status(500).send({ success: false });
  }
}
};

export default userFunctions;