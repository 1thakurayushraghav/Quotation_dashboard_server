const express = require('express');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const customers = await Customer.find({ 
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json({ customers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create customer
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('address1').trim().notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = new Customer({
      ...req.body,
      createdBy: req.user._id
    });

    await customer.save();

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update customer
router.put('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findOne({ 
      _id: req.params.id,
      createdBy: req.user._id 
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        customer[key] = req.body[key];
      }
    });

    await customer.save();

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete customer
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ 
      _id: req.params.id,
      createdBy: req.user._id 
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;