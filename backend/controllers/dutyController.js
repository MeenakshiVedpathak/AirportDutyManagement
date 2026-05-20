const Duty = require('../models/Duty');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/fcm');

exports.createDuty = async (req, res, next) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };
    if (!body.officerId) { body.officerId = undefined; body.officerName = body.officerName || ''; }
    const duty = await Duty.create(body);
    const dutyJson = duty.toJSON();

    if (duty.officerId) {
      const officer = await User.findById(duty.officerId).select('fcmToken name');
      if (officer?.fcmToken) {
        sendPushNotification({
          token: officer.fcmToken,
          title: 'New Duty Assigned',
          body: `Flight ${duty.flightNo || '—'} at ${duty.airportName || 'Airport'} on ${duty.date || '—'}`,
          data: { dutyId: dutyJson.id },
        });
      }
    }

    res.status(201).json(dutyJson);
  } catch (err) {
    next(err);
  }
};

exports.confirmDuty = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    if (req.user.role === 'OFFICER' && duty.officerId && duty.officerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    duty.officerConfirmed = true;
    await duty.save();

    const admins = await User.find({ role: 'ADMIN', fcmToken: { $ne: null } }).select('fcmToken');
    for (const admin of admins) {
      sendPushNotification({
        token: admin.fcmToken,
        title: 'Duty Confirmed',
        body: `${duty.officerName || 'Officer'} confirmed duty for Flight ${duty.flightNo} on ${duty.date}`,
        data: { dutyId: duty.toJSON().id },
      });
    }

    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.getDuties = async (req, res, next) => {
  try {
    const { status, officerId, airportId, terminalId, dateFrom, dateTo, mine, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Officers: show all duties by default; mine=true restricts to their own
    if (req.user.role === 'OFFICER' && mine === 'true') filter.officerId = req.user._id;
    if (status) filter.status = status;
    if (officerId && req.user.role === 'ADMIN') filter.officerId = officerId;
    if (airportId) filter.airportId = airportId;
    if (terminalId) filter.terminalId = terminalId;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [duties, total] = await Promise.all([
      Duty.find(filter).sort({ date: -1, flightTime: -1 }).skip(skip).limit(Number(limit)),
      Duty.countDocuments(filter),
    ]);

    res.json({
      duties: duties.map(d => d.toJSON()),
      total,
      hasMore: skip + duties.length < total,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDutyById = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.claimDuty = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    if (duty.officerId) return res.status(409).json({ message: 'Duty already claimed by another officer' });

    duty.officerId = req.user._id;
    duty.officerName = req.user.name;
    duty.officerConfirmed = false;
    await duty.save();

    const admins = await User.find({ role: 'ADMIN', fcmToken: { $ne: null } }).select('fcmToken');
    for (const admin of admins) {
      sendPushNotification({
        token: admin.fcmToken,
        title: 'Duty Claimed',
        body: `${req.user.name} claimed duty for Flight ${duty.flightNo} on ${duty.date}`,
        data: { dutyId: duty.toJSON().id },
      });
    }

    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.releaseDuty = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    if (!duty.officerId || duty.officerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'You have not claimed this duty' });

    duty.officerId = undefined;
    duty.officerName = '';
    duty.officerConfirmed = false;
    await duty.save();

    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.updateDutyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['UPCOMING', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status value' });

    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    if (req.user.role === 'OFFICER' && duty.officerId && duty.officerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    duty.status = status;
    await duty.save();
    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.deleteDuty = async (req, res, next) => {
  try {
    const duty = await Duty.findByIdAndDelete(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    res.json({ message: 'Duty deleted successfully' });
  } catch (err) {
    next(err);
  }
};
