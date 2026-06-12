"use strict";

import dotenv from "dotenv";
import {createRequire} from "module";

dotenv.config();

// For dynamic imports (like your firebase JSON)
const require = createRequire(import.meta.url);

const serviceAccount = require(`../../firebase/${process.env.FIREBASE}`);

const config = {
  CHAPA_URL: process.env.CHAPA_URL,
  CHAPA_SEC: process.env.CHAPA_SEC,
  CHAPA_WEBHOOK_HASH: process.env.CHAPA_WEBHOOK_HASH,
  rateConversionURL: process.env.CDIWORK_RATE_CONVERTER,
  firebase: {
    credential: serviceAccount,
  },
};

export default config;
