import axios from "axios";
import config from "../config/index.js";
import https from "https";
import forge from "node-forge";
import request from "request";

const agent = new https.Agent({
  rejectUnauthorized: false, // 👈 disables SSL cert check
});

export const currencyConvert = async () => {
  try {
    const response = await axios.get(
      `${config.rateConversionURL}?source=USD&target=ETB`,
      {httpsAgent: agent}
    );
    return {
      status: response.data.status,
      data: response.data.data,
    };
  } catch (error) {
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
      log: error,
    };
  }
};

export const createPayment = async (
  amount,
  currency,
  email,
  first_name,
  last_name,
  phone_number,
  tx_ref,
  title,
  description,
  logo
) => {
  try {
    const response = await axios.post(
      `${config.CHAPA_URL}/transaction/initialize`,
      {
        amount,
        currency,
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        callback_url: process.env.CHAPA_CALLBACK_URL,
        customization: {title, description, logo},
      },
      {
        headers: {
          Authorization: `Bearer ${config.CHAPA_SEC}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {status: 200, data: response.data};
  } catch (error) {
    console.error(
      "Chapa Payment Error:",
      error.response ? error.response.data : error.message
    );
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
    };
  }
};

export const verifyPayment = async (tx_ref) => {
  try {
    const response = await axios.get(
      `${config.CHAPA_URL}/transaction/verify/${tx_ref}`,
      {headers: {Authorization: `Bearer ${config.CHAPA_SEC}`}}
    );

    return {status: 200, data: response.data};
  } catch (error) {
    console.error(
      "Chapa Verification Error:",
      error.response ? error.response.data : error.message
    );
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
    };
  }
};

export const createCharge = async (inputs, payment_method) => {
  try {
    const postData = JSON.stringify(inputs);

    const options = {
      method: "POST",
      hostname: "api.chapa.co",
      path: `/v1/charges?type=${payment_method}`,
      headers: {
        Authorization: `Bearer ${config.CHAPA_SEC}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    return new Promise((resolve, reject) => {
      const attemptRequest = (retries) => {
        const req = https.request(options, (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            try {
              console.log("Raw response from Chapa:", responseData);
              const responseJson = JSON.parse(responseData);
              if (responseJson.status === "failed" && retries > 0) {
                console.log(`Retrying request (${3 - retries}/3)...`);
                attemptRequest(retries - 1);
              } else {
                resolve(responseJson);
              }
            } catch (error) {
              reject({status: 500, error: "Invalid JSON response"});
            }
          });
        });

        req.on("error", (error) => {
          console.error("Request Error:", error);
          if (retries > 0) {
            console.log(`Retrying request (${3 - retries}/3)...`);
            setTimeout(() => attemptRequest(retries - 1), 3000);
          } else {
            reject({
              status: 500,
              error: "Request failed after 3 attempts. Please try again.",
            });
          }
        });

        req.write(postData);
        req.end();
      };

      attemptRequest(3);
    });
  } catch (error) {
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
    };
  }
};

export const transferChapa = async (
  account_name,
  account_number,
  amount,
  currency,
  bank_code,
  reference
) => {
  const options = {
    method: "POST",
    url: `${config.CHAPA_URL}/transfers`,
    headers: {
      Authorization: `Bearer ${config.CHAPA_SEC}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_name,
      account_number,
      amount,
      currency,
      bank_code,
      reference,
    }),
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) reject(new Error(error));
      else resolve(response.body);
    });
  });
};

export const tranferLists = async () => {
  try {
    const response = await axios.get(`${config.CHAPA_URL}/transfers`, {
      headers: {Authorization: `Bearer ${config.CHAPA_SEC}`},
    });
    return {status: 200, data: response.data};
  } catch (error) {
    console.error(
      "Chapa Verification Error:",
      error.response ? error.response.data : error.message
    );
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
    };
  }
};

export const bankLists = async () => {
  try {
    const response = await axios.get(`${config.CHAPA_URL}/banks`, {
      headers: {Authorization: `Bearer ${config.CHAPA_SEC}`},
    });
    return {status: 200, data: response.data};
  } catch (error) {
    console.error(
      "Chapa Verification Error:",
      error.response ? error.response.data : error.message
    );
    return {
      status: 500,
      error: error.response ? error.response.data : error.message,
    };
  }
};

export const validate = async (client, reference, payment_type) => {
  const options = {
    method: "POST",
    url: `${config.CHAPA_URL}/validate?type=${payment_type}`,
    headers: {Authorization: `Bearer ${config.CHAPA_SEC}`},
    formData: {reference, client},
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        console.error("Chapa Verification Error:", error.message);
        return reject({status: 500, error: error.message});
      }

      try {
        const data = JSON.parse(response.body);
        return resolve({status: "ok", statusCode: 200, data});
      } catch (e) {
        return reject({
          status: 500,
          message: e.response ? e.response.data : e.message,
          error: e,
        });
      }
    });
  });
};

export const reverseChapaPayment = async (refId, reason) => {
  try {
    const response = await axios.post(
      `${config.CHAPA_URL}/transaction/refund/${refId}`,
      {reason},
      {headers: {Authorization: `Bearer ${config.CHAPA_SEC}`}}
    );
    return response.data;
  } catch (err) {
    console.error("Refund failed:", err.response?.data || err.message);
    return {status: 500, error: err.response?.data || err.message};
  }
};

export function encrypt(encryptionKey, payload) {
  const text = JSON.stringify(payload);

  if (![16, 24].includes(encryptionKey.length)) {
    throw new Error(
      `3DES key must be 16 or 24 characters long. Current: ${encryptionKey.length}`
    );
  }

  const cipher = forge.cipher.createCipher(
    "3DES-ECB",
    forge.util.createBuffer(encryptionKey, "raw")
  );
  cipher.start({iv: ""});
  cipher.update(forge.util.createBuffer(text, "utf8"));
  cipher.finish();
  return forge.util.encode64(cipher.output.getBytes());
}
