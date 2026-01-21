
import React from 'react';
import { Choice, Survivor } from '../types';

interface ChoiceCardProps {
  choice: Choice;
  onSelect: (choice: Choice) => void;
  disabled: boolean;
  influencer?: Survivor;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ choice, onSelect, disabled, influencer }) => {
  return (
    <button
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`group relative text-left p-8 transition-all duration-500 border-2 ${
        disabled 
        ? 'opacity-40 cursor-not-allowed border-stone-900' 
        : 'hover:border-stone-400 border-stone-800 bg-[#12100e] hover:bg-[#1a1714] shadow-xl hover:shadow-2xl hover:-translate-y-1'
      } rounded-sm overflow-hidden`}
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex flex-col flex-1">
          {choice.influencedBy && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500 font-bold medieval-font">
                ◈ Action led by {choice.influencedBy} ◈
              </span>
            </div>
          )}
          <h3 className="text-4xl font-bold medieval-font sepia-text group-hover:blood-text transition-colors tracking-wide">
            {choice.text}
          </h3>
        </div>
        
        {influencer?.portraitUrl && (
          <div className="w-16 h-16 border-2 border-amber-900/40 rounded-sm overflow-hidden flex-shrink-0 shadow-lg grayscale group-hover:grayscale-0 transition-all">
            <img src={influencer.portraitUrl} alt={influencer.name} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <p className="text-stone-300 text-xl mb-6 leading-relaxed font-serif italic">
        {choice.description}
      </p>

      <div className="pt-4 border-t border-stone-800/40">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-1 medieval-font">
          {influencer ? `${influencer.role}'s Insight:` : 'Outcome Portent:'}
        </p>
        <p className="text-base italic text-stone-400 font-serif leading-snug">
          {choice.hint}
        </p>
      </div>
      
      {/* Decorative medieval corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-stone-700 group-hover:border-stone-400 opacity-40"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-stone-700 group-hover:border-stone-400 opacity-40"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-stone-700 group-hover:border-stone-400 opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-stone-700 group-hover:border-stone-400 opacity-40"></div>

      {/* Specialty glow if influenced */}
      {choice.influencedBy && !disabled && (
        <div className="absolute inset-0 border border-amber-500/10 pointer-events-none group-hover:border-amber-500/20 transition-all"></div>
      )}
    </button>
  );
};

export default ChoiceCard;
