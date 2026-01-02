const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ 
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id); 

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Create product
router.post('/', authenticate, [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Valid price is required'),
  body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required'),
  body('tax').optional().isNumeric().withMessage('Tax must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product({
      ...req.body,
      createdBy: req.user._id
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id,
      createdBy: req.user._id 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    });

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id,
      createdBy: req.user._id 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;