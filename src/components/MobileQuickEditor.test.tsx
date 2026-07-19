import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store/useStore'
import { MobileQuickEditor } from './MobileQuickEditor'

vi.mock('./FieldCanvas', () => ({ FieldCanvas: () => <div data-testid="quick-field" /> }))

describe('MobileQuickEditor', () => {
  beforeEach(() => {
    const original = useStore.getState().plays[0]
    useStore.setState({ currentPlayId: original.id, editMode: 'move' })
  })

  it('edits metadata without exposing advanced tools', () => {
    const onExit = vi.fn()
    render(<MobileQuickEditor onExit={onExit} />)
    expect(screen.getByTestId('quick-field')).toBeTruthy()
    expect(screen.queryByText('Grabar')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Nombre y etiquetas' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Jugada desde el celular' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(useStore.getState().getCurrentPlay()?.name).toBe('Jugada desde el celular')
    expect(onExit).toHaveBeenCalled()
  })
})
