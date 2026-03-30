// @vitest-environment jsdom
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, onClick, ...rest }: any) => (
    <a href={to} onClick={onClick} {...rest}>{children}</a>
  ),
}))

vi.mock('../server/search', () => ({
  searchRecipes: vi.fn(),
  searchUsers: vi.fn(),
}))

import { searchRecipes, searchUsers } from '../server/search'
import { SearchBar } from './SearchBar'

const mockSearchRecipes = vi.mocked(searchRecipes)
const mockSearchUsers = vi.mocked(searchUsers)

async function advanceAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockSearchRecipes.mockResolvedValue([])
  mockSearchUsers.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('SearchBar', () => {
  it('renders an input', () => {
    render(<SearchBar />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('does not fire search for queries shorter than 2 chars', async () => {
    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } })
    await advanceAndFlush(300)
    expect(mockSearchRecipes).not.toHaveBeenCalled()
    expect(mockSearchUsers).not.toHaveBeenCalled()
  })

  it('fires search after debounce for queries 2+ chars', async () => {
    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pa' } })
    await advanceAndFlush(300)
    expect(mockSearchRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ query: 'pa', limit: 3 }) })
    )
    expect(mockSearchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ query: 'pa', limit: 2 }) })
    )
  })

  it('shows recipe results in the dropdown', async () => {
    mockSearchRecipes.mockResolvedValue([{
      id: 'r1',
      title: 'Pasta Primavera',
      description: null,
      cover_image_path: null,
      rating_avg: null,
      rating_count: 0,
      owner: { id: 'u1', display_name: 'Alice', avatar_url: null },
    }])

    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pasta' } })
    await advanceAndFlush(300)
    expect(screen.getByText('Pasta Primavera')).toBeInTheDocument()
  })

  it('shows user results in the dropdown', async () => {
    mockSearchUsers.mockResolvedValue([{
      id: 'u1', display_name: 'Alice Smith', avatar_url: null,
    }])

    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } })
    await advanceAndFlush(300)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('does not show dropdown when both results are empty', async () => {
    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } })
    await advanceAndFlush(300)
    expect(mockSearchRecipes).toHaveBeenCalled()
    expect(screen.queryByText('See all results')).not.toBeInTheDocument()
  })

  it('navigates to /search on Enter key', async () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'pasta' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/search',
      search: { q: 'pasta' },
    })
  })

  it('does not navigate on Enter if query is empty', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows "See all results" when dropdown is open', async () => {
    mockSearchRecipes.mockResolvedValue([{
      id: 'r1', title: 'Pasta', description: null, cover_image_path: null,
      rating_avg: null, rating_count: 0,
      owner: { id: 'u1', display_name: 'Alice', avatar_url: null },
    }])

    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pasta' } })
    await advanceAndFlush(300)
    expect(screen.getByText('See all results')).toBeInTheDocument()
  })

  it('"See all results" click navigates to /search?q=<value>', async () => {
    mockSearchRecipes.mockResolvedValue([{
      id: 'r1', title: 'Pasta', description: null, cover_image_path: null,
      rating_avg: null, rating_count: 0,
      owner: { id: 'u1', display_name: 'Alice', avatar_url: null },
    }])

    render(<SearchBar />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pasta' } })
    await advanceAndFlush(300)
    fireEvent.click(screen.getByText('See all results'))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/search',
      search: { q: 'pasta' },
    })
  })
})
