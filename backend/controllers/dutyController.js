const crypto = require('crypto');
const https = require('https');
const Duty = require('../models/Duty');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/fcm');
const { cloudinary } = require('../utils/cloudinaryStorage');

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
    // Auto-complete any UPCOMING duties whose date has already passed
    const today = new Date().toISOString().split('T')[0];
    await Duty.updateMany(
      { status: 'UPCOMING', date: { $lt: today } },
      { $set: { status: 'COMPLETED' } }
    );

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

exports.assignOfficer = async (req, res, next) => {
  try {
    const { officerId, officerName } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    let resolvedName = officerName || '';
    if (officerId && !resolvedName) {
      const officer = await User.findById(officerId).select('name');
      if (officer) resolvedName = officer.name;
    }

    duty.officerId = officerId || undefined;
    duty.officerName = resolvedName;
    duty.officerConfirmed = false;
    await duty.save();

    if (duty.officerId) {
      const officer = await User.findById(duty.officerId).select('fcmToken name');
      if (officer?.fcmToken) {
        sendPushNotification({
          token: officer.fcmToken,
          title: 'Duty Assigned',
          body: `Flight ${duty.flightNo || '—'} at ${duty.airportName || 'Airport'} on ${duty.date || '—'}`,
          data: { dutyId: duty.toJSON().id },
        });
      }
    }

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

exports.updateDuty = async (req, res, next) => {
  try {
    const allowed = [
      'date', 'reportingTime', 'guestArrivalTime', 'officeType',
      'from', 'to', 'airline', 'flightNo', 'pnrNo', 'flightTime', 'airportId', 'airportName',
      'terminalId', 'terminalName', 'arrivalDeparture', 'noOfPassengers',
      'travellerName', 'travellerDesignation', 'travellerPhone', 'airportAuthorityPhone', 'remark',
    ];
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    for (const field of allowed) {
      if (req.body[field] !== undefined) duty[field] = req.body[field];
    }
    await duty.save();
    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.uploadDutyPdf = async (req, res, next) => {
  try {
    const { filename, data: base64Data, mimeType } = req.body;
    if (!base64Data) return res.status(400).json({ message: 'No file data provided' });

    const buffer = Buffer.from(base64Data, 'base64');
    const MAX_BYTES = 5 * 1024 * 1024;
    if (buffer.length > MAX_BYTES)
      return res.status(400).json({ message: 'File exceeds the 5 MB limit' });

    const checksum = crypto.createHash('md5').update(buffer).digest('hex');

    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    // Deduplication: skip if identical file already attached
    if (duty.pdfAttachment?.checksum === checksum) {
      return res.json(duty.toJSON());
    }

    duty.pdfAttachment = {
      fileId:     crypto.randomUUID(),
      filename:   filename || 'document.pdf',
      mimeType:   mimeType || 'application/pdf',
      size:       buffer.length,
      checksum,
      data:       buffer,
      uploadedAt: new Date(),
    };
    await duty.save();
    res.json(duty.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.getDutyPdf = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id).select('pdfAttachment');
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    const pdf = duty.pdfAttachment;
    if (!pdf?.data && !pdf?.storagePath) return res.status(404).json({ message: 'No file attached to this duty' });
    res.json({
      filename:    pdf.filename,
      mimeType:    pdf.mimeType || 'application/pdf',
      size:        pdf.size,
      fileId:      pdf.fileId,
    });
  } catch (err) {
    next(err);
  }
};

exports.streamDutyPdf = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id).select('pdfAttachment');
    if (!duty) return res.status(404).send('Duty not found');

    // New storage: binary in MongoDB
    if (duty.pdfAttachment?.data) {
      const { filename, mimeType, data } = duty.pdfAttachment;
      res.setHeader('Content-Type', mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename || 'document.pdf'}"`);
      res.setHeader('Content-Length', data.length);
      return res.send(data);
    }

    // Legacy storage: file is in Cloudinary — fetch via admin API and stream, then migrate
    const storagePath = duty.pdfAttachment?.storagePath;
    if (storagePath) {
      const signedUrl = cloudinary.utils.private_download_url(storagePath, '', {
        resource_type: 'raw',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        attachment: false,
      });

      return new Promise((resolve, reject) => {
        https.get(signedUrl, cloudRes => {
          if (cloudRes.statusCode >= 400) {
            res.status(502).send('Could not retrieve legacy file from storage');
            return resolve();
          }
          const chunks = [];
          cloudRes.on('data', c => chunks.push(c));
          cloudRes.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            const contentType = cloudRes.headers['content-type'] || 'application/pdf';
            const fname = duty.pdfAttachment.filename || 'document.pdf';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);

            // Migrate: store in MongoDB so next request skips Cloudinary
            try {
              duty.pdfAttachment.data = buffer;
              duty.pdfAttachment.mimeType = contentType;
              duty.pdfAttachment.size = buffer.length;
              if (!duty.pdfAttachment.fileId) duty.pdfAttachment.fileId = crypto.randomUUID();
              duty.pdfAttachment.checksum = crypto.createHash('md5').update(buffer).digest('hex');
              await duty.save();
            } catch (_) {}
            resolve();
          });
          cloudRes.on('error', reject);
        }).on('error', err => {
          res.status(502).send('Could not retrieve legacy file from storage');
          resolve();
        });
      });
    }

    return res.status(404).send('No file attached to this duty');
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
