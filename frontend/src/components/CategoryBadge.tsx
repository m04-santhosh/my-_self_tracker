import React from 'react';
import { Category } from '../types';

const categoryStyles: Record<Category, { bg: string; text: string; border: string }> = {
  mind: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  body: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  career: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  money: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  life: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  discipline: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

export const CategoryBadge: React.FC<{ category: Category; size?: 'sm' | 'md' }> = ({
  category,
  size = 'md',
}) => {
  const style = categoryStyles[category] || categoryStyles.discipline;
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border capitalize ${style.bg} ${style.text} ${style.border} ${padding}`}
    >
      {category}
    </span>
  );
};
