
import React from 'react';
import type { DesignOption } from '../types';
import { CheckIcon } from './icons/CheckIcon';

interface ResultCardProps {
  option: DesignOption;
  title: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ option, title }) => {
  return (
    <div className="bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="p-6">
        <h3 className="text-2xl font-bold text-accent">{title}: {option.name}</h3>
      </div>
      <img src={option.imageBase64} alt={`Design option: ${option.name}`} className="w-full h-auto object-cover aspect-video" />
      <div className="p-6 flex-grow">
        <h4 className="text-lg font-semibold text-text-secondary mb-3">Mô tả thiết kế</h4>
        <div className="space-y-3 text-text-primary">
            {option.description.map((line, index) => <p key={index}>{line}</p>)}
        </div>
        <h4 className="text-lg font-semibold text-text-secondary mt-6 mb-3">Yếu Tố Chính</h4>
        <ul className="space-y-2">
          {option.keyElements.map((element, index) => (
            <li key={index} className="flex items-start">
              <CheckIcon className="h-5 w-5 text-accent mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-text-primary">{element}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
