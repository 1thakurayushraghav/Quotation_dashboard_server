const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/* ================= MULTER CONFIGURATION ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

/* ================= GET ALL USERS ================= */
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET SINGLE USER ================= */
router.get('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= CREATE USER (ADMIN) ================= */
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'user'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/* ================= UPDATE USER (ADMIN) ================= */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: 'Email already in use' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= UPLOAD/UPDATE USER AVATAR (ADMIN) ================= */
router.put('/:id/avatar', authenticate, isAdmin, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old avatar if exists
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user avatar path
    user.avatar = '/uploads/avatars/' + req.file.filename;
    await user.save();

    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE USER AVATAR (ADMIN) ================= */
router.delete('/:id/avatar', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.avatar) {
      return res.status(400).json({ message: 'User has no avatar to delete' });
    }

    // Delete avatar file
    const avatarPath = path.join(__dirname, '..', user.avatar);
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    user.avatar = null;
    await user.save();

    res.json({ message: 'Avatar deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE USER ================= */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete your own account' });

    // Delete user's avatar if exists
    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= UPDATE USER PERMISSIONS (ADMIN) ================= */
router.put(
  '/:id/permissions',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { permissions } = req.body;

      if (!permissions || !permissions.quotation) {
        return res.status(400).json({
          message: 'Invalid permissions payload'
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent changing admin permissions (optional but recommended)
      if (user.role === 'admin') {
        return res.status(400).json({
          message: 'Admin permissions cannot be modified'
        });
      }

      user.permissions = {
        ...user.permissions,
        quotation: {
          create: !!permissions.quotation.create,
          read:   !!permissions.quotation.read,
          update: !!permissions.quotation.update,
          delete: !!permissions.quotation.delete
        }
      };

      await user.save();

      res.json({
        message: 'Permissions updated successfully',
        permissions: user.permissions
      });
    } catch (error) {
      console.error('PERMISSION UPDATE ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  }
);


module.exports = router;