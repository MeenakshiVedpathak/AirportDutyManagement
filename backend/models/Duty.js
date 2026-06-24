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
      fileId:      { type: String, default: '' },
      filename:    { type: String, default: '' },
      mimeType:    { type: String, default: '' },
      size:        { type: Number, default: 0 },
      checksum:    { type: String, default: '' },
      data:        { type: Buffer },               // MongoDB binary (new uploads)
      uploadedAt:  { type: Date,   default: null },
      // Legacy Cloudinary fields — kept for backward compatibility
      storagePath: { type: String, default: '' },  // Cloudinary public_id
      url:         { type: String, default: '' },  // Cloudinary URL
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
        const hasData = !!ret.pdfAttachment?.data;
        const hasLegacyUrl = !!(ret.pdfAttachment?.storagePath || ret.pdfAttachment?.url);
        if (hasData || hasLegacyUrl) {
          ret.pdfAttachment = {
            fileId:     ret.pdfAttachment.fileId,
            filename:   ret.pdfAttachment.filename,
            mimeType:   ret.pdfAttachment.mimeType,
            size:       ret.pdfAttachment.size,
            uploadedAt: ret.pdfAttachment.uploadedAt,
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
