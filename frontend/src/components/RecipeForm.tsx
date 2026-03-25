import { useState, useRef } from 'react'

interface IngredientRow {
  id: string
  text: string
}

interface StepRow {
  id: string
  text: string
}

export interface RecipeFormData {
  title: string
  description: string
  visibility: 'public' | 'private'
  ingredients: IngredientRow[]
  steps: StepRow[]
  notes: string
}

interface RecipeFormProps {
  defaultValues?: Partial<RecipeFormData>
  onSubmit: (data: FormData) => void
  isLoading?: boolean
}

function generateId(): string {
  return crypto.randomUUID()
}

export function RecipeForm({ defaultValues, onSubmit, isLoading }: RecipeFormProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [visibility, setVisibility] = useState<'public' | 'private'>(defaultValues?.visibility ?? 'private')
  const [notes, setNotes] = useState(defaultValues?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    defaultValues?.ingredients?.length
      ? defaultValues.ingredients.map((i) => ({ id: i.id ?? generateId(), text: i.text }))
      : [{ id: generateId(), text: '' }]
  )
  const [steps, setSteps] = useState<StepRow[]>(
    defaultValues?.steps?.length
      ? defaultValues.steps.map((s) => ({ id: s.id ?? generateId(), text: s.text }))
      : [{ id: generateId(), text: '' }]
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addIngredient = () => setIngredients((prev) => [...prev, { id: generateId(), text: '' }])
  const removeIngredient = (id: string) =>
    setIngredients((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev))
  const updateIngredient = (id: string, text: string) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)))

  const addStep = () => setSteps((prev) => [...prev, { id: generateId(), text: '' }])
  const removeStep = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev))
  const updateStep = (id: string, text: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('visibility', visibility)
    fd.append('ingredients', JSON.stringify(ingredients))
    fd.append('steps', JSON.stringify(steps))
    fd.append('notes', notes)
    if (fileInputRef.current?.files?.[0]) {
      fd.append('coverImage', fileInputRef.current.files[0])
    }
    onSubmit(fd)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #F1E7DA',
    borderRadius: '4px',
    fontSize: '0.95rem',
    color: '#1F2937',
    background: '#FFFDF8',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: '4px',
    fontSize: '0.9rem',
    color: '#1F2937',
  }

  const fieldStyle: React.CSSProperties = { marginBottom: '18px' }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '6px',
  }

  const buttonStyle = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: variant === 'ghost' ? '4px 10px' : '8px 18px',
    border: variant === 'ghost' ? '1px solid #F1E7DA' : '1px solid transparent',
    borderRadius: '4px',
    background: variant === 'primary' ? '#E53935' : variant === 'danger' ? 'transparent' : '#FFFDF8',
    color: variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? '#E53935' : '#1F2937',
    fontWeight: 600,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem',
  })

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="title">Title *</label>
        <input
          id="title"
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Recipe title"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea
          id="description"
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="coverImage">Cover Image</label>
        <input
          id="coverImage"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ fontSize: '0.9rem', color: '#1F2937' }}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Ingredients *</label>
        {ingredients.map((ing, idx) => (
          <div key={ing.id} style={rowStyle}>
            <span style={{ minWidth: '20px', color: '#6B7280', fontSize: '0.85rem' }}>{idx + 1}.</span>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={ing.text}
              onChange={(e) => updateIngredient(ing.id, e.target.value)}
              placeholder={`Ingredient ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => removeIngredient(ing.id)}
              style={buttonStyle('danger')}
              aria-label="Remove ingredient"
            >
              X
            </button>
          </div>
        ))}
        <button type="button" onClick={addIngredient} style={buttonStyle('ghost')}>
          + Add ingredient
        </button>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Steps *</label>
        {steps.map((step, idx) => (
          <div key={step.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
            <span style={{ minWidth: '20px', color: '#6B7280', fontSize: '0.85rem', paddingTop: '8px' }}>{idx + 1}.</span>
            <textarea
              style={{ ...inputStyle, flex: 1, minHeight: '60px', resize: 'vertical' }}
              value={step.text}
              onChange={(e) => updateStep(step.id, e.target.value)}
              placeholder={`Step ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => removeStep(step.id)}
              style={{ ...buttonStyle('danger'), marginTop: '8px' }}
              aria-label="Remove step"
            >
              X
            </button>
          </div>
        ))}
        <button type="button" onClick={addStep} style={buttonStyle('ghost')}>
          + Add step
        </button>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tips, substitutions, or extra context (optional)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="visibility">Visibility</label>
        <select
          id="visibility"
          style={inputStyle}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      <button type="submit" style={buttonStyle('primary')} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Recipe'}
      </button>
    </form>
  )
}
