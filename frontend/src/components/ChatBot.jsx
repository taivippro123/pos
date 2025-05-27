// components/ChatbotWidget.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setOpen(!open);

  const askAI = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post('/ask-ai', { question });
      setResponse(res.data.reply);
    } catch (err) {
      setResponse('Lỗi khi hỏi AI');
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="bg-white shadow-xl border border-gray-300 rounded-lg w-80 p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-sm">Trợ lý AI</h2>
            <button onClick={toggleChat} className="text-gray-500 hover:text-black">✕</button>
          </div>
          <div className="mb-2">
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={3}
              placeholder="Nhập câu hỏi..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              onClick={askAI}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded"
              disabled={loading}
            >
              {loading ? 'Đang hỏi...' : 'Gửi'}
            </button>
          </div>
          <div className="bg-gray-100 text-sm p-2 rounded min-h-[60px]">
            {response || 'AI sẽ trả lời tại đây'}
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg text-sm"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default ChatBot;
