/**
 * One-time migration: move all PDFs from Cloudinary → MongoDB binary storage.
 *
 * Run once:  node backend/migrate-pdfs.js
 *
 * After it completes successfully, cloudinaryStorage.js and the Cloudinary
 * env vars are no longer needed and can be removed.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const https   = require('https');
const crypto  = require('crypto');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'application/pdf' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Use lean() so we get raw document fields even if not in current schema
  const Duty = mongoose.connection.collection('duties');
  const duties = await Duty.find({ 'pdfAttachment.storagePath': { $exists: true, $ne: '' } }).toArray();

  console.log(`Found ${duties.length} duties with Cloudinary PDFs`);
  if (duties.length === 0) {
    console.log('Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  let ok = 0, fail = 0;

  for (const duty of duties) {
    const storagePath = duty.pdfAttachment?.storagePath;
    if (!storagePath) continue;

    try {
      const signedUrl = cloudinary.utils.private_download_url(storagePath, '', {
        resource_type: 'raw',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        attachment: false,
      });

      const { buffer, contentType } = await fetchUrl(signedUrl);
      const checksum = crypto.createHash('md5').update(buffer).digest('hex');

      await Duty.updateOne(
        { _id: duty._id },
        {
          $set: {
            'pdfAttachment.data':       buffer,
            'pdfAttachment.mimeType':   contentType,
            'pdfAttachment.size':       buffer.length,
            'pdfAttachment.checksum':   checksum,
            'pdfAttachment.fileId':     duty.pdfAttachment.fileId || crypto.randomUUID(),
          },
          $unset: {
            'pdfAttachment.storagePath': '',
            'pdfAttachment.url':         '',
          },
        }
      );

      console.log(`✓ Migrated duty ${duty._id} (${(buffer.length / 1024).toFixed(1)} KB)`);
      ok++;
    } catch (err) {
      console.error(`✗ Failed duty ${duty._id}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} migrated, ${fail} failed`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
