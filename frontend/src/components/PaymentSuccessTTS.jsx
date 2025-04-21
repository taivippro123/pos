// src/components/PaymentSuccessTTS.jsx
import { useEffect } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const numberToVietnameseWords = (num) => {
    const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
  
    if (num === 0) return "không";
  
    const toWordsBelowThousand = (n) => {
      let result = "";
  
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
  
      if (hundred > 0) {
        result += ones[hundred] + " trăm ";
        if (remainder > 0 && ten === 0) result += "lẻ ";
      }
  
      if (ten > 1) {
        result += tens[ten] + (unit ? " " + ones[unit] : "");
      } else if (ten === 1) {
        result += "mười" + (unit ? " " + ones[unit] : "");
      } else if (ten === 0 && unit > 0) {
        result += ones[unit];
      }
  
      return result.trim();
    };
  
    let result = "";
    const million = Math.floor(num / 1_000_000);
    const thousand = Math.floor((num % 1_000_000) / 1_000);
    const belowThousand = num % 1_000;
  
    if (million > 0) {
      result += toWordsBelowThousand(million) + " triệu ";
    }
  
    if (thousand > 0) {
      result += toWordsBelowThousand(thousand) + " nghìn ";
    } else if (million > 0 && (belowThousand > 0 || thousand === 0)) {
      result += "không nghìn ";
    }
  
    if (belowThousand > 0) {
      result += toWordsBelowThousand(belowThousand);
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
