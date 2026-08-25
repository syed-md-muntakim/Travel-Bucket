// Automated Email Notifications (Ashiqur Rubbin Taleb Ayon)
//
// Centralised email service used across the app: registration, joining a
// companion trip, leaving/cancelling a trip, and general "important travel
// information" announcements.
//
// Configuration (see backend/.env.example):
//   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
//
// If SMTP isn't configured yet, emails are logged to the console instead of
// sent — so register/join/cancel flows never break just because mail isn't
// set up on a teammate's machine.

const nodemailer = require("nodemailer");

let transporter = null;
const isConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false for 587/other
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "Travel Bucket <no-reply@travelbucket.app>";

/**
 * Low-level send function. Never throws — logs and resolves instead, so a
 * failed/unconfigured mail server never breaks the calling request.
 */
async function sendMail({ to, subject, html, text }) {
  if (!to) {
    console.warn("[emailService] Skipped send — recipient has no email address.");
    return { sent: false, reason: "no-recipient" };
  }

  if (!isConfigured) {
    console.log(`[emailService] (SMTP not configured — logging instead)\n  To: ${to}\n  Subject: ${subject}\n  Body: ${text || html}`);
    return { sent: false, reason: "not-configured" };
  }

  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html, text });
    return { sent: true };
  } catch (err) {
    console.error(`[emailService] Failed to send "${subject}" to ${to}:`, err.message);
    return { sent: false, reason: "send-error", error: err.message };
  }
}

/** Respects the user's emailNotifications preference (default true). */
function notificationsEnabled(user) {
  return user?.emailNotifications !== false;
}

function routeLabel(trip) {
  return `${trip.departureDistrict} to ${trip.destinationDistrict}`;
}

function dateLabel(trip) {
  return new Date(trip.travelDate).toDateString();
}

// ---- Public notification helpers -------------------------------------

// Triggered on successful registration (authController.registerUser)
async function sendWelcomeEmail(user) {
  if (!notificationsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: user.email,
    subject: "Welcome to Travel Bucket!",
    text: `Hi ${user.username}, your Travel Bucket account is ready. Time to plan your first trip!`,
    html: `<p>Hi <strong>${user.username}</strong>,</p>
           <p>Your Travel Bucket account has been created successfully.</p>
           <p>Time to plan your first trip!</p>`,
  });
}

// Triggered when a user successfully joins a companion trip
// (companionController.joinTrip)
async function sendTripJoinedEmail(user, trip) {
  if (!notificationsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: user.email,
    subject: "You're in! Companion trip confirmed",
    text: `Hi ${user.username}, you've successfully joined the companion trip from ${routeLabel(trip)} on ${dateLabel(trip)}.`,
    html: `<p>Hi <strong>${user.username}</strong>,</p>
           <p>You've successfully joined the companion trip from <strong>${routeLabel(trip)}</strong>
           on ${dateLabel(trip)}.</p>
           <p>Safe travels!</p>`,
  });
}

// Triggered when someone new joins a trip the recipient created
// (companionController.joinTrip — notifies the trip creator)
async function sendNewCompanionEmail(creator, trip, joiningUser) {
  if (!notificationsEnabled(creator)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: creator.email,
    subject: "New traveller joined your trip",
    text: `Hi ${creator.username}, ${joiningUser.username} just joined your companion trip from ${routeLabel(trip)} on ${dateLabel(trip)}.`,
    html: `<p>Hi <strong>${creator.username}</strong>,</p>
           <p><strong>${joiningUser.username}</strong> just joined your companion trip from
           <strong>${routeLabel(trip)}</strong> on ${dateLabel(trip)}.</p>`,
  });
}

// Triggered when a trip is cancelled (tripController.cancelTrip)
async function sendTripCancelledEmail(user, trip) {
  if (!notificationsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: user.email,
    subject: "Trip cancelled",
    text: `Hi ${user.username}, your trip from ${routeLabel(trip)} on ${dateLabel(trip)} has been cancelled.`,
    html: `<p>Hi <strong>${user.username}</strong>,</p>
           <p>Your trip from <strong>${routeLabel(trip)}</strong> on ${dateLabel(trip)} has been cancelled.</p>`,
  });
}

// Triggered when a user leaves a companion trip they'd joined
// (companionController.leaveTrip)
async function sendTripLeftEmail(user, trip) {
  if (!notificationsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: user.email,
    subject: "You left a companion trip",
    text: `Hi ${user.username}, you've left the companion trip from ${routeLabel(trip)} on ${dateLabel(trip)}. Your seat(s) are now free for others.`,
    html: `<p>Hi <strong>${user.username}</strong>,</p>
           <p>You've left the companion trip from <strong>${routeLabel(trip)}</strong> on ${dateLabel(trip)}.
           Your seat(s) are now free for others.</p>`,
  });
}

// General-purpose "important travel information" notification
// (weather alerts, admin announcements, etc.)
async function sendGeneralNotification(user, subject, message) {
  if (!notificationsEnabled(user)) return { sent: false, reason: "opted-out" };
  return sendMail({
    to: user.email,
    subject,
    text: message,
    html: `<p>Hi <strong>${user.username}</strong>,</p><p>${message}</p>`,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendTripJoinedEmail,
  sendNewCompanionEmail,
  sendTripCancelledEmail,
  sendTripLeftEmail,
  sendGeneralNotification,
};
