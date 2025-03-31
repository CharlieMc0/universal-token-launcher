import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const UploadContainer = styled.div`
  margin-bottom: 24px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.$isDragActive ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  background-color: ${props => props.$isDragActive ? 'rgba(60, 157, 242, 0.1)' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--accent-primary);
    background-color: rgba(60, 157, 242, 0.05);
  }
`;

const UploadIcon = styled.div`
  margin-bottom: 16px;
  color: var(--text-secondary);
  svg {
    width: 32px;
    height: 32px;
  }
`;

const UploadText = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
`;

const HelperText = styled.p`
  margin-top: 6px;
  font-size: 12px;
  color: ${props => props.$error ? 'var(--error)' : 'var(--text-secondary)'};
`;

const PreviewContainer = styled.div`
  margin-top: 16px;
  display: flex;
  align-items: center;
  background-color: rgba(42, 42, 45, 0.5);
  border-radius: 8px;
  padding: 12px;
`;

const ImagePreview = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 16px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const PreviewInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const FileSize = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: rgba(255, 82, 82, 0.1);
  }
`;

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

const ImageUpload = ({ 
  label, 
  id, 
  accept = "image/png,image/jpeg,image/svg+xml", 
  helperText, 
  error, 
  onChange,
  onRemove 
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
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
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processImage(droppedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processImage(selectedFile);
    }
  };

  const processImage = (file) => {
    setImage(file);
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    onChange?.(file);
  };

  const handleRemove = () => {
    setImage(null);
    setPreview('');
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
      
      {!image ? (
        <DropZone
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          $isDragActive={isDragActive}
        >
          <UploadIcon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </UploadIcon>
          <UploadText>
            {isDragActive 
              ? 'Drop your image here'
              : 'Drag and drop your token icon, or click to browse'
            }
          </UploadText>
        </DropZone>
      ) : (
        <PreviewContainer>
          <ImagePreview>
            <img src={preview} alt="Token icon preview" />
          </ImagePreview>
          <PreviewInfo>
            <FileName>{image.name}</FileName>
            <FileSize>{formatFileSize(image.size)}</FileSize>
          </PreviewInfo>
          <RemoveButton onClick={handleRemove}>Remove</RemoveButton>
        </PreviewContainer>
      )}
      
      {(helperText || error) && (
        <HelperText $error={error}>
          {error || helperText}
        </HelperText>
      )}
    </UploadContainer>
  );
};

export default ImageUpload; 