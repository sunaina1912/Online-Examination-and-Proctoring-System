'use client'

import { cn } from '@/lib/utils'

interface Question {
  _id:     string
  text:    string
  type:    'mcq' | 'descriptive'
  options?: string[]
  marks:   number
}

interface QuestionCardProps {
  question:       Question
  index:          number
  selectedOption?: number
  textAnswer?:    string
  onSelect:       (option: number) => void
  onTextChange:   (text: string) => void
}

export function QuestionCard({
  question, index, selectedOption, textAnswer, onSelect, onTextChange
}: QuestionCardProps) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-300">
            {index + 1}
          </span>
          <p className="text-gray-100 text-base leading-relaxed">{question.text}</p>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-500 bg-surface-2 border border-surface-3 px-2 py-1 rounded-lg font-mono">
          {question.marks}m
        </span>
      </div>

      {question.type === 'mcq' && question.options && (
        <div className="grid gap-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={cn(
                'text-left w-full px-4 py-3 rounded-xl border text-sm transition-all duration-150',
                selectedOption === i
                  ? 'border-brand-500 bg-brand-500/20 text-brand-200'
                  : 'border-surface-3 bg-surface-2 text-gray-300 hover:border-brand-500/40 hover:bg-surface-3'
              )}
            >
              <span className={cn(
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-3 border',
                selectedOption === i
                  ? 'bg-brand-500 border-brand-400 text-white'
                  : 'border-surface-3 text-gray-500'
              )}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === 'descriptive' && (
        <textarea
          value={textAnswer ?? ''}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Type your answer here..."
          rows={5}
          className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/60 resize-none transition-colors"
        />
      )}
    </div>
  )
}
