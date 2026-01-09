const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },

  productName: {
    type: String,
    required: true
  },
  unitOfMeasure: {
    type: String,
    default: ''
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
  },

  parameters: [
    {
      title: String,
      specs: [
        {
          label: String,
          value: String
        }
      ]
    }
  ],
  generalSpecifications: {
    type: [
      {
        text: { type: String, trim: true }
      }
    ],
    default: []
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
quotationSchema.pre('save', async function (next) {
  if (this.quotationNumber) {
    return next();
  }

  try {
    const now = new Date();

    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = monthNames[now.getMonth()];
    const year = String(now.getFullYear()).slice(-2); // 25

    const monthYearKey = `${month}${year}`; // JAN25

    // Month start & end
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count quotations only for current month
    const count = await mongoose.model('Quotation').countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    const sequence = String(count + 1).padStart(3, '0');

    this.quotationNumber = `QES/QT/${monthYearKey}/${sequence}`;

    next();
  } catch (error) {
    next(error);
  }
});


module.exports = mongoose.model('Quotation', quotationSchema);