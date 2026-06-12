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
      fileId:    { type: String, default: '' },   // UUID — stable reference for this file
      filename:  { type: String, default: '' },
      mimeType:  { type: String, default: '' },
      size:      { type: Number, default: 0 },    // bytes
      checksum:  { type: String, default: '' },   // MD5 — used for deduplication
      data:      { type: Buffer },                // binary stored in MongoDB
      uploadedAt:{ type: Date,   default: null },
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

        // Never expose binary data in API responses — only expose metadata
        const pdf = ret.pdfAttachment;
        if (pdf?.data || pdf?.storagePath) {
          ret.pdfAttachment = {
            fileId:     pdf.fileId,
            filename:   pdf.filename,
            mimeType:   pdf.mimeType || 'application/pdf',
            size:       pdf.size,
            uploadedAt: pdf.uploadedAt,
            hasFile:    true,
          };
        } else {
          ret.pdfAttachment = { hasFile: false };
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
