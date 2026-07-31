---
name: Sovereign
description: A calm, evidence-led AI tutoring workspace.
colors:
  field: "oklch(0.975 0.012 82)"
  surface: "oklch(0.992 0.005 82)"
  surface-muted: "oklch(0.948 0.014 82)"
  ink: "oklch(0.190 0.025 170)"
  ink-soft: "oklch(0.440 0.025 165)"
  rule: "oklch(0.855 0.014 82)"
  stem: "oklch(0.390 0.072 158)"
  stem-soft: "oklch(0.920 0.028 158)"
  evidence: "oklch(0.440 0.065 320)"
  evidence-soft: "oklch(0.930 0.024 320)"
typography:
  headline:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.65
  label:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.3
rounded:
  tight: "8px"
  compact: "9px"
  control: "10px"
  inset: "11px"
  diagram: "12px"
  surface: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.stem}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  evidence-chip:
    backgroundColor: "{colors.evidence-soft}"
    textColor: "{colors.evidence}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
---

# Design System: Sovereign

## Overview

**Creative North Star: “The Deliberate Study”**

Sovereign feels like a quiet desk prepared for difficult thinking: composed,
legible, and purposeful. The tutoring exchange is always the primary object.
Navigation, source material, progress evidence, and controls remain close at
hand without competing for attention.

The interface rejects visual theatrics. Intelligence is expressed through
precise hierarchy, excellent typography, cited diagrams, restrained motion, and
clear state changes.

**Key Characteristics:**

- Moderate information density with an immersive Focus Mode.
- Conversation without conventional speech-bubble styling.
- Sources and diagrams appear at the exact point of explanation.
- Warm near-white field, grounded green action, muted aubergine evidence.
- Familiar product affordances with complete keyboard and focus behavior.

## Colors

The palette is grounded and quiet. Colour is semantic rather than decorative.

- **Field:** `oklch(0.975 0.012 82)` carries the long-reading canvas.
- **Ink:** `oklch(0.190 0.025 170)` is the dominant text and line colour.
- **Stem:** `oklch(0.390 0.072 158)` identifies tutor presence, current progress,
  and primary actions.
- **Evidence:** `oklch(0.440 0.065 320)` is reserved for sources, citations, and
  quoted course material.
- **Rule:** `oklch(0.855 0.014 82)` structures the workspace without card clutter.

**The Semantic Colour Rule.** Green means tutor/current action. Purple means
source/evidence. Neither is used as incidental decoration.

## Typography

**Display Font:** Manrope Variable  
**Body Font:** Manrope Variable  
**Label Font:** Manrope Variable

Manrope supplies the clean, sharp-but-soft character requested from Rakuten
Sans without creating competing UI and tutor voices. Weight, measure, and space
create hierarchy.

- **Headline:** 28px, 650 weight, 1.2 line-height.
- **Title:** 18px, 650 weight, 1.35 line-height.
- **Body:** 16px, 450 weight, 1.65 line-height, maximum 68ch.
- **Secondary:** 14px, 500 weight, 1.5 line-height.
- **Label:** 13px, 650 weight, never tracked uppercase by default.

**The Tutor Measure Rule.** Explanations never exceed 68 characters per line
unless the content is a formula, diagram, or table.

## Elevation

Sovereign is flat by default. Depth comes from tonal surfaces, rules, and
overlap. Shadows appear only on transient drawers and active overlays.

**The Flat-at-Rest Rule.** Persistent content does not float above the workspace.

## Components

### Buttons

Controls use a 10px radius, 44px minimum target, and 150–220ms state
transitions. Primary actions use Stem with near-white text. Secondary actions
remain transparent with a full neutral border.

### Chips

Chips are reserved for true metadata or actions, not headings. Evidence chips
use the pale aubergine tint and dark evidence text.

### Cards / Containers

Use containers only for independently actionable or source-bounded content.
Conversation sections are grouped with whitespace and horizontal rules rather
than nested cards.

### Inputs / Fields

The answer composer is a quiet outlined surface with a strong `:focus-visible`
ring. Placeholder text meets contrast requirements. Error and disabled states
remain readable without relying on colour alone.

### Navigation

Desktop uses a slim left rail with familiar icons and labels. Mobile uses a
bottom navigation bar. Tutor sessions may collapse both into Focus Mode.

### Evidence Rail

The evidence rail binds explanations to slide captures and learner history.
Purple source states, slide numbers, and captions make provenance immediately
recognizable.

## Do's and Don'ts

### Do:

- **Do** keep the teaching exchange visually dominant.
- **Do** place cited diagrams beside the explanation that uses them.
- **Do** preserve visible focus states and 44px interactive targets.
- **Do** use short, integrated transitions to explain state changes.
- **Do** distinguish temporary transcript from retained learning evidence.

### Don't:

- **Don't** create childish or mascot-led education visuals.
- **Don't** use medieval, heraldic, royal, or luxury-banking interpretations of
  “Sovereign.”
- **Don't** use neon AI dashboards, decorative glass, gradients, or flashy
  animation.
- **Don't** render the conversation as an endless stack of speech bubbles.
- **Don't** wrap every region in a card or nest cards inside cards.
- **Don't** expose dense expert controls before the user needs them.
