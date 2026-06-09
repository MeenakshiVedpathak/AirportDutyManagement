const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    group: { type: String, enum: ['T1', 'T2', 'Ulve'], required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Contact', contactSchema);
