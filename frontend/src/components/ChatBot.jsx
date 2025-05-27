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
        <div className="bg-white shadow-xl border border-gray-300 rounded-lg w-96 flex flex-col h-[600px]">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-bold text-lg">Trợ lý AI</h2>
            <button 
              onClick={toggleChat}
              className="text-gray-500 hover:text-black p-1 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.type === 'error'
                      ? 'bg-rose-100 text-rose-600 border border-rose-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div 
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatBoldText(msg.content) }}
                  />
                  <div className={`text-xs mt-1 ${
                    msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="relative">
              <textarea
                className="w-full border rounded-lg p-3 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
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
                className={`absolute right-2 bottom-2 px-4 py-1 text-white text-sm rounded transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
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
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg text-sm transition-all"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default ChatBot;
