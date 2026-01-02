const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  logo: {
    type: String, // URL or base64 string
    default: ''
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  contactName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address1: {
    type: String,
    required: true
  },
  address2: {
    type: String,
    default: ''
  },
  otherInfo: {
    type: String,
    default: ''
  },
  businessLabel: {
    type: String,
    enum: ['GSTIN', 'PAN', 'VAT', 'Business Number'],
    required: true
  },
  businessNumber: {
    type: String,
    required: true
  },
  businessCategory: {
    type: String,
    required: true,
    enum: [
      'Environment Service',
      'IT & Software',
      'Manufacturing',
      'Construction',
      'Healthcare',
      'Education',
      'Retail',
      'Hospitality',
      'Transportation',
      'Finance',
      'Real Estate',
      'Agriculture',
      'Energy',
      'Consulting',
      'Media & Entertainment',
      'Other'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// One company per user
companySchema.index({ createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);