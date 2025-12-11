import React from "react";
import { FileIcon } from "react-file-icon"; // Import FileIcon

// This function extracts the file extension or filename for the icon component
const getFileIconData = (fileName) => {
  const parts = fileName.split(".");
  let extension = "txt"; // Default extension for unknown files

  if (parts.length > 1) {
    // If there is an extension (e.g., 'index.js' -> 'js')
    extension = parts[parts.length - 1];
  } else if (fileName.includes("package.json")) {
    // Special case for 'package.json'
    extension = "json";
  }

  // The 'react-file-icon' component handles mapping this string to the correct icon.
  return extension;
};

const FileStructure = ({ files, activeFileId, onFileSelect }) => {
  const fileKeys = Object.keys(files || {});

  return (
    <div className='fileStructureWrap'>
      <div className='fileList'>
        {fileKeys.map((fileId) => {
          const extension = getFileIconData(fileId);

          return (
            <div
              key={fileId}
              className={`fileItem ${
                fileId === activeFileId ? "activeFile" : ""
              }`}
              onClick={() => onFileSelect(fileId)}
            >
              {/* Using the FileIcon component, passing only the extension */}
              <div className='fileIcon'>
                <FileIcon
                  extension={extension} // Use extension prop
                  size={16}
                  labelUppercase={false} // Prevents "JS" label for javascript files
                />
              </div>

              <span className='fileName'>{fileId}</span>

              <span className='remoteDot' title='Remote update'>
                {files[fileId] && files[fileId].remoteUpdated ? "●" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileStructure;
