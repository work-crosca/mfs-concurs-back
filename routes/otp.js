import express from "express";
import axios from "axios";
import qs from "qs";

const router = express.Router();

const OTP_SERVICE_BASE = `${process.env.OTP_API_DOMAIN}/rest/${process.env.OTP_API_SERV_GUID}/${process.env.OTP_API_APP_GUID}`;
const SYSTEM_NAME = process.env.OTP_API_SYSTEM_NAME;

// langId [1 - ro, 2 - ru]
const allowedLangIds = [1, 2];

// Helper function to log request details
const logRequestDetails = (endpoint, req) => {
  console.log(`\n========== ${endpoint} REQUEST ==========`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`IP: ${req.ip}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Body:`, JSON.stringify(req.body, null, 2));
  console.log(`========================================\n`);
};

// Helper function to log response details
const logResponseDetails = (endpoint, response) => {
  console.log(`\n========== ${endpoint} RESPONSE ==========`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Status: ${response.status}`);
  console.log(`Status Text: ${response.statusText}`);
  console.log(`Headers:`, JSON.stringify(response.headers, null, 2));
  console.log(`Data:`, JSON.stringify(response.data, null, 2));
  console.log(`=========================================\n`);
};

// Helper function to log error details
const logErrorDetails = (endpoint, error) => {
  console.error(`\n========== ${endpoint} ERROR ==========`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Message: ${error.message}`);
  if (error.response) {
    console.error(`Response Status: ${error.response.status}`);
    console.error(
      `Response Headers:`,
      JSON.stringify(error.response.headers, null, 2)
    );
    console.error(
      `Response Data:`,
      JSON.stringify(error.response.data, null, 2)
    );
  }
  if (error.config) {
    console.error(`Request URL: ${error.config.url}`);
    console.error(`Request Method: ${error.config.method}`);
    console.error(
      `Request Headers:`,
      JSON.stringify(error.config.headers, null, 2)
    );
    console.error(`Request Data: ${error.config.data}`);
  }
  console.error(`Stack Trace:`, error.stack);
  console.error(`=======================================\n`);
};

