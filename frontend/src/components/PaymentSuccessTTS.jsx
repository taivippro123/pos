// src/components/PaymentSuccessTTS.jsx
import { useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

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
  

const PaymentSuccessTTS = () => {
  useEffect(() => {
    const handlePaymentSuccess = async (e) => {
      try {
        const rawAmount = e.detail?.amount;
        
        if (!rawAmount) {
          console.error("Missing amount in payment success event");
          return;
        }

        // Gọi API backend để xử lý TTS
        const response = await axios.post(`${API_URL}/api/tts/payment-success`, {
          amount: rawAmount
        });

        if (!response.data?.audioContent) {
          console.error("Missing audio content in response");
          return;
        }

        // Phát audio từ base64 string
        const audio = new Audio("data:audio/mp3;base64," + response.data.audioContent);
        
        // Xử lý lỗi phát audio
        audio.onerror = (error) => {
          console.error("Audio playback error:", error);
        };

        await audio.play().catch(error => {
          console.error("Failed to play audio:", error);
        });
        
      } catch (error) {
        // Log chi tiết lỗi
        console.error("Payment Success TTS Error:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
    };

    window.addEventListener("payment_success", handlePaymentSuccess);

    return () => {
      window.removeEventListener("payment_success", handlePaymentSuccess);
    };
  }, []);

  return null; // không render gì cả
};

export default PaymentSuccessTTS;
