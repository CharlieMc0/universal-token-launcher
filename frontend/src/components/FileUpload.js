import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const UploadContainer = styled.div`
  margin-bottom: 1rem;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4B5563;
  margin-bottom: 0.5rem;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.isDragActive ? '#6366F1' : '#E5E7EB'};
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  background-color: ${props => props.isDragActive ? '#EEF2FF' : '#F9FAFB'};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: #6366F1;
    background-color: #EEF2FF;
  }
`;

const UploadText = styled.p`
  margin: 0;
  color: #6B7280;
  font-size: 0.875rem;
`;

const HelperText = styled.p`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.error ? '#DC2626' : '#6B7280'};
`;

const FileInfo = styled.div`
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #F3F4F6;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FileName = styled.span`
  font-size: 0.875rem;
  color: #374151;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #DC2626;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;

  &:hover {
    color: #B91C1C;
  }
`;

const FileUpload = ({ 
  label, 
  id, 
  accept = ".csv", 
  helperText, 
  error, 
  onChange,
  onRemove 
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      onChange?.(droppedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      onChange?.(selectedFile);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <UploadContainer>
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <DropZone
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        isDragActive={isDragActive}
      >
        <UploadText>
          {isDragActive 
            ? 'Drop your CSV file here'
            : 'Drag and drop your CSV file here, or click to browse'
          }
        </UploadText>
      </DropZone>
      {file && (
        <FileInfo>
          <FileName>{file.name}</FileName>
          <RemoveButton onClick={handleRemove}>Remove</RemoveButton>
        </FileInfo>
      )}
      {(helperText || error) && (
        <HelperText error={error}>
          {error || helperText}
        </HelperText>
      )}
    </UploadContainer>
  );
};

export default FileUpload; 