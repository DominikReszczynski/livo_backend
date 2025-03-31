import mongoose from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model<IUser>("User", userSchema, "user");
export default User;
