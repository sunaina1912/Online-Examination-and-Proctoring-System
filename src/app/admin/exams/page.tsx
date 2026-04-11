'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, ToggleLeft, ToggleRight, X, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  _id?:          string
  text:          string
  type:          'mcq' | 'descriptive'
  options:       string[]
  correctAnswer: number
  marks:         number
}

interface ExamForm {
  title:          string
  description:    string
  duration:       number
  totalMarks:     number
  passingMarks:   number
  negativeMarking: boolean
  randomize:      boolean
  questions:      Question[]
}

const EMPTY_FORM: ExamForm = {
  title: '', description: '', duration: 60, totalMarks: 100, passingMarks: 40,
  negativeMarking: false, randomize: true, questions: [],
}

const EMPTY_Q: Question = { text: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }

export default function ExamsPage() {
  const [exams, setExams]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState<ExamForm>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    const res  = await fetch('/api/exams')
    const data = await res.json()
    setExams(data.exams ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true) }
  const openEdit   = (exam: any) => {
    setForm({
      title: exam.title, description: exam.description, duration: exam.duration,
      totalMarks: exam.totalMarks, passingMarks: exam.passingMarks,
      negativeMarking: exam.negativeMarking, randomize: exam.randomize,
      questions: exam.questions ?? [],
    })
    setEditId(exam._id)
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    const method = editId ? 'PATCH' : 'POST'
    const url    = editId ? `/api/exams/${editId}` : '/api/exams'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setShowModal(false); fetch_()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/exams/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    fetch_()
  }

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return
    await fetch(`/api/exams/${id}`, { method: 'DELETE' })
    fetch_()
  }

  const addQuestion = () => setForm(p => ({ ...p, questions: [...p.questions, { ...EMPTY_Q, options: ['', '', '', ''] }] }))
  const removeQ = (i: number) => setForm(p => ({ ...p, questions: p.questions.filter((_, j) => j !== i) }))
  const updateQ = (i: number, patch: Partial<Question>) =>
    setForm(p => ({ ...p, questions: p.questions.map((q, j) => j === i ? { ...q, ...patch } : q) }))
  const updateOption = (qi: number, oi: number, val: string) =>
    setForm(p => ({
      ...p,
      questions: p.questions.map((q, j) =>
        j === qi ? { ...q, options: q.options.map((o, k) => k === oi ? val : o) } : q
      )
    }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Exams</h1>
          <p className="text-gray-500 text-sm">Create and manage examinations</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Exam
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium mb-2">No exams yet</p>
          <p className="text-sm">Create your first exam to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <div key={exam._id} className="bg-surface-1 border border-surface-3 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-semibold text-white">{exam.title}</p>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                    exam.isActive ? 'bg-ok/10 border-ok/20 text-ok' : 'bg-surface-3 border-surface-2 text-gray-500'
                  )}>
                    {exam.isActive ? 'Active' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {exam.duration}m · {exam.totalMarks} marks · {exam.questions?.length ?? 0} questions
                  {exam.createdBy?.name ? ` · by ${exam.createdBy.name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => toggleActive(exam._id, exam.isActive)} className="p-2 text-gray-400 hover:text-ok transition-colors">
                  {exam.isActive ? <ToggleRight className="w-5 h-5 text-ok" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(exam)} className="p-2 text-gray-400 hover:text-brand-300 transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteExam(exam._id)} className="p-2 text-gray-400 hover:text-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="w-full max-w-2xl bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
              <h2 className="font-display font-bold text-white">{editId ? 'Edit Exam' : 'New Exam'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Title</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Exam title" className="input-base" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Duration (minutes)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))}
                    className="input-base" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Total Marks</label>
                  <input type="number" value={form.totalMarks} onChange={e => setForm(p => ({ ...p, totalMarks: +e.target.value }))}
                    className="input-base" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Passing Marks</label>
                  <input type="number" value={form.passingMarks} onChange={e => setForm(p => ({ ...p, passingMarks: +e.target.value }))}
                    className="input-base" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Description</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional" className="input-base" />
                </div>
              </div>

              <div className="flex gap-4">
                {[
                  { key: 'randomize', label: 'Randomize questions' },
                  { key: 'negativeMarking', label: 'Negative marking' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" checked={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                      className="accent-brand-500" />
                    {label}
                  </label>
                ))}
              </div>

              {/* Questions */}
              <div className="border-t border-surface-3 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">Questions ({form.questions.length})</h3>
                  <button onClick={addQuestion} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add question
                  </button>
                </div>

                <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
                  {form.questions.map((q, i) => (
                    <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-xs font-bold text-brand-400 mt-1">Q{i + 1}</span>
                        <textarea value={q.text} onChange={e => updateQ(i, { text: e.target.value })}
                          placeholder="Question text..." rows={2}
                          className="flex-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none" />
                        <button onClick={() => removeQ(i)} className="text-gray-500 hover:text-danger mt-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-3 mb-3">
                        <select value={q.type} onChange={e => updateQ(i, { type: e.target.value as any })}
                          className="bg-surface-1 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
                          <option value="mcq">MCQ</option>
                          <option value="descriptive">Descriptive</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Marks:</span>
                          <input type="number" value={q.marks} min={1}
                            onChange={e => updateQ(i, { marks: +e.target.value })}
                            className="w-14 bg-surface-1 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none" />
                        </div>
                      </div>

                      {q.type === 'mcq' && (
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === oi}
                                onChange={() => updateQ(i, { correctAnswer: oi })}
                                className="accent-ok flex-shrink-0" />
                              <input value={opt} onChange={e => updateOption(i, oi, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="flex-1 bg-surface-1 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none placeholder-gray-600" />
                            </div>
                          ))}
                          <p className="col-span-2 text-[10px] text-gray-600">Radio = correct answer</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {form.questions.length === 0 && (
                    <p className="text-sm text-gray-600 text-center py-6">No questions yet. Click "Add question" above.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-surface-3 text-gray-400 hover:text-white rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={save} disabled={saving || !form.title}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : editId ? 'Update Exam' : 'Create Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-base {
          background: #181b33;
          border: 1px solid #1e2240;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          color: #e2e8f0;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
        }
        .input-base:focus { border-color: rgba(98,114,245,0.6); }
        .input-base::placeholder { color: #4a5080; }
      `}</style>
    </div>
  )
}
