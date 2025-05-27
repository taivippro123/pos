// components/ChatbotWidget.jsx
import React, { useState } from 'react';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleChat = () => setOpen(!open);

  const askAI = async () => {
    if (!question.trim()) {
      setError('Vui lòng nhập câu hỏi');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Log request details for debugging
      console.log('Sending request to:', `${API_URL}/ask-ai`);
      console.log('Question:', question);
      
      const res = await axios.post(
        `${API_URL}/ask-ai`, 
        { 
          question,
          context: window.location.pathname // Send current page context
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Add timeout and retry config
          timeout: 30000, // 30 second timeout
          validateStatus: function (status) {
            return status >= 200 && status < 300; // Only accept success status codes
          }
        }
      );
      
      console.log('Response received:', res.data);

      if (res.data && res.data.reply) {
        setResponse(res.data.reply);
        setQuestion(''); // Clear question after successful response
      } else {
        throw new Error('Không nhận được phản hồi từ AI');
      }
    } catch (err) {
      console.error('Error asking AI:', err);
      
      // More detailed error handling
      let errorMessage = 'Lỗi khi hỏi AI. Vui lòng thử lại sau.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.';
      } else if (err.response) {
        // Server responded with error
        switch (err.response.status) {
          case 401:
            errorMessage = 'Vui lòng đăng nhập lại để tiếp tục.';
            break;
          case 403:
            errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
            break;
          case 500:
            errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau.';
            break;
          default:
            errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      setError(errorMessage);
      setResponse(''); // Clear previous response on error
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="bg-white shadow-xl border border-gray-300 rounded-lg w-80 p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-sm">Trợ lý AI</h2>
            <button 
              onClick={toggleChat} 
              className="text-gray-500 hover:text-black p-1 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <div className="mb-2">
            <textarea
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              rows={3}
              placeholder="Nhập câu hỏi... (Nhấn Enter để gửi)"
              value={question}
              onChange={(e) => {
                setError(null);
                setQuestion(e.target.value);
              }}
              onKeyPress={handleKeyPress}
            />
            {error && (
              <div className="text-rose-600 text-xs mt-1 mb-2 p-2 bg-rose-50 border border-rose-200 rounded">
                {error}
              </div>
            )}
            <button
              onClick={askAI}
              className={`mt-2 w-full text-white text-sm py-2 rounded transition-all ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Gửi câu hỏi'}
            </button>
          </div>
          <div className={`text-sm p-3 rounded ${
            error 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            {response || 'AI sẽ trả lời tại đây'}
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg text-sm transition-all"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default ChatBot;
