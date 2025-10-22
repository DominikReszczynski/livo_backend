import User from "../models/user";
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
} from "../services/token";

const userFunctions = {
  // 🧾 Rejestracja
  async registration(req: any, res: any) {
    console.log("➡️ Rejestracja użytkownika:", req.body);
    try {
      const { email, username, password } = req.body;

      // Sprawdź, czy email już istnieje
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .send({ success: false, message: "Email already exists" });
      }

      // Hashuj hasło (model też to robi, ale możemy tu jawnie)
      const hashedPassword = password;
      //  await bcrypt.hash(password, 10);

      const newUser = new User({ email, username, password: hashedPassword });
      await newUser.save();

      return res.status(200).send({ success: true });
    } catch (e) {
      console.error("❌ Registration error:", e);
      return res.status(500).send({ success: false });
    }
  },

  // 🔐 Logowanie
  async login(req: any, res: any) {
    console.log("➡️ Login:", req.body);
    try {
      const { email, password } = req.body;

      // Szukamy użytkownika
      const userData = await User.findOne({ email });
      console.log("Found userData:", userData);
      if (!userData) {
        return res
          .status(404)
          .send({ success: false, message: "User not found" });
      }

      // Sprawdzamy hasło
      const isMatch = await bcrypt.compare(password, userData.password);
      if (!isMatch) {
        return res
          .status(401)
          .send({ success: false, message: "Wrong password" });
      }

      // Generujemy tokeny JWT
      const accessToken = signAccessToken(userData);
      const refreshToken = signRefreshToken(userData);

      // Odpowiedź kompatybilna z frontendem
      return res.status(200).send({
        success: true,
        user: {
          email: userData.email,
          username: userData.username,
          _id: userData._id,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (e) {
      console.error("❌ Login error:", e);
      return res.status(500).send({ success: false });
    }
  },
};

export default userFunctions;