const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unitOfMeasure: {
    type: String,
    required: true,
    enum: ['Piece', 'Set', 'Kg', 'Gram', 'Liter', 'Meter', 'Box', 'Packet', 'Unit', 'Other']
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  parameters: [
    {
      title: {
        type: String,
        required: false, // Rain Fall, Windspeed
        trim: true
      },
      specs: [
        {
          label: {
            type: String,
            required: false, // Measuring Range, Accuracy
            trim: true
          },
          value: {
            type: String,
            required: false, // 0–30 m/s
            trim: true
          }
        }
      ]
    }
  ],

  generalSpecifications: {
    type: [
      {
        text: {
          type: String,
          trim: true
        }
      }
    ],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);