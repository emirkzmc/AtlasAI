import React, { useRef, useState } from "react";

interface DocUploaderProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

const DocUploader: React.FC<DocUploaderProps> = ({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="w-full">
      <div
        className={`w-full border-2 border-[#403936] border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center py-10 px-4 text-center
          ${isUploading ? "pointer-events-none opacity-60" : ""}
          ${isDragging ? "border-[#998A85] bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <>
            <svg
              className="animate-spin w-10 h-10 text-[#403936] mb-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <p className="text-gray-600 font-medium text-sm mb-3">
              Yükleniyor... %{uploadProgress}
            </p>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <img
              src="/icons/cloud-icon.svg"
              alt="Upload Cloud"
              className="w-14 h-14 mb-4 opacity-75"
            />
            <h3 className="text-gray-800 font-medium text-lg mb-1">
              Doküman yüklemek için tıklayın veya sürükleyip bırakın
            </h3>
            <p className="text-gray-500 text-sm">
              PDF, PPTX, TXT, DOCX, JPG veya PNG formatlarında dosyalar desteklenir
            </p>
          </>
        )}
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.pptx,.txt,.docx,.doc,.jpg,.jpeg,.png"
          multiple
        />
      </div>
    </div>
  );
};

export default DocUploader;
