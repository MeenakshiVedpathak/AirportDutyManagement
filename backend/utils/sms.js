const twilio = require('twilio');

const isConfigured =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER;

const formatPhone = phone => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
};

exports.sendOtpSms = async (phone, otp) => {
  if (!isConfigured) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return true;
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const formattedPhone = formatPhone(phone);
    await client.messages.create({
      body: `Your Airport Protocol OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    return true;
  } catch (err) {
    console.warn(`[SMS] Failed to send to ${phone}:`, err.message);
    return false;
  }
};
