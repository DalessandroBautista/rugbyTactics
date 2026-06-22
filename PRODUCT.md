# TacticsRugby — Product Context

## Product Purpose
Web app for rugby coaches and analysts to design, animate, and share tactical plays. Users place players on a regulation field, draw movement trajectories, and replay animations to communicate plays to their team.

## Users
- Rugby coaches (primary): designing plays for training sessions, need speed and clarity
- Analysts: reviewing and annotating plays, need precision
- Players (secondary): viewing plays shared by coaches, need intuitive read-only navigation

## Register
product

## Brand
- Name: TacticsRugby
- Tone: focused, professional, no-nonsense — like a tactical whiteboard, not a game
- Anti-references: sports gaming apps (too flashy), SaaS dashboards (too corporate), Google Docs (too office)
- The tool should feel like a specialist instrument: purposeful, dense but readable

## Strategic Principles
1. The field is the hero — UI chrome should never compete with it
2. Modes are the mental model — users must always know which mode they're in (Select / Move / Record)
3. Reversibility — undo/redo always accessible, destructive actions marked
4. Keyboard-first — power users navigate entirely without mouse

## Current Pain Points (from screenshot review)
- TopBar is a flat list of 15+ buttons with no visual hierarchy
- "Reiniciar" (red) looks like an error state, not an intentional action
- Mode buttons (Seleccionar/Mover/Grabar) work but don't feel distinct enough
- Secondary controls (Snap, Multi, Espejo) look the same as primary ones
- Sidebar is text-only, no visual differentiation between players
- No clear visual feedback for which mode is active beyond one highlighted button
