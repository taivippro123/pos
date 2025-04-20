// src/components/PaymentSuccessTTS.jsx
import { useEffect } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Hàm chuyển số thành chữ tiếng Việt (tối ưu cho hàng nghìn)
const numberToVietnameseWords = (num) => {
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

  if (num === 0) return "không";

  let result = "";
  const thousands = Math.floor(num / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const tenUnits = num % 100;

  if (thousands > 0) {
    if (thousands < 10) {
      result += ones[thousands] + " nghìn ";
    } else {
      const t = Math.floor(thousands / 10);
      const o = thousands % 10;
      result += tens[t] + (o ? " " + ones[o] : "") + " nghìn ";
    }
  }

  if (hundreds > 0) {
    result += ones[hundreds] + " trăm ";
  }

  if (tenUnits > 0) {
    if (tenUnits < 10 && hundreds > 0) {
      result += "lẻ " + ones[tenUnits] + " ";
    } else {
      const t = Math.floor(tenUnits / 10);
      const o = tenUnits % 10;
      result += tens[t] + (o ? " " + ones[o] : "") + " ";
    }
  }

  return result.trim();
};

const speak = async (text) => {
  try {
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        input: { text },
        voice: { languageCode: "vi-VN", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" },
      }
    );

    const audio = new Audio("data:audio/mp3;base64," + response.data.audioContent);
    audio.play();
  } catch (error) {
    console.error("Google TTS Error:", error);
  }
};

const PaymentSuccessTTS = () => {
  useEffect(() => {
    const handlePaymentSuccess = (e) => {
      let rawAmount = e.detail?.amount;

      // 1. Làm sạch: ép kiểu int, bỏ phần thập phân nếu có
      let amount = parseInt(Number(rawAmount));

      // 2. Convert sang chữ
      const amountInWords = numberToVietnameseWords(amount);

      // 3. Ghép câu hoàn chỉnh
      const message = `Thanh toán thành công ${amountInWords} đồng`;

      // 4. Đọc
      speak(message);
    };

    window.addEventListener("payment_success", handlePaymentSuccess);

    return () => {
      window.removeEventListener("payment_success", handlePaymentSuccess);
    };
  }, []);

  return null; // không render gì cả
};

export default PaymentSuccessTTS;
