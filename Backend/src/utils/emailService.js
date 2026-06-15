const { Resend } = require('resend');

let resend;
function getResend() {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    console.log('[EmailService] RESEND_API_KEY:', key ? key.substring(0, 8) + '...' : 'NOT SET');
    resend = new Resend(key);
  }
  return resend;
}

const FROM = 'Obsidian Gateway <onboarding@resend.dev>';

const sendBackendDownEmail = async (email, target, apiKey) => {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: '🔴 Backend Instance Down — Obsidian Gateway',
      html: `
        <h2>A backend instance is down</h2>
        <p>Your gateway <strong>${apiKey}</strong> cannot reach:</p>
        <p><code>${target}</code></p>
        <p>Traffic is being rerouted to healthy instances if available.</p>
        <p>Please check your server.</p>
      `
    });
  } catch (err) {
    console.error('Failed to send backend down email:', err.message);
  }
};

const sendBackendUpEmail = async (email, target, apiKey) => {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: '🟢 Backend Instance Recovered — Obsidian Gateway',
      html: `
        <h2>Your backend is back online</h2>
        <p>Instance <code>${target}</code> on gateway <strong>${apiKey}</strong> is responding normally again.</p>
      `
    });
  } catch (err) {
    console.error('Failed to send backend up email:', err.message);
  }
};

const sendQuotaWarningEmail = async (email, percent, plan) => {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `⚠️ You've used ${percent}% of your monthly quota`,
      html: `
        <h2>Quota Warning</h2>
        <p>You've used <strong>${percent}%</strong> of your ${plan} plan monthly request limit.</p>
        <p>Consider upgrading to avoid service interruption.</p>
      `
    });
  } catch (err) {
    console.error('Failed to send quota warning email:', err.message);
  }
};

const sendQuotaExceededEmail = async (email, plan) => {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: '🚫 Monthly Request Limit Reached — Obsidian Gateway',
      html: `
        <h2>Request Limit Reached</h2>
        <p>Your ${plan} plan limit has been reached for this month.</p>
        <p>Your gateway requests are currently being blocked.</p>
        <p>Upgrade your plan to restore service immediately.</p>
      `
    });
  } catch (err) {
    console.error('Failed to send quota exceeded email:', err.message);
  }
};

const sendRateLimitEmail = async (email, path, limit) => {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `🚫 Rate Limit Reached on ${path} — Obsidian Gateway`,
      html: `
        <h2>Route Rate Limit Exceeded</h2>
        <p>Your route <code>${path}</code> has exceeded its limit of <strong>${limit} requests per minute</strong>.</p>
        <p>Additional requests to this route are being blocked until the window resets.</p>
        <p>Consider increasing the rate limit for this route in your gateway settings.</p>
      `
    });
    console.log('[EmailService] Rate limit email sent to', email);
  } catch (err) {
    console.error('[EmailService] Failed to send rate limit email:', err.message);
  }
};

module.exports = { sendBackendDownEmail, sendBackendUpEmail, sendQuotaWarningEmail, sendQuotaExceededEmail, sendRateLimitEmail };