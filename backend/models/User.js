const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  isVerified: { type: Boolean, default: false }, // for providers
  identityProofUrl: { type: String, default: null } // Provider identity proof document
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
