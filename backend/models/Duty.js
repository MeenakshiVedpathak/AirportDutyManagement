const mongoose = require('mongoose');

const INCENTIVE_AMOUNT = 500;
const INCENTIVE_TYPES = ['BEFORE_OFFICE', 'AFTER_OFFICE'];

const dutySchema = new mongoose.Schema(
  {
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    officerName: { type: String, default: '' },
    travellerName: { type: String, default: '' },
    travellerDesignation: { type: String, default: '' },
    travellerPhone: { type: String, default: '' },
    airportAuthorityPhone: { type: String, default: '' },
    date: { type: String, required: true },
    reportingTime: { type: String, required: true },
    guestArrivalTime: { type: String, default: null },
    officeType: {
      type: String,
      enum: ['REGULAR', 'BEFORE_OFFICE', 'AFTER_OFFICE', 'HOLIDAY'],
      required: true,
    },
    from: { type: String, required: true },
    to: { type: String, required: true },
    airline: { type: String, default: '' },
    flightNo: { type: String, required: true },
    pnrNo: { type: String, default: '' },
    flightTime: { type: String, required: true },
    pdfAttachment: {
      filename: { type: String, default: '' },
      url: { type: String, default: '' },
      storagePath: { type: String, default: '' },
      uploadedAt: { type: Date, default: null },
    },
    airportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Airport', required: true },
    airportName: { type: String, required: true },
    terminalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', required: true },
    terminalName: { type: String, required: true },
    arrivalDeparture: { type: String, enum: ['ARRIVAL', 'DEPARTURE'], required: true },
    noOfPassengers: { type: Number, default: 1, min: 1 },
    officerConfirmed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING',
    },
    incentive: {
      eligible: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.officerId = ret.officerId?.toString ? ret.officerId.toString() : ret.officerId;
        ret.createdBy = ret.createdBy?.toString ? ret.createdBy.toString() : ret.createdBy;
        if (ret.pdfAttachment && ret.pdfAttachment.url) {
          ret.pdfAttachment = {
            filename: ret.pdfAttachment.filename,
            url: ret.pdfAttachment.url,
            uploadedAt: ret.pdfAttachment.uploadedAt,
            hasFile: true,
          };
          delete ret.pdfAttachment.storagePath;
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

dutySchema.pre('save', function (next) {
  const eligible = INCENTIVE_TYPES.includes(this.officeType);
  this.incentive = { eligible, amount: eligible ? INCENTIVE_AMOUNT : 0 };
  next();
});

module.exports = mongoose.model('Duty', dutySchema);
