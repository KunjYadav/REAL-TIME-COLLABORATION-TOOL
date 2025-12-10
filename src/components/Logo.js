import React from "react";
import { ReactComponent as ReactLogo } from "../logo.svg";
import "../Logo.css"; // Import the new CSS file

const Logo = ({ size = "60px", className = "" }) => {
  return (
    <div className={`logoContainer ${className}`}>
      <ReactLogo style={{ height: size, width: "auto" }} />
      <span className='logoText'>CodeSync</span>
    </div>
  );
};

export default Logo;
