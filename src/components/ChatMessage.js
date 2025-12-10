import React from "react";
import Avatar from "react-avatar";

const ChatMessage = ({ message, username, isLocal }) => {
  const alignClass = isLocal ? "chatMessageLocal" : "chatMessageRemote";

  return (
    <div className={`chatMessage ${alignClass}`}>
      <div className='chatAvatar'>
        <Avatar name={username} size={30} round='50%' />
      </div>
      <div className='chatContent'>
        <div className='chatUsername'>{username}</div>
        <div className='chatText'>{message}</div>
      </div>
    </div>
  );
};

export default ChatMessage;
