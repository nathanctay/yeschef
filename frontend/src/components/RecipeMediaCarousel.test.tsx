// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { RecipeMediaCarousel } from './RecipeMediaCarousel'

afterEach(cleanup)

describe('RecipeMediaCarousel', () => {
  it('renders nothing when no media is provided', () => {
    const { container } = render(
      <RecipeMediaCarousel coverImagePath={null} videoPath={null} images={[]} title="Test" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a single image with no arrows or thumbnails', () => {
    render(
      <RecipeMediaCarousel coverImagePath="https://example.com/cover.jpg" videoPath={null} images={[]} title="Test" />
    )
    expect(screen.getByAltText('Test photo 1')).toBeTruthy()
    expect(screen.queryByText('<')).toBeNull()
    expect(screen.queryByText('>')).toBeNull()
  })

  it('renders arrows and thumbnails when multiple slides exist', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="Test"
      />
    )
    expect(screen.getByText('<')).toBeTruthy()
    expect(screen.getByText('>')).toBeTruthy()
  })

  it('slide order: cover first, then gallery images', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="My Recipe"
      />
    )
    expect(screen.getByAltText('My Recipe photo 1')).toBeTruthy()
    expect(screen.getByAltText('My Recipe photo 2')).toBeTruthy()
  })

  it('left arrow hidden on first slide', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="Test"
      />
    )
    const leftArrow = screen.getByText('<')
    expect(leftArrow.style.visibility).toBe('hidden')
  })

  it('right arrow hidden on last slide', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="Test"
      />
    )
    fireEvent.click(screen.getByText('>'))
    const rightArrow = screen.getByText('>')
    expect(rightArrow.style.visibility).toBe('hidden')
  })

  it('clicking right arrow advances to next thumbnail active state', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="Test"
      />
    )
    const thumbnails = screen.getAllByRole('button', { name: /thumb/ })
    expect(thumbnails[0].style.border).toContain('rgb(193, 125, 60)')
    fireEvent.click(screen.getByText('>'))
    expect(thumbnails[1].style.border).toContain('rgb(193, 125, 60)')
  })

  it('clicking a thumbnail jumps to that slide', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath={null}
        images={['https://example.com/photo1.jpg']}
        title="Test"
      />
    )
    const thumbnails = screen.getAllByRole('button', { name: /thumb/ })
    fireEvent.click(thumbnails[1])
    expect(thumbnails[1].style.border).toContain('rgb(193, 125, 60)')
  })

  it('shows video thumbnail placeholder with title video-slide', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath={null}
        videoPath="https://example.com/vid.mp4"
        images={[]}
        title="Test"
      />
    )
    expect(screen.getByTitle('video-slide')).toBeTruthy()
  })

  it('shows unmute button only on video slide', () => {
    render(
      <RecipeMediaCarousel
        coverImagePath="https://example.com/cover.jpg"
        videoPath="https://example.com/vid.mp4"
        images={[]}
        title="Test"
      />
    )
    expect(screen.queryByRole('button', { name: 'Unmute' })).toBeNull()
    fireEvent.click(screen.getByText('>'))
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeTruthy()
  })
})
