// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebounce } from './useDebounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'ab' })
    act(() => { vi.advanceTimersByTime(200) })

    expect(result.current).toBe('a')
  })

  it('updates after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'ab' })
    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current).toBe('ab')
  })

  it('resets the timer when value changes before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'ab' })
    act(() => { vi.advanceTimersByTime(200) })

    rerender({ value: 'abc' })
    act(() => { vi.advanceTimersByTime(200) })

    // 400ms total but timer reset at 200ms — not enough
    expect(result.current).toBe('a')

    act(() => { vi.advanceTimersByTime(100) })
    // 300ms since last change — now updates
    expect(result.current).toBe('abc')
  })
})
