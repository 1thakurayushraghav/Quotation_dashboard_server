const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/* ================= Permission Schema ================= */
const permissionSchema = new mongoose.Schema({
  quotation: {
    create: { type: Boolean, default: false },
    read:   { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  }
}, { _id: false });

/* ================= User Schema ================= */
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
    select: false 
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
    default: 'null'
  },

  /* 🔐 Permissions controlled by Admin */
  permissions: {
    type: permissionSchema,
    default: () => ({})
  }

}, {
  timestamps: true
});

/* ================= Compare Password ================= */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ================= Hide Sensitive Data ================= */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
