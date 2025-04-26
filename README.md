# REAL-TIME-COLLABORATION-TOOL

*COMPANY*: CODTECH IT SOLUTIONS

*NAME*: KUNJ BIHARI YADAV

*Intern ID*: CT04DK89

*DOMAIN*: MERN STACK WEB DEVELOPMENT

*DURATION*: 4 WEEKS

*MENTOR*: NEELA SANTHOSH


## Description of Task 3

A collaborative real-time code editor built with React, Socket.IO, and Codemirror. This application allows multiple users to join a room and edit code together in real time. The app is deployed on Vercel.



# OUTPUT

![Logo](https://github.com/user-attachments/assets/644c46a0-94d8-4710-ac0a-fcd57b589aee)

![Screenshot 1](https://github.com/user-attachments/assets/0f7d5a9b-1f67-4a15-b09f-e13555e9c1db)



## Features

- **Real-Time Collaboration**: Multiple users can edit the same code simultaneously.
- **Room-Based Collaboration**: Create or join rooms using unique Room IDs.
- **Code Synchronization**: Changes are instantly synchronized across all connected clients.
- **User Avatars**: Display connected users with avatars.
- **Error Handling**: Notifications for connection issues or user actions.
- **Responsive UI**: Built with a clean and responsive design.

## Tech Stack

- **Frontend**: React, Codemirror, React Router, React Hot Toast
- **Backend**: Node.js, Express, Socket.IO
- **Styling**: CSS with Monokai theme for the editor
- **Utilities**: UUID for generating unique Room IDs

## Deployment
-The Let's Talk chat app is deployed on Vercel. 
**[Live Demo](https://real-time-collaboration-tool-iota.vercel.app/)**


## Getting Started

### Prerequisites

- Node.js and npm installed on your system.


## Installation

1. Clone the repository:
     ```bash
          git clone https://github.com/KunjYadav/REAL-TIME-COLLABORATION-TOOL.git
          cd REAL-TIME-COLLABORATION-TOOL
     ```

2. Install dependencies:
     ```bash
          npm install
     ```

3. Create a .env file in the root directory and add the following:
     ```bash
          PORT=3000
          REACT_APP_BACKEND_URL=http://localhost:5000
     ```

## Running the Application

1. Start the development server:
     ```bash
          npm run start:front
     ```
2. Start the backend server:
     ```bash
          npm run server:dev
     ```
3. Open your browser and navigate to http://localhost:3000.



## Building for Production

To build the application for production, run:

     npm run build
