const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
    phone: { type: String, required: true },
    address: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true }, // lets admin disable an account without deleting it

    //Ayon api
    emailNotifications: { type: Boolean, default: true }, // opt-out switch for automated emails
    smsNotifications: { type: Boolean, default: false }, // opt-in switch for automated SMS (off by default — SMS costs money to send)
    
  },
  { timestamps: true }
);

// Hash the password automatically whenever it is set/changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method used by the login controller to check a submitted password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never send the password hash back in API responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
