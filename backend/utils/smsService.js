// Automated SMS Notifications (Ashiqur Rubbin Taleb Ayon)
//
// Sends real-time transactional SMS via Alpha SMS (sms.net.bd) — a
// Bangladeshi SMS gateway chosen over Twilio since it's built for
// Bangladeshi mobile numbers (what this app collects at registration)
// and gives free SMS credit after signup, unlike most alternatives.
//
// This is a plain HTTP GET API (no SDK needed):
//   https://api.sms.net.bd/sendsms?api_key={KEY}&msg={MSG}&to={NUMBER}
// Docs: https://sms.net.bd
//
// Configuration (see backend/.env.example):
//   ALPHA_SMS_API_URL, ALPHA_SMS_API_KEY
//
// Same fallback behavior as emailService.js: if ALPHA_SMS_API_KEY isn't
// set, messages are logged to the console instead of sent, so the app
// never breaks just because SMS credits/config aren't set up yet.

const API_URL = process.env.ALPHA_SMS_API_URL || "https://api.sms.net.bd/sendsms";
const API_KEY = process.env.ALPHA_SMS_API_KEY;

const isConfigured = !!API_KEY;

/**
 * Low-level send function. Never throws — logs and resolves instead, so a
 * failed/unconfigured SMS gateway never breaks the calling request.
 */
async function sendSMS(to, message) {
  if (!to) {
    console.warn("[smsService] Skipped send — recipient has no phone number.");
    return { sent: false, reason: "no-recipient" };
  }

  if (!isConfigured) {
    console.log(`[smsService] (Alpha SMS API key not configured — logging instead)\n  To: ${to}\n  Message: ${message}`);
    return { sent: false, reason: "not-configured" };
  }

  try {
    const params = new URLSearchParams({ api_key: API_KEY, msg: message, to });
    const res = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();

    if (data.error === 0) {
      return { sent: true, requestId: data.data?.request_id, response: data };
    }
    console.error(`[smsService] Alpha SMS rejected the request to ${to}:`, data.msg);
    return { sent: false, reason: "send-error", error: data.msg };
  } catch (err) {
    console.error(`[smsService] Failed to send SMS to ${to}:`, err.message);
    return { sent: false, reason: "send-error", error: err.message };
  }
}

/** SMS is opt-in (default false) since it costs money per message. */
function smsEnabled(user) {
  return user?.smsNotifications === true;
}

function routeLabel(trip) {
  return `${trip.departureDistrict} to ${trip.destinationDistrict}`;
}

function dateLabel(trip) {
  return new Date(trip.travelDate).toDateString();
}

// ---- Public notification helpers (mirrors emailService.js) ------------

async function sendWelcomeSMS(user) {
  if (!smsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendSMS(user.phone, `Welcome to Travel Bucket, ${user.username}! Your account is ready.`);
}

async function sendTripJoinedSMS(user, trip) {
  if (!smsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendSMS(user.phone, `Travel Bucket: You joined the trip ${routeLabel(trip)} on ${dateLabel(trip)}.`);
}

async function sendNewCompanionSMS(creator, trip, joiningUser) {
  if (!smsEnabled(creator)) return { sent: false, reason: "opted-out" };
  return sendSMS(creator.phone, `Travel Bucket: ${joiningUser.username} joined your trip ${routeLabel(trip)}.`);
}

async function sendTripLeftSMS(user, trip) {
  if (!smsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendSMS(user.phone, `Travel Bucket: You left the trip ${routeLabel(trip)}.`);
}

async function sendTripCancelledSMS(user, trip) {
  if (!smsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendSMS(user.phone, `Travel Bucket: Your trip ${routeLabel(trip)} on ${dateLabel(trip)} was cancelled.`);
}

async function sendGeneralSMS(user, message) {
  if (!smsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendSMS(user.phone, `Travel Bucket: ${message}`);
}

module.exports = {
  sendWelcomeSMS,
  sendTripJoinedSMS,
  sendNewCompanionSMS,
  sendTripLeftSMS,
  sendTripCancelledSMS,
  sendGeneralSMS,
};