router.post("/send-otp", async (req, res) => {
  // Log incoming request
  logRequestDetails("SEND-OTP", req);

  const { email, langId } = req.body;

  if (!email) {
    const errorResponse = { success: false, message: "Missing email." };
    console.log(
      `SEND-OTP Response (400):`,
      JSON.stringify(errorResponse, null, 2)
    );
    return res.status(400).json(errorResponse);
  }

  const lang = allowedLangIds.includes(Number(langId)) ? Number(langId) : 1;

  try {
    const data = qs.stringify({
      system: SYSTEM_NAME,
      destType: "email",
      destination: email,
      langId: lang,
      expiresMin: 5,
      length: 6, 
      chars: "0123456789",
    });

    console.log(`\n========== SEND-OTP OUTGOING REQUEST ==========`);
    console.log(`URL: ${OTP_SERVICE_BASE}/initiateValidationWithOTP`);
    console.log(`Method: POST`);
    console.log(
      `Headers:`,
      JSON.stringify(
        { "Content-Type": "application/x-www-form-urlencoded" },
        null,
        2
      )
    );
    console.log(`Data (stringified):`, data);
    console.log(
      `Data (parsed):`,
      JSON.stringify(
        {
          system: SYSTEM_NAME,
          destType: "email",
          destination: email,
          langId: lang,
          expiresMin: 5,
          length: 6,
          chars: "0123456789",
        },
        null,
        2
      )
    );
    console.log(`==============================================\n`);

    const response = await axios.post(
      `${OTP_SERVICE_BASE}/initiateValidationWithOTP`,
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Log OTP service response
    logResponseDetails("SEND-OTP OTP-SERVICE", response);

    const { resultCode, resultText } = response.data;

    let apiResponse;
    let statusCode;

    switch (resultCode) {
      case 0:
        apiResponse = { success: true, message: "OTP sent successfully." };
        statusCode = 200;
        break;

      case 1:
        apiResponse = {
          success: false,
          message: "Invalid destination (wrong email).",
          code: resultCode,
        };
        statusCode = 400;
        break;

      case -2:
        apiResponse = {
          success: false,
          message: "Invalid parameters sent to OTP server.",
          code: resultCode,
        };
        statusCode = 400;
        break;

      case -1:
        apiResponse = {
          success: false,
          message: "Internal error in the OTP service.",
          code: resultCode,
        };
        statusCode = 500;
        break;

      default:
        apiResponse = {
          success: false,
          message: resultText || "Unknown error.",
          code: resultCode,
        };
        statusCode = 500;
    }

    console.log(
      `SEND-OTP API Response (${statusCode}):`,
      JSON.stringify(apiResponse, null, 2)
    );
    return res.status(statusCode).json(apiResponse);
  } catch (err) {
    logErrorDetails("SEND-OTP", err);

    const errorResponse = {
      success: false,
      message: "Error communicating with the OTP service.",
    };
    console.log(
      `SEND-OTP Error Response (500):`,
      JSON.stringify(errorResponse, null, 2)
    );
    return res.status(500).json(errorResponse);
  }
});

router.post("/verify-otp", async (req, res) => {
  // Log incoming request
  logRequestDetails("VERIFY-OTP", req);

  const { email, code } = req.body;

  if (!email || !code) {
    const errorResponse = {
      success: false,
      message: "Missing email or OTP.",
    };
    console.log(
      `VERIFY-OTP Response (400):`,
      JSON.stringify(errorResponse, null, 2)
    );
    return res.status(400).json(errorResponse);
  }

  try {
    const data = qs.stringify({
      system: SYSTEM_NAME,
      destType: "email",
      destination: email,
      otp: code,
    });

    console.log(`\n========== VERIFY-OTP OUTGOING REQUEST ==========`);
    console.log(`URL: ${OTP_SERVICE_BASE}/confirmValidationWithOTP`);
    console.log(`Method: POST`);
    console.log(
      `Headers:`,
      JSON.stringify(
        { "Content-Type": "application/x-www-form-urlencoded" },
        null,
        2
      )
    );
    console.log(`Data (stringified):`, data);
    console.log(
      `Data (parsed):`,
      JSON.stringify(
        {
          system: SYSTEM_NAME,
          destType: "email",
          destination: email,
          otp: code,
        },
        null,
        2
      )
    );
    console.log(`===============================================\n`);

    const response = await axios.post(
      `${OTP_SERVICE_BASE}/confirmValidationWithOTP`,
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Log OTP service response
    logResponseDetails("VERIFY-OTP OTP-SERVICE", response);

    const { resultCode, resultText, status } = response.data;

    let apiResponse;
    let statusCode;

    switch (resultCode) {
      case 0:
        switch (status) {
          case 1:
            apiResponse = { success: true, message: "OTP valid." };
            statusCode = 200;
            break;
          case 0:
            apiResponse = {
              success: false,
              message: "OTP invalid.",
              code: status,
            };
            statusCode = 400;
            break;
          case -1:
            apiResponse = {
              success: false,
              message: "OTP expired.",
              code: status,
            };
            statusCode = 400;
            break;
          default:
            apiResponse = {
              success: false,
              message: `Unknown status OTP: ${status}`,
              code: status,
            };
            statusCode = 500;
        }
        break;

      case 1:
        apiResponse = {
          success: false,
          message: "Invalid destination (wrong email).",
          code: resultCode,
        };
        statusCode = 400;
        break;

      case -2:
        apiResponse = {
          success: false,
          message: "Invalid parameters sent to OTP server.",
          code: resultCode,
        };
        statusCode = 400;
        break;

      case -1:
        apiResponse = {
          success: false,
          message: "Internal error in the OTP service.",
          code: resultCode,
        };
        statusCode = 500;
        break;

      default:
        apiResponse = {
          success: false,
          message: resultText || "Unknown error.",
          code: resultCode,
        };
        statusCode = 500;
    }

    console.log(
      `VERIFY-OTP API Response (${statusCode}):`,
      JSON.stringify(apiResponse, null, 2)
    );
    return res.status(statusCode).json(apiResponse);
  } catch (err) {
    logErrorDetails("VERIFY-OTP", err);

    const errorResponse = {
      success: false,
      message: "OTP validation error.",
    };
    console.log(
      `VERIFY-OTP Error Response (500):`,
      JSON.stringify(errorResponse, null, 2)
    );
    return res.status(500).json(errorResponse);
  }
});

export default router;
