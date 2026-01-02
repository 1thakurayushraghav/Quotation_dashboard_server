const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  }
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    unique: true
  },
  // Company Details (from user's company)
  companyName: {
    type: String,
    default: ''
  },
  contactName: {
    type: String,
    default: ''
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyAddress: {
    type: String,
    default: ''
  },
  companyLogo: {
    type: String,
    default: ''
  },
  // Customer Details
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customerAddress: {
    type: String,
    default: ''
  },
  customerCompanyName: {
    type: String,
    default: ''
  },
  shippingDetails: {
    type: String,
    default: ''
  },
  items: [quotationItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected'],
    default: 'draft'
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-generate quotation number - FIXED VERSION
quotationSchema.pre('save', function(next) {
  const quotation = this;
  
  // If quotation number already exists, skip
  if (quotation.quotationNumber) {
    return next();
  }

  // Generate new quotation number
  mongoose.model('Quotation').countDocuments()
    .then(count => {
      quotation.quotationNumber = `QT-${String(count + 1).padStart(5, '0')}`;
      next();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = mongoose.model('Quotation', quotationSchema);