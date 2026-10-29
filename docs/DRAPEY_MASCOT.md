# Drapey mascot

Uses Strobi from Bible Strong Avatar Lab by Stéphane Montlouis-Calixte:
https://github.com/smontlouis/bible-strong-avatar-lab

Definition source: examples/react-vite-consumer/src/strobi.avatar.json.
Local changes: DoorDrape green/cream palette; selected animations retained.
Renderer: @bible-strong/avatar-web 0.1.0 (official DOM renderer, compatible with the existing React 18 app).
License: AGPL-3.0-only. Preserve upstream notices and fulfill applicable corresponding-source obligations before distributing/deploying a combined work. This integration has not been deployed.

## Reference walkthrough
Observed SCULT early-access page from hero through film, comparison, feature cards, maker story, FAQ, signup and footer in half-screen scroll increments.
- Avatar changes horizontal and vertical location during scroll, even within a long section.
- Small expressive character, ambient motion, transient thought bubbles.
- Dots appear before typed speech; speech disappears after a short hold.
- Bubble above or below the character, according to screen space.

DoorDrape implementation uses a continuous curved scroll path (not a heading clamp), a 64px desktop / 54px mobile avatar, section-specific copy, 700ms thinking delay, 30ms character typing and a 6.5s reading hold. Tap repeats the message. Escape dismisses speech. Reduced motion disables travel transitions, ambient motion and typing.

This recreates the observed interaction pattern, not SCULT's proprietary source or exact motion algorithm. The Strobi body uses the Avatar Lab renderer with a custom glossy gradient. An original SVG facial overlay adds shiny eyes, cheeks, antenna, arms, blinking, an animated speaking mouth, a thinking expression and closed sleeping eyes with floating Z marks. The original renderer eyes are hidden to avoid overlapping faces. Speaking is visual only; no audio is played. After 30 seconds without interaction the mascot sleeps; scrolling, typing or tapping wakes it.
