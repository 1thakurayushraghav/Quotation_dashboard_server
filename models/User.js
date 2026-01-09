const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // ensures password is not returned by default
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  phone: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: '' // optional avatar URL
  }
}, {
  timestamps: true
});

/* ================= Compare Password Method ================= */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ================= Hide Sensitive Data ================= */
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password; // remove password from returned object
  return obj;
};

module.exports = mongoose.model('User', userSchema);
