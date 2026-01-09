const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/* ===============================
   GET ALL PRODUCTS
================================ */
router.get('/', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean(); // ✅ SAFE

    res.json({ products });
  } catch (error) {
    console.error('GET PRODUCTS ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/* ===============================
   GET SINGLE PRODUCT
================================ */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('GET PRODUCT ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/* ===============================
   CREATE PRODUCT
================================ */
router.post(
  '/',
  authenticate,
  [
    body('productName').trim().notEmpty().withMessage('Product name is required'),
    body('price').isNumeric().withMessage('Valid price is required'),
    body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required'),
    body('tax').optional().isNumeric(),

    // ✅ PARAMETERS VALIDATION (OPTIONAL)
    body('parameters').optional().isArray(),
    body('parameters.*.title').optional().isString(),
    body('parameters.*.specs').optional().isArray(),
    body('parameters.*.specs.*.label').optional().isString(),
    body('parameters.*.specs.*.value').optional().isString(),
    body('generalSpecifications').optional().isArray(),
    body('generalSpecifications.*.text').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      console.log('CREATE PRODUCT BODY:', JSON.stringify(req.body, null, 2));

      const product = await Product.create({
        productName: req.body.productName,
        price: req.body.price,
        unitOfMeasure: req.body.unitOfMeasure,
        tax: req.body.tax || 0,
        description: req.body.description || '',
        parameters: req.body.parameters || [], 
        generalSpecifications: req.body.generalSpecifications || [],
        createdBy: req.user._id
      });

      res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('CREATE PRODUCT ERROR:', error);
      res.status(500).json({
        message: 'Server error',
        error: error.message
      });
    }
  }
);

/* ===============================
   UPDATE PRODUCT
================================ */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatableFields = [
      'productName',
      'price',
      'unitOfMeasure',
      'tax',
      'description',
      'parameters',
      'generalSpecifications',
      'isActive'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('UPDATE PRODUCT ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/* ===============================
   DELETE PRODUCT
================================ */
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
    console.error('DELETE PRODUCT ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
