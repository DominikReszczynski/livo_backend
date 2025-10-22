// import mongoose from "mongoose";

// export interface IUser extends Document {
//   email: string;
//   username: string;
//   password: string;
// }

// const userSchema = new mongoose.Schema({
//   email: { type: String, required: true },
//   username: { type: String, required: true },
//   password: { type: String, required: true },
// });

// const User = mongoose.model<IUser>("User", userSchema, "user");
// export default User;
// src/models/user.ts
import mongoose, { Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;

  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true }
);

// Hashowanie hasła przed zapisem
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Porównywanie hasła podczas logowania
userSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model<IUser>("User", userSchema, "user");
export default User;
