import React from 'react';
import toast from 'react-hot-toast';
import type { IDocument } from './types';

interface DocItemProps {
  document: IDocument;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const DocItem: React.FC<DocItemProps> = ({ document, onOpen, onDelete }) => {
  const hasUrl = !!document.url;

  const handleOpen = () => {
    if (!hasUrl) {
      toast('Dosya içeriği buluta yüklenmedi. Firebase Storage aktif olmadığı için bu doküman açılamıyor.', {
        icon: 'ℹ️',
        duration: 4000,
      });
      return;
    }
    onOpen(document.id);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-gray-900 font-medium text-sm truncate">{document.name}</h4>
          <p className="text-gray-500 text-xs mt-0.5">
            {formatBytes(document.size)} • {document.createdAt}
            {!hasUrl && (
              <span className="ml-2 text-amber-500">• Yalnızca kayıt</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasUrl && (
          <button
            onClick={handleOpen}
            className="cursor-pointer p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Aç"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(document.id)}
          className="cursor-pointer p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sil"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DocItem;
