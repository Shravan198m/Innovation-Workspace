# Design System

This project now uses a reusable design system based on semantic tokens and UI primitives.

## 1) Typography

- Global font family: Inter (sans-serif), applied in [client/src/index.css](client/src/index.css).
- Semantic heading utilities:
  - `heading-xl`
  - `heading-lg`
  - `heading-md`
  - `heading-project` (explicit black project heading style)
- Semantic body utilities:
  - `text-heading`
  - `text-body`
  - `text-muted`

## 2) Color Tokens

Defined as CSS custom properties in `:root` in [client/src/index.css](client/src/index.css):

- Brand:
  - `--primary`
  - `--secondary`
  - `--accent`
- Semantic text:
  - `--text-heading`
  - `--text-body`
  - `--text-muted`

Use semantic classes where possible instead of hard-coded colors.

## 3) Spacing Scale

Spacing tokens are defined in [client/src/index.css](client/src/index.css):

- `--space-1`: 0.25rem
- `--space-2`: 0.5rem
- `--space-3`: 0.75rem
- `--space-4`: 1rem
- `--space-5`: 1.25rem
- `--space-6`: 1.5rem
- `--space-8`: 2rem
- `--space-10`: 2.5rem
- `--space-12`: 3rem
- `--space-16`: 4rem

Utility helpers:

- `space-section`
- `stack-gap-sm`
- `stack-gap-md`
- `stack-gap-lg`

## 4) Button Variants

Standardized classes in [client/src/index.css](client/src/index.css):

- Base: `btn`
- Variants:
  - `btn-primary`
  - `btn-secondary`
  - `btn-ghost`
  - `btn-danger`

Reusable React primitive:

- [client/src/components/ui/Button.jsx](client/src/components/ui/Button.jsx)

Usage example:

```jsx
import Button from '../components/ui/Button';

<Button variant="primary">Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
```

## 5) Surface and Card Patterns

Surface helpers in [client/src/index.css](client/src/index.css):

- `card-surface`
- `card-surface-soft`

Reusable React primitive:

- [client/src/components/ui/Card.jsx](client/src/components/ui/Card.jsx)

Usage example:

```jsx
import Card from '../components/ui/Card';

<Card className="p-6">Content</Card>
```

## 6) Heading Primitive

Reusable heading component:

- [client/src/components/ui/Heading.jsx](client/src/components/ui/Heading.jsx)

Supports:

- levels (`h1`..`h6`)
- sizes (`xl`, `lg`, `md`, `sm`, `xs`)
- `project` mode for black project titles

Usage example:

```jsx
import Heading from '../components/ui/Heading';

<Heading level={1} size="xl" project>
  Project Control Center
</Heading>
```

## 7) Stack Primitive

Reusable spacing abstraction:

- [client/src/components/ui/Stack.jsx](client/src/components/ui/Stack.jsx)

Usage example:

```jsx
import Stack from '../components/ui/Stack';

<Stack gap="md">
  <SectionA />
  <SectionB />
</Stack>
```

## 8) Identity Components

- Shared logo component:
  - [client/src/components/Logo.jsx](client/src/components/Logo.jsx)
- Tooltip pop-in component for complex labels:
  - [client/src/components/InfoTip.jsx](client/src/components/InfoTip.jsx)

Guideline: Use pop-ins only for domain-specific or ambiguous terms (for example UTR, approval states, role definitions).

## 9) Adoption Rules

- Use semantic utility classes first (`heading-*`, `text-*`, `btn-*`, `card-*`).
- Avoid hard-coded colors for project headings; use `heading-project` or `Heading` with `project` prop.
- Prefer UI primitives in new components.
- Keep animations subtle and meaningful; avoid decorative motion without UX value.
