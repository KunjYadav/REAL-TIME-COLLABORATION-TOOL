import React, { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

const Chat = ({ messages, sendMessage, username }) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  return (
    <div className='chatWrap'>
      <div className='chatHeader'>
        <h4>Room Chat</h4>
      </div>
      <div className='chatMessages'>
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            message={msg.message}
            username={msg.username}
            isLocal={msg.username === username} // Assuming unique usernames per session
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className='chatInputForm' onSubmit={handleSend}>
        <input
          type='text'
          className='inputBox chatInput'
          placeholder='Type a message...'
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button type='submit' className='btn sendBtn'>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
