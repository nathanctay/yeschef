// @vitest-environment jsdom
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StarPicker } from './StarPicker'

afterEach(cleanup)

describe('StarPicker', () => {
  it('calls onChange with star value on click', () => {
    const onChange = vi.fn()
    render(<StarPicker value={null} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with null when clicking the current rating (toggle off)', () => {
    const onChange = vi.fn()
    render(<StarPicker value={3} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('does not render clickable elements when readOnly', () => {
    render(<StarPicker value={3} readOnly />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('calls onChange with half-star value when clicking left half', () => {
    const onChange = vi.fn()
    render(<StarPicker value={null} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('2.5 stars'))
    expect(onChange).toHaveBeenCalledWith(2.5)
  })

  it('calls onChange with null when clicking current half-star rating (toggle off)', () => {
    const onChange = vi.fn()
    render(<StarPicker value={2.5} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('2.5 stars'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('renders readOnly mode without error for half-star value', () => {
    const { container } = render(<StarPicker value={2.5} readOnly />)
    expect(container.firstChild).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
