import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router'
import App from './App'

describe('App', () => {
  it('renders the home page by default', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Mazos' })).toBeInTheDocument()
  })
})
