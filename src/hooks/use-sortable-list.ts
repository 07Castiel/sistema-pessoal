import { useMemo } from "react"
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"

export const sortableScreenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Pressione espaço ou enter para começar a arrastar. Use as setas para mover, espaço ou enter para soltar e escape para cancelar.",
}

function positionLabel(id: string, ids: string[]) {
  const index = ids.indexOf(id)
  return index >= 0 ? `${index + 1} de ${ids.length}` : ""
}

function useSortableAnnouncements(ids: string[]): Announcements {
  return useMemo(
    () => ({
      onDragStart: ({ active }) =>
        `Item na posição ${positionLabel(String(active.id), ids)} foi selecionado.`,
      onDragOver: ({ active, over }) =>
        over
          ? `Item da posição ${positionLabel(String(active.id), ids)} foi movido para a posição ${positionLabel(String(over.id), ids)}.`
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? `Item solto na posição ${positionLabel(String(over.id), ids)}.`
          : `Item da posição ${positionLabel(String(active.id), ids)} foi solto.`,
      onDragCancel: ({ active }) =>
        `Movimentação cancelada. Item permanece na posição ${positionLabel(String(active.id), ids)}.`,
    }),
    [ids]
  )
}

/**
 * Shared sortable wiring for the category lists: pointer + keyboard sensors
 * (keyboard is required so reordering stays operable without a mouse) and a
 * drag-end handler that maps the drop onto a reordered id array.
 */
export function useSortableList(ids: string[], onReorder: (orderedIds: string[]) => void) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const announcements = useSortableAnnouncements(ids)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return { sensors, announcements, handleDragEnd }
}
