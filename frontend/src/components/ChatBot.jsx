// components/ChatbotWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;

const formatBoldText = (text) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => setOpen(!open);

  const askAI = async () => {
    if (!question.trim()) {
      setError('Vui lòng nhập câu hỏi');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Add user message immediately
    const userMessage = {
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuestion(''); // Clear input immediately after sending
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `${API_URL}/ask-ai`, 
        { 
          question,
          context: window.location.pathname
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        }
      );
      
      if (res.data && res.data.reply) {
        // Add AI response to messages
        const aiMessage = {
          type: 'ai',
          content: res.data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('Không nhận được phản hồi từ AI');
      }
    } catch (err) {
      console.error('Error asking AI:', err);
      
      let errorMessage = 'Lỗi khi hỏi AI. Vui lòng thử lại sau.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.';
      } else if (err.response) {
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
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      setError(errorMessage);
      
      // Add error message to chat
      const errorMsg = {
        type: 'error',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
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

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="bg-white shadow-md border-[3px] border-gray-200 rounded-2xl w-96 flex flex-col h-[600px] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-4 bg-white border-b border-gray-100">
            <h2 className="font-semibold text-lg text-gray-800">Trợ lý AI</h2>
            <button 
              onClick={toggleChat}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-50 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.type === 'error'
                      ? 'bg-rose-50 text-rose-500 border border-rose-200'
                      : 'bg-white text-gray-700 border border-gray-100'
                  }`}
                >
                  <div 
                    className="text-sm whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatBoldText(msg.content) }}
                  />
                  <div className={`text-xs mt-1.5 ${
                    msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-300">
            <div className="relative">
              <textarea
                className="w-full border-[1.5px] border-gray-300 rounded-xl p-3 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none bg-gray-50"
                rows={2}
                placeholder="Nhập câu hỏi... (Nhấn Enter để gửi)"
                value={question}
                onChange={(e) => {
                  setError(null);
                  setQuestion(e.target.value);
                }}
                onKeyPress={handleKeyPress}
              />
              <button
                onClick={askAI}
                disabled={loading}
                className={`absolute right-2 bottom-2 px-4 py-1.5 text-white text-sm rounded-lg transition-all shadow-sm ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {loading ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-full shadow-md text-lg transition-all hover:scale-110 border-2 border-white"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default ChatBot;
