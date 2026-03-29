import { useState, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { VideoUpload } from './VideoUpload'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableItem } from './SortableItem'

type FormRow = {
  id: string
  text: string
}

export interface RecipeFormData {
  title: string
  description: string
  visibility: 'public' | 'private'
  ingredients: FormRow[]
  steps: FormRow[]
  notes: string
  video_path?: string | null
  images?: string[]
  servings?: number | null
  prep_time_minutes?: number | null
  cook_time_minutes?: number | null
  total_time_minutes?: number | null
  nutrition_json?: {
    calories?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    fiber_g?: number
  } | null
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
  const [ingredients, setIngredients] = useState<FormRow[]>(
    defaultValues?.ingredients?.length
      ? defaultValues.ingredients.map((i) => ({ id: i.id ?? generateId(), text: i.text }))
      : [{ id: generateId(), text: '' }]
  )
  const [steps, setSteps] = useState<FormRow[]>(
    defaultValues?.steps?.length
      ? defaultValues.steps.map((s) => ({ id: s.id ?? generateId(), text: s.text }))
      : [{ id: generateId(), text: '' }]
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>(() => {
    const v = defaultValues?.images
    if (Array.isArray(v)) return v
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return []
  })
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [servings, setServings] = useState<string>(defaultValues?.servings?.toString() ?? '')
  const [prepTime, setPrepTime] = useState<string>(defaultValues?.prep_time_minutes?.toString() ?? '')
  const [cookTime, setCookTime] = useState<string>(defaultValues?.cook_time_minutes?.toString() ?? '')
  const [totalTime, setTotalTime] = useState<string>(defaultValues?.total_time_minutes?.toString() ?? '')
  const [nutrition, setNutrition] = useState({
    calories: defaultValues?.nutrition_json?.calories?.toString() ?? '',
    protein_g: defaultValues?.nutrition_json?.protein_g?.toString() ?? '',
    carbs_g: defaultValues?.nutrition_json?.carbs_g?.toString() ?? '',
    fat_g: defaultValues?.nutrition_json?.fat_g?.toString() ?? '',
    fiber_g: defaultValues?.nutrition_json?.fiber_g?.toString() ?? '',
  })

  const ingredientSensors = useSensors(useSensor(PointerSensor))
  const stepSensors = useSensors(useSensor(PointerSensor))

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

  function handleIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setIngredients((items) => {
        const from = items.findIndex((i) => i.id === active.id)
        const to = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, from, to)
      })
    }
  }

  function handleStepDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const from = items.findIndex((s) => s.id === active.id)
        const to = items.findIndex((s) => s.id === over.id)
        return arrayMove(items, from, to)
      })
    }
  }

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
    if (videoFile) {
      fd.append('videoFile', videoFile)
    }
    fd.append('images', JSON.stringify(existingImages))
    for (const file of pendingImages) {
      fd.append('imageFiles', file)
    }
    if (servings) fd.append('servings', servings)
    if (prepTime) fd.append('prep_time_minutes', prepTime)
    if (cookTime) fd.append('cook_time_minutes', cookTime)
    if (totalTime) fd.append('total_time_minutes', totalTime)
    const nutritionObj: Record<string, number> = {}
    if (nutrition.calories) nutritionObj.calories = parseFloat(nutrition.calories)
    if (nutrition.protein_g) nutritionObj.protein_g = parseFloat(nutrition.protein_g)
    if (nutrition.carbs_g) nutritionObj.carbs_g = parseFloat(nutrition.carbs_g)
    if (nutrition.fat_g) nutritionObj.fat_g = parseFloat(nutrition.fat_g)
    if (nutrition.fiber_g) nutritionObj.fiber_g = parseFloat(nutrition.fiber_g)
    if (Object.keys(nutritionObj).length > 0) fd.append('nutrition_json', JSON.stringify(nutritionObj))
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

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPendingImages((prev) => [...prev, file])
    setPendingPreviews((prev) => [...prev, url])
    e.target.value = ''
  }

  function removeExistingImage(idx: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx))
  }

  function removePendingImage(idx: number) {
    setPendingPreviews((prev) => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
    setPendingImages((prev) => prev.filter((_, i) => i !== idx))
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
        <span style={labelStyle}>Cover Image</span>
        <input
          id="cover-image-input"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <label
          htmlFor="cover-image-input"
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            border: '1px solid #F1E7DA',
            borderRadius: '4px',
            background: '#FFFDF8',
            color: '#1F2937',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Choose cover image
        </label>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Photos</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {existingImages.map((url, idx) => (
            <div key={url} style={{ position: 'relative', width: '96px', height: '96px' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #F1E7DA' }} />
              <button
                type="button"
                onClick={() => removeExistingImage(idx)}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Remove photo"
              >X</button>
            </div>
          ))}
          {pendingPreviews.map((url, idx) => (
            <div key={url} style={{ position: 'relative', width: '96px', height: '96px' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E53935', opacity: 0.85 }} />
              <button
                type="button"
                onClick={() => removePendingImage(idx)}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Remove photo"
              >X</button>
            </div>
          ))}
          <>
            <input
              id="gallery-image-input"
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="gallery-image-input"
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                border: '1px solid #F1E7DA',
                borderRadius: '4px',
                background: '#FFFDF8',
                color: '#1F2937',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Add photo
            </label>
          </>
        </div>
      </div>

      <div style={fieldStyle}>
        <VideoUpload
          currentVideoPath={defaultValues?.video_path ?? null}
          onFileSelect={setVideoFile}
          error={null}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Ingredients *</label>
        <DndContext sensors={ingredientSensors} collisionDetection={closestCenter} onDragEnd={handleIngredientDragEnd}>
          <SortableContext items={ingredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {ingredients.map((ing, idx) => (
              <SortableItem key={ing.id} id={ing.id}>
                {(dragHandleProps) => (
                  <>
                    <span
                      {...dragHandleProps}
                      style={{ cursor: 'grab', color: '#9CA3AF', padding: '8px 4px', userSelect: 'none' }}
                    >
                      <GripVertical size={16} />
                    </span>
                    <span style={{ minWidth: '20px', color: '#6B7280', fontSize: '0.85rem', paddingTop: '8px' }}>{idx + 1}.</span>
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
                  </>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <button type="button" onClick={addIngredient} style={{ ...buttonStyle('ghost'), marginTop: '6px' }}>
          + Add ingredient
        </button>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Steps *</label>
        <DndContext sensors={stepSensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {steps.map((step, idx) => (
              <SortableItem key={step.id} id={step.id}>
                {(dragHandleProps) => (
                  <>
                    <span
                      {...dragHandleProps}
                      style={{ cursor: 'grab', color: '#9CA3AF', padding: '8px 4px', userSelect: 'none' }}
                    >
                      <GripVertical size={16} />
                    </span>
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
                  </>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <button type="button" onClick={addStep} style={{ ...buttonStyle('ghost'), marginTop: '6px' }}>
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
        <label style={labelStyle}>Recipe Details</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.8rem', fontWeight: 500 }}>Servings</label>
            <input style={inputStyle} type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.8rem', fontWeight: 500 }}>Prep time (min)</label>
            <input style={inputStyle} type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.8rem', fontWeight: 500 }}>Cook time (min)</label>
            <input style={inputStyle} type="number" min="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.8rem', fontWeight: 500 }}>Total time (min)</label>
            <input style={inputStyle} type="number" min="0" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} placeholder="45" />
          </div>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Nutrition (per serving, optional)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {(['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const).map((key) => (
            <div key={key}>
              <label style={{ ...labelStyle, fontSize: '0.78rem', fontWeight: 500 }}>
                {key === 'calories' ? 'Calories' : key === 'protein_g' ? 'Protein (g)' : key === 'carbs_g' ? 'Carbs (g)' : key === 'fat_g' ? 'Fat (g)' : 'Fiber (g)'}
              </label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                value={nutrition[key]}
                onChange={(e) => setNutrition((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
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
