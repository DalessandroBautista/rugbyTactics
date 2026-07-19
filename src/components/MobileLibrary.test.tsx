import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Play } from '../types'
import { MobileLibrary } from './MobileLibrary'

const play = { id: 'p1', name: 'Salida desde mitad', description: '', category: 'Ataque', createdAt: '', players: [], ball: { x: 0, y: 0, carriedBy: null, trajectory: [], size: 6 }, duration: 40_000, tags: ['salida'] } as Play

describe('MobileLibrary', () => {
  it('makes viewing primary and quick editing secondary', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    render(<MobileLibrary plays={[play]} onView={onView} onEdit={onEdit} onDesktop={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Tus jugadas' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /ver salida desde mitad/i }))
    expect(onView).toHaveBeenCalledWith('p1')
    fireEvent.click(screen.getByRole('button', { name: /editar salida desde mitad/i }))
    expect(onEdit).toHaveBeenCalledWith('p1')
  })

  it('filters by search and tags', () => {
    render(<MobileLibrary plays={[play]} onView={() => {}} onEdit={() => {}} onDesktop={() => {}} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'defensa' } })
    expect(screen.queryByText('Salida desde mitad')).toBeNull()
  })

  it('keeps proposals available for editable shared copies', () => {
    const onPropose = vi.fn()
    const copy = { ...play, origin: { listId: 'l1', playId: 'source', basePlay: play } }
    render(<MobileLibrary plays={[copy]} onView={() => {}} onEdit={() => {}} onPropose={onPropose} onDesktop={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /proponer cambios/i }))
    expect(onPropose).toHaveBeenCalledWith('p1')
  })

  it('keeps account access available on mobile', () => {
    const onAccount = vi.fn()
    render(<MobileLibrary plays={[play]} onView={() => {}} onEdit={() => {}} onAccount={onAccount} onDesktop={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(onAccount).toHaveBeenCalled()
  })
})
