import React from 'react';
import type { IDocument } from './types';
import DocItem from './DocItem';

interface DocListProps {
  documents: IDocument[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const DocList: React.FC<DocListProps> = ({ 
  documents, 
  searchQuery, 
  onSearchChange, 
  onOpen, 
  onDelete 
}) => {
  return (
    <div className="flex flex-col w-full mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h2 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          Yüklenen Dokümanlar
          <span className="bg-[#998A85] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {documents.length}
          </span>
        </h2>
        
        <div className="relative w-full sm:w-64">
          <input 
            type="text" 
            placeholder="Doküman ara..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <svg 
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        {documents.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">
            {searchQuery ? 'Aramanızla eşleşen doküman bulunamadı.' : 'Henüz doküman yüklenmemiş.'}
          </div>
        ) : (
          documents.map(doc => (
            <DocItem 
              key={doc.id} 
              document={doc} 
              onOpen={onOpen} 
              onDelete={onDelete} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DocList;
