import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthModal } from './AuthModal'

describe('AuthModal', () => {
  it('starts with email only and reveals login choices after continuing', () => {
    render(<AuthModal onClose={vi.fn()} />)

    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.queryByLabelText('Contraseña')).toBeNull()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'coach@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Usar un código' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeTruthy()
  })
})
