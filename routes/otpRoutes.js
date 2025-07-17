import express from "express";
import axios from "axios";
import qs from "qs";

const router = express.Router();

const OTP_SERVICE_BASE = `${process.env.OTP_API_DOMAIN}/${process.env.OTP_API_APP_GUID}/${process.env.OTP_API_SERV_GUID}`;
const SYSTEM_NAME = process.env.OTP_API_SYSTEM_NAME;

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email lipsă." });
  }

  try {
    const data = qs.stringify({
      system: SYSTEM_NAME,
      destType: "email",
      destination: email,
      langId: 1,
      expiresMin: 5,
      length: 6,
      chars: "0123456789",
    });

    const response = await axios.post(
      `${OTP_SERVICE_BASE}/initiateValidationWithOTP`,
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { resultCode, resultText } = response.data;

    switch (resultCode) {
      case 0:
        return res.json({ success: true, message: "OTP trimis cu succes." });

      case 1:
        return res.status(400).json({
          success: false,
          message: "Destinație invalidă (email greșit).",
          code: resultCode,
        });

      case -2:
        return res.status(400).json({
          success: false,
          message: "Parametri invalizi trimiși la server OTP.",
          code: resultCode,
        });

      case -1:
        return res.status(500).json({
          success: false,
          message: "Eroare internă în serviciul OTP (crash).",
          code: resultCode,
        });

      default:
        return res.status(500).json({
          success: false,
          message: resultText || "Eroare necunoscută.",
          code: resultCode,
        });
    }
  } catch (err) {
    console.error("OTP Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Eroare la comunicarea cu serviciul OTP.",
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: "Email sau OTP lipsă.",
    });
  }
  try {
    const data = qs.stringify({
      system: SYSTEM_NAME,
      destType: "email",
      destination: email,
      otp: code,
    });

    const response = await axios.post(
      `${OTP_SERVICE_BASE}/confirmValidationWithOTP`,
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { resultCode, resultText, status } = response.data;

    switch (resultCode) {
      case 0:
        switch (status) {
          case 1:
            return res.json({ success: true, message: "OTP valid." });
          case 0:
            return res.status(400).json({
              success: false,
              message: "OTP invalid.",
              code: status,
            });
          case -1:
            return res.status(400).json({
              success: false,
              message: "OTP expirat.",
              code: status,
            });
          default:
            return res.status(500).json({
              success: false,
              message: `Status necunoscut OTP: ${status}`,
              code: status,
            });
        }

      case 1:
        return res.status(400).json({
          success: false,
          message: "Destinație invalidă (email greșit).",
          code: resultCode,
        });

      case -2:
        return res.status(400).json({
          success: false,
          message: "Parametri invalizi trimiși la server OTP.",
          code: resultCode,
        });

      case -1:
        return res.status(500).json({
          success: false,
          message: "Eroare internă în serviciul OTP (crash).",
          code: resultCode,
        });

      default:
        return res.status(500).json({
          success: false,
          message: resultText || "Eroare necunoscută.",
          code: resultCode,
        });
    }
  } catch (err) {
    console.error("Validate OTP Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Eroare la validare OTP.",
    });
  }
});

export default router;