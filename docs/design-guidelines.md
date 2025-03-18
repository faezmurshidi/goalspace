# Design Guidelines

## Colors
- Primary: Rose-500 (#F43F5E)
- Secondary Gradient: from-rose-500 via-purple-500 to-cyan-500
- Background: Muted (system)
- Text: Primary (system) and Muted-foreground (system)

## Typography
- Headings: 
  - H1: text-2xl font-bold
  - H2: text-xl font-semibold
  - Card Titles: text-xl font-semibold
- Body: text-sm
- Micro: text-xs text-muted-foreground

## Components
### Buttons
- Primary: bg-primary text-primary-foreground
- Outline: border-border hover:bg-accent
- Social Login: variant="outline" with left-aligned icons (size-5)

### Cards
- Background: bg-background
- Border: border-border
- Padding: p-6
- Header Spacing: gap-1.5
- Content Spacing: gap-6

### Forms
- Input Fields: full width with rounded borders
- Labels: text-sm font-medium
- Spacing between fields: gap-6
- Error states: text-destructive

### Icons
- UI Icons: size-4 (1rem)
- Logo/Brand Icons: size-5 (1.25rem)
- Social Icons: size-5 (1.25rem)

## Spacing
- Component Gap: gap-6
- Section Gap: gap-8
- Inner Element Gap: gap-2 or gap-4

## Animations
- Hover States: transition-colors duration-200
- Interactive Elements: scale-105 on hover 