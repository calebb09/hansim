import axios from "axios";
import fs from "fs";
import Handlebars from "handlebars";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAIL_SERVICE_URL = process.env.CPANEL_EMAIL_URL;
const MAIL_SERVICE_SECRET = process.env.EMAIL_API_SECRET;
const TEMPLATE_FOLDER = path.resolve(__dirname, "../../templates/views");

function normalizeBcc(bcc) {
  if (!bcc) {
    return undefined;
  }

  if (Array.isArray(bcc)) {
    return bcc.filter(
      (email) => typeof email === "string" && email.trim().length,
    );
  }

  if (typeof bcc === "string") {
    const trimmed = bcc.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length);
    }
    return trimmed;
  }

  return undefined;
}

async function renderTemplate(templateName, context = {}) {
  if (!templateName || typeof templateName !== "string") {
    throw new Error("Template name must be a non-empty string");
  }

  const templatePath = path.join(TEMPLATE_FOLDER, `${templateName}.handlebars`);
  let source;

  try {
    source = await fs.promises.readFile(templatePath, "utf8");
  } catch (err) {
    throw new Error(
      `Unable to load template '${templateName}': ${err.message}`,
    );
  }

  try {
    const compiledTemplate = Handlebars.compile(source);
    return compiledTemplate(context);
  } catch (err) {
    throw new Error(
      `Failed to compile template '${templateName}': ${err.message}`,
    );
  }
}

async function sendEmail({to, subject, message, bcc, template, context}) {
  if (!message && !template) {
    return {
      success: false,
      error: "Email message or template is required",
    };
  }

  if (template) {
    try {
      message = await renderTemplate(template, context);
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  const payload = {
    token: MAIL_SERVICE_SECRET,
    to,
    subject,
    message,
  };

  const normalizedBcc = normalizeBcc(bcc);
  if (normalizedBcc) {
    payload.bcc = normalizedBcc;
  }

  try {
    const response = await axios.post(MAIL_SERVICE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    const data = response.data;
    if (data && data.success) {
      return {
        success: true,
        data,
      };
    }

    return {
      success: false,
      error: data?.error || "Unexpected response from mail service",
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        (error.response && error.response.data) ||
        error.message ||
        "Failed to send email",
    };
  }
}

function createNotification(notification) {
  if (
    !notification ||
    !notification.uuid ||
    !notification.title ||
    !notification.message
  ) {
    return Promise.reject(
      new Error("Notification must include uuid, title, and message"),
    );
  }

  return new Promise((resolve, reject) => {
    NotifiDal.create(notification, (err, doc) => {
      if (err) {
        return reject(err);
      }
      resolve(doc);
    });
  });
}

async function sendEmailAndNotify(options) {
  const {to, subject, message, bcc, template, context, notification} = options;
  const result = await sendEmail({
    to,
    subject,
    message,
    bcc,
    template,
    context,
  });
  if (!result.success) {
    return result;
  }

  if (notification) {
    try {
      const notificationPayload = {
        uuid: notification.uuid,
        title: notification.title,
        message: notification.message,
      };

      await createNotification(notificationPayload);
      result.notificationSaved = true;
    } catch (err) {
      result.notificationSaved = false;
      result.notificationError = err.message || err;
    }
  }

  return result;
}

export {
  sendEmail,
  sendEmailAndNotify,
  createNotification,
};
