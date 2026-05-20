const mongoose = require('mongoose');

const INCENTIVE_AMOUNT = 500;
const INCENTIVE_TYPES = ['BEFORE_OFFICE', 'AFTER_OFFICE'];

const dutySchema = new mongoose.Schema(
  {
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    officerName: { type: String, default: '' },
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
    flightNo: { type: String, required: true },
    flightTime: { type: String, required: true },
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
