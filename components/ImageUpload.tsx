
import React, { useState, useCallback, DragEvent } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploadProps {
  onFileChange: (file: File | null) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onFileChange }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileChange = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileChange(file);
    } else {
      setPreview(null);
      onFileChange(null);
    }
  }, [onFileChange]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  return (
    <div>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer transition-colors
          ${isDragging ? 'border-accent bg-primary-bg' : 'border-accent/30 bg-primary-bg-light hover:border-accent/50'}`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input type="file" id="file-input" className="hidden" accept="image/*" onChange={handleInputChange} />
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover rounded-md" />
        ) : (
          <div className="text-center text-text-secondary">
            <UploadIcon className="mx-auto h-12 w-12 text-accent/50" />
            <p>Kéo & thả ảnh vào đây, hoặc nhấn để chọn</p>
          </div>
        )}
      </div>
    </div>
  );
};
