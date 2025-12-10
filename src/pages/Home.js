/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from "react";
import { v4 as uuidV4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo"; // Import Logo component

const Home = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomId(id);
    toast.success("Created a new room");
  };

  const joinRoom = () => {
    // Check console log to confirm state values
    console.log(
      `Attempting to join Room: "${roomId}" with Username: "${username}"`
    );

    if (!roomId || !username) {
      toast.error("ROOM ID & username is required");
      return;
    }

    // Redirect
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };
  return (
    <div className='homePageWrapper'>
      <div className='formWrapper'>
        <Logo className='homePageLogo' size='80px' /> {/* Use Logo component */}
        <h4 className='mainLabel'>Paste invitation ROOM ID</h4>
        <div className='inputGroup'>
          <input
            type='text'
            className='inputBox'
            placeholder='ROOM ID'
            onChange={(e) => setRoomId(e.target.value)}
            value={roomId}
            onKeyUp={handleInputEnter}
          />
          <input
            type='text'
            className='inputBox'
            placeholder='USERNAME'
            onChange={(e) => setUsername(e.target.value)}
            value={username}
            onKeyUp={handleInputEnter}
          />
          <button className='btn joinBtn' onClick={joinRoom}>
            Join
          </button>
          <span className='createInfo'>
            If you don't have invite then Create &nbsp;
            {/* Using '#' in href to prevent full page reload */}
            <a onClick={createNewRoom} href='#' className='createNewBtn'>
              New Room
            </a>
          </span>
        </div>
      </div>
      <footer>
        <h4>
          Built with ❤️ by &nbsp;
          <a href='https://github.com/KunjYadav'>Kunj Yadav</a>
        </h4>
      </footer>
    </div>
  );
};

export default Home;
