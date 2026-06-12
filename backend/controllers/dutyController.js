const Duty = require('../models/Duty');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/fcm');
const { uploadPdfToCloudinary, deletePdfFromCloudinary, generateSignedPdfUrl } = require('../utils/cloudinaryStorage');
const https = require('https');
const http = require('http');

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
    const { filename, data, mimeType } = req.body;
    console.log(`[uploadDutyPdf] duty=${req.params.id} filename=${filename} mimeType=${mimeType} dataLen=${data?.length}`);
    if (!data) return res.status(400).json({ message: 'No file data provided' });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
      return res.status(500).json({ message: 'PDF storage is not configured on this server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.' });
    const MAX_BYTES = 5 * 1024 * 1024;
    if (Math.round(data.length * 0.75) > MAX_BYTES)
      return res.status(400).json({ message: 'File exceeds the 5 MB limit' });
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    if (duty.pdfAttachment?.storagePath) {
      await deletePdfFromCloudinary(duty.pdfAttachment.storagePath);
    }

    const { url, publicId } = await uploadPdfToCloudinary(data, filename || 'document.pdf', req.params.id, mimeType);
    console.log(`[uploadDutyPdf] Cloudinary OK url=${url} publicId=${publicId}`);

    duty.pdfAttachment = {
      filename: filename || 'document.pdf',
      url,
      storagePath: publicId,
      uploadedAt: new Date(),
    };
    await duty.save();
    res.json(duty.toJSON());
  } catch (err) {
    console.error('[uploadDutyPdf] ERROR', err?.message);
    next(err);
  }
};

const fetchBuffer = (url) => new Promise((resolve, reject) => {
  const protocol = url.startsWith('https') ? https : http;
  protocol.get(url, (cloudRes) => {
    if (cloudRes.statusCode >= 300 && cloudRes.statusCode < 400 && cloudRes.headers.location) {
      cloudRes.resume();
      return fetchBuffer(cloudRes.headers.location).then(resolve, reject);
    }
    if (cloudRes.statusCode !== 200) {
      cloudRes.resume();
      return reject(Object.assign(new Error(`Storage fetch failed: ${cloudRes.statusCode}`), { statusCode: cloudRes.statusCode }));
    }
    const chunks = [];
    cloudRes.on('data', chunk => chunks.push(chunk));
    cloudRes.on('end', () => resolve(Buffer.concat(chunks)));
    cloudRes.on('error', reject);
  }).on('error', reject);
});

exports.getDutyPdf = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id).select('pdfAttachment');
    if (!duty) return res.status(404).json({ message: 'Duty not found' });
    if (!duty.pdfAttachment?.url) return res.status(404).json({ message: 'No PDF attached to this duty' });

    const filename = duty.pdfAttachment.filename || 'document.pdf';

    let publicId = duty.pdfAttachment.storagePath;
    if (!publicId) {
      const match = duty.pdfAttachment.url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      publicId = match ? match[1] : null;
    }

    if (publicId) {
      const { cloudinary } = require('../utils/cloudinaryStorage');
      // private_download_url embeds api_key+signature in the URL itself —
      // no Cloudinary account settings needed, bypasses all ACL restrictions
      const url = cloudinary.utils.private_download_url(
        publicId, '',
        { resource_type: 'raw', type: 'upload', expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
      return res.json({ url, filename });
    }

    return res.json({ url: duty.pdfAttachment.url, filename });
  } catch (err) {
    next(err);
  }
};

exports.streamDutyPdf = async (req, res, next) => {
  try {
    const duty = await Duty.findById(req.params.id).select('pdfAttachment');
    if (!duty) return res.status(404).send('Duty not found');
    if (!duty.pdfAttachment?.url) return res.status(404).send('No PDF attached');

    const filename = duty.pdfAttachment.filename || 'document.pdf';
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(filename);
    const contentType = isImage ? 'image/jpeg' : 'application/pdf';

    const { cloudinary } = require('../utils/cloudinaryStorage');
    let fetchUrl;
    if (duty.pdfAttachment.storagePath) {
      fetchUrl = cloudinary.utils.private_download_url(
        duty.pdfAttachment.storagePath, '', { resource_type: 'raw', type: 'upload', expires_at: Math.floor(Date.now() / 1000) + 300 }
      );
    } else {
      fetchUrl = duty.pdfAttachment.url;
    }
    const buffer = await fetchBuffer(fetchUrl);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
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
