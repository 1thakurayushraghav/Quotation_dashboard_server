const express = require('express');
const { body, validationResult } = require('express-validator');
const Quotation = require('../models/Quotation');
const Product = require('../models/Product'); // ✅ IMPORTANT
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/* ======================================================
   GET DELETED QUOTATIONS (RECYCLE BIN) ✅
====================================================== */
router.get('/deleted', authenticate, async (req, res) => {
  try {
    const query = {
      isDeleted: true,
      ...(req.user.role === 'admin' ? {} : { createdBy: req.user._id })
    };

    const quotations = await Quotation.find(query)
      .populate('createdBy', 'name email')
      .sort({ deletedAt: -1 });

    res.json({ quotations });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load deleted quotations',
      error: error.message
    });
  }
});

/* ======================================================
   GET ALL QUOTATIONS
====================================================== */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...(req.user.role === 'admin' ? {} : { createdBy: req.user._id })
    };

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .select('quotationNumber customerName customerEmail total status createdAt createdBy')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Quotation.countDocuments(query)
    ]);

    res.json({ quotations, total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});





/* ======================================================
   GET SINGLE QUOTATION
====================================================== */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (
      req.user.role !== 'admin' &&
      quotation.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ quotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/* ======================================================
   CREATE QUOTATION ✅ FIXED
====================================================== */
router.post(
  '/',
  authenticate,
  [
    body('customerName').notEmpty(),
    body('customerEmail').isEmail(),
    body('items').isArray({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        notes,
        companyName,
        contactName,
        companyPhone,
        companyAddress,
        companyLogo,
        customerCompanyName,
        shippingDetails,
        customerId
      } = req.body;

      // ✅ FETCH PRODUCT DATA
      const itemsWithAmount = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId).lean();
          if (!product) throw new Error('Product not found');

          const amount = item.quantity * product.price;

          return {
            productId: product._id,
            productName: product.productName,
            unitOfMeasure: product.unitOfMeasure,
            description: product.description,
            quantity: item.quantity,
            rate: product.price,
            amount,
            tax: product.tax,
            parameters: product.parameters || [],
            generalSpecifications: product.generalSpecifications || []
          };
        })
      );

      const subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
      const taxAmount = itemsWithAmount.reduce(
        (s, i) => s + (i.amount * i.tax) / 100,
        0
      );
      const total = subtotal + taxAmount;

      const quotation = new Quotation({
        companyName,
        contactName,
        companyPhone,
        companyAddress,
        companyLogo,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCompanyName,
        shippingDetails,
        items: itemsWithAmount,
        subtotal,
        tax: taxAmount,
        total,
        notes,
        createdBy: req.user._id
      });

      await quotation.save();
      await quotation.populate('createdBy', 'name email');

      res.status(201).json({
        message: 'Quotation created successfully',
        quotation
      });
    } catch (error) {
      console.error('CREATE QUOTATION ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  }
);



/* ======================================================
   UPDATE QUOTATION ✅ FIXED
====================================================== */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (
      req.user.role !== 'admin' &&
      quotation.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { items, customerName, customerEmail, customerPhone, customerAddress, status, notes } =
      req.body;

    if (items) {
      const itemsWithAmount = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId).lean();
          if (!product) throw new Error('Product not found');

          const amount = item.quantity * product.price;

          return {
            productId: product._id,
            productName: product.productName,
            unitOfMeasure: product.unitOfMeasure,
            description: product.description,
            quantity: item.quantity,
            rate: product.price,
            amount,
            tax: product.tax,
            parameters: product.parameters || [],
            generalSpecifications: product.generalSpecifications || []
          };
        })
      );

      quotation.items = itemsWithAmount;
      quotation.subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
      quotation.tax = itemsWithAmount.reduce(
        (s, i) => s + (i.amount * i.tax) / 100,
        0
      );
      quotation.total = quotation.subtotal + quotation.tax;
    }

    quotation.customerName = customerName ?? quotation.customerName;
    quotation.customerEmail = customerEmail ?? quotation.customerEmail;
    quotation.customerPhone = customerPhone ?? quotation.customerPhone;
    quotation.customerAddress = customerAddress ?? quotation.customerAddress;
    quotation.status = status ?? quotation.status;
    quotation.notes = notes ?? quotation.notes;

    await quotation.save();
    await quotation.populate('createdBy', 'name email');

    res.json({ message: 'Quotation updated successfully', quotation });
  } catch (error) {
    console.error('UPDATE QUOTATION ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

/* ======================================================
   DELETE / RESTORE / PERMANENT DELETE
====================================================== */
router.delete('/:id', authenticate, async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Not found' });

  quotation.isDeleted = true;
  quotation.deletedAt = new Date();
  await quotation.save();

  res.json({ message: 'Quotation moved to recycle bin' });
});

router.put('/:id/restore', authenticate, async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Not found' });

  quotation.isDeleted = false;
  quotation.deletedAt = null;
  await quotation.save();

  res.json({ message: 'Quotation restored', quotation });
});

router.delete('/:id/permanent', authenticate, async (req, res) => {
  await Quotation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Quotation permanently deleted' });
});

module.exports = router;
