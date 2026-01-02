const express = require('express');
const { body, validationResult } = require('express-validator');
const Quotation = require('../models/Quotation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all quotations (excluding deleted)
router.get('/', authenticate, async (req, res) => {
  try {
    const query = { 
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ],
      ...(req.user.role === 'admin' ? {} : { createdBy: req.user._id })
    };
    const quotations = await Quotation.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ quotations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get deleted quotations (Recycle Bin)
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single quotation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && quotation.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ quotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quotation
router.post('/', authenticate, [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid customer email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerName, customerEmail, customerPhone, customerAddress, items, tax, notes, 
            companyName, contactName, companyPhone, companyAddress, companyLogo,
            customerCompanyName, shippingDetails, customerId } = req.body;

    // Calculate amounts
    const itemsWithAmount = items.map(item => ({
      productId: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
      tax: item.tax || 0
    }));

    const subtotal = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = tax || 0;
    const total = subtotal + taxAmount;

    const quotation = new Quotation({
      // Company details
      companyName: companyName || '',
      contactName: contactName || '',
      companyPhone: companyPhone || '',
      companyAddress: companyAddress || '',
      companyLogo: companyLogo || '',
      
      // Customer details
      customerId: customerId || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerCompanyName: customerCompanyName || '',
      shippingDetails: shippingDetails || '',
      
      // Items and totals
      items: itemsWithAmount,
      subtotal,
      tax: taxAmount,
      total,
      notes: notes || '',
      createdBy: req.user._id
    });

    await quotation.save();
    await quotation.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Quotation created successfully',
      quotation
    });
  } catch (error) {
    console.error('Quotation creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quotation
router.put('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && quotation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { customerName, customerEmail, customerPhone, customerAddress, items, tax, status, notes } = req.body;

    if (items) {
      const itemsWithAmount = items.map(item => ({
        ...item,
        amount: item.quantity * item.rate
      }));
      
      quotation.items = itemsWithAmount;
      quotation.subtotal = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0);
      quotation.tax = tax || 0;
      quotation.total = quotation.subtotal + quotation.tax;
    }

    quotation.customerName = customerName || quotation.customerName;
    quotation.customerEmail = customerEmail || quotation.customerEmail;
    quotation.customerPhone = customerPhone || quotation.customerPhone;
    quotation.customerAddress = customerAddress || quotation.customerAddress;
    quotation.status = status || quotation.status;
    quotation.notes = notes !== undefined ? notes : quotation.notes;

    await quotation.save();
    await quotation.populate('createdBy', 'name email');

    res.json({
      message: 'Quotation updated successfully',
      quotation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete quotation (Soft delete - move to recycle bin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && quotation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    quotation.isDeleted = true;
    quotation.deletedAt = new Date();
    await quotation.save();

    res.json({ message: 'Quotation moved to recycle bin' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Restore quotation from recycle bin
router.put('/:id/restore', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && quotation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Restore
    quotation.isDeleted = false;
    quotation.deletedAt = null;
    await quotation.save();

    res.json({ message: 'Quotation restored successfully', quotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Permanent delete
router.delete('/:id/permanent', authenticate, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && quotation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quotation permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;