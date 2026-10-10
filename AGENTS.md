# ColdMailerAI Workspace Rules & Guidelines

## 1. Mandatory UI Design System Rule

> **CRITICAL DIRECTIVE**: Whenever making changes or additions to the UI (pages, components, layouts, dialogs, cards, forms, tables, or buttons), you **MUST** strictly adhere to the UI style established in the **Dashboard** (`Frontend/src/pages/Dashboard.tsx`).
> 
> **Dashboard Theme Architecture**:
> - **White (Light) Theme is DEFAULT**: For all dashboard routes (`/dashboard/*`), the **White / Light** theme is active by default.
> - **Obsidian (Dark) Theme Support**: The dashboard seamlessly supports toggling into dark mode via `ThemeProvider` (`dashboard-light` class toggle).
> - **Non-dashboard routes** (Landing, Auth, Community) currently retain their dedicated aesthetics.

---

### 1.1 Core Theme & Aesthetic Foundation
- **Visual Aesthetic**: Sleek, high-contrast, modern SaaS interface with electric purple (`#6f34ed`) brand highlights.
  - **White Theme (Default for Dashboard)**: Clean slate-50 canvas (`#f8fafc`), crisp white containers (`#ffffff`), slate-200 borders (`#e2e8f0`), dark slate typography (`#0f172a`), and high-contrast purple brand CTA buttons (`#6f34ed`).
  - **Dark Theme (Toggleable)**: Obsidian surfaces (`#0d0e12`), hairline translucent borders (`border-white/10`), and pure white typography (`text-white`).
- **Elevation & Shadows**: Flat, minimalist depth using subtle borders (`shadow-none` or micro-shadow `0 1px 3px 0 rgba(0,0,0,0.03)`). Avoid heavy drop shadows.
- **Corner Radii**:
  - Cards & Containers: `rounded-lg` (8px)
  - Buttons, Inputs, Icon Badges: `rounded-md` (6px)
  - Status Pills & Tags: `rounded-full`

---

### 1.2 Color Palette & Semantic Tokens

| Role | White Theme (Default) | Dark Theme | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#f8fafc` (`bg-surface-950`) | `#05060a` (`bg-surface-950`) | Page viewport root, layout background, subheaders |
| **Card / Container Background** | `#ffffff` (`bg-surface-900`) | `#0d0e12` (`bg-surface-900`) | Stat cards, feature panels, sidebars, modal surfaces |
| **Primary Text** | `#0f172a` (`text-white`) | `#ffffff` (`text-white`) | Headings, card titles, primary row content |
| **Secondary / Muted Text** | `#64748b` (`text-gray-400`) | `#9ca3af` (`text-gray-400`) | Descriptions, subtitles, metric labels |
| **Primary Border** | `#e2e8f0` (`border-white/10`) | `rgba(255,255,255,0.1)` (`border-white/10`) | Card borders, section separators, header dividers |
| **Subtle Border / Divider** | `#f1f5f9` (`border-white/5`, `divide-white/5`) | `rgba(255,255,255,0.05)` | List item rows, inner panel dividers, icon borders |
| **Subtle Hover State** | `rgba(15,23,42,0.04)` | `rgba(255,255,255,0.05)` | Interactive card hovers, list item hovers, nav link hovers |
| **Brand Primary (Accent)** | `#6f34ed` (`bg-brand`, text: white) | `#6f34ed` (`bg-brand`, text: white) | Primary CTA buttons, active accents, progress bars |
| **Brand Text / Links** | `#6f34ed` (`text-brand-300`) | `#a18cef` (`text-brand-300`) | Inline action links, "Open", "View all" links |
| **Destructive / Danger** | `#fef2f2`, text: `#dc2626` | `bg-red-500/10`, text: `#fca5a5` | Delete actions, destructive alerts, error state texts |
| **Hover Border** | `hover:border-white/20` | Interactive card hover transitions |
| **Brand Primary (Accent)** | `bg-brand` (`#6f34ed`) | Primary CTA buttons, active accents, progress bars |
| **Brand Hover** | `hover:bg-brand-400` (`#7c3ffc`) | Primary button hover state |
| **Brand Text / Links** | `text-brand-300` (`#a18cef`) | Inline action links, "Open", "View all" links (hover: `hover:text-white`) |
| **Destructive / Danger** | `border-red-500/30 bg-red-500/10 text-red-300` | Delete actions, destructive alerts, error state texts (`text-red-400`) |

---

### 1.3 Typography System

| Element | Typography Classes | Notes |
| :--- | :--- | :--- |
| **Page Title** | `text-2xl font-semibold tracking-tight text-white sm:text-3xl` | Top-level page headers |
| **Page Description** | `mt-1 max-w-xl text-sm text-gray-400` | Under page title |
| **Section Eyebrow** | `text-xs font-semibold text-gray-400 uppercase tracking-wider` | Section titles (e.g., "Quick actions") |
| **Stat Card Label** | `text-[11px] font-semibold text-gray-400 uppercase tracking-wider` | Metric card header |
| **Stat Card Value** | `text-xl sm:text-base font-semibold text-white tracking-tight font-mono` | **Always use `font-mono`** for numbers |
| **Stat Card Detail** | `mt-1 text-xs text-gray-400` | Explanatory subtext |
| **Card Section Header** | `text-sm sm:text-base font-semibold text-white` | Panel/table headers |
| **Action Link** | `text-xs sm:text-sm font-medium text-brand-300 hover:text-white` | "View all", "Generate new" |
| **List Row Title** | `text-xs sm:text-sm font-medium text-white truncate` | Primary row content |
| **List Row Subtitle** | `text-xs text-gray-400 truncate` | Secondary row metadata |
| **Monospace Data / Email** | `text-xs sm:text-sm text-gray-400 font-mono` | Emails, IDs, dates, counts |

---

### 1.4 Canonical Component Patterns (Dashboard Source of Truth)

#### 1. Page Header Pattern
```tsx
<section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      Page Title
    </h1>
    <p className="mt-1 max-w-xl text-sm text-gray-400">
      Descriptive summary of the current page workflows and features.
    </p>
  </div>
  <NavLink
    to="/action-route"
    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-400 shadow-none"
  >
    Primary Action
  </NavLink>
</section>
```

#### 2. Overview Stat Metric Cards (Grid of 4)
```tsx
<section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
  <article className="rounded-lg border border-white/10 bg-surface-900 p-4 py-2">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Metric Label
      </p>
      <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <p className="mt-2 text-xl sm:text-base font-semibold text-white tracking-tight font-mono">
      {metricValue}
    </p>
    <p className="mt-1 text-xs text-gray-400">Supporting detail or sub-metric</p>
  </article>
</section>
```

#### 3. Quick Action / Interactive Panels
```tsx
<NavLink
  to="/route"
  className="group rounded-lg border border-white/10 bg-surface-900 p-5 transition hover:border-white/20 hover:bg-white/5"
>
  <p className="mt-1 text-base font-semibold text-white">{action.title}</p>
  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">{action.description}</p>
  <span className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white">
    Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
  </span>
</NavLink>
```

#### 4. Data List / Feed Cards (Two-Column Split or Single Column)
```tsx
<article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
  <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
    <h2 className="text-sm sm:text-base font-semibold text-white">Section Title</h2>
    <NavLink to="/all" className="text-xs sm:text-sm font-medium text-brand-300 hover:text-white">
      View all
    </NavLink>
  </div>
  <div className="divide-y divide-white/5">
    {items.map((item) => (
      <div
        key={item.id}
        className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="min-w-0">
          <p className="truncate text-xs sm:text-sm font-medium text-white">{item.title}</p>
          <p className="truncate text-xs text-gray-400">{item.subtitle}</p>
        </div>
        <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
          {item.monoDetail}
        </span>
      </div>
    ))}
  </div>
</article>
```

#### 5. Buttons & Controls
- **Primary Button**:
  `h-9 px-4 rounded-md bg-brand text-white font-semibold text-sm hover:bg-brand-400 shadow-none transition`
- **Compact Secondary / Outline Button**:
  `h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors`
- **Destructive Button**:
  `border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs sm:text-sm px-3 h-9 rounded-md transition-colors`
- **Status Badge / Pill**:
  `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans`

---

### 1.5 Strict Rules & Anti-Patterns Checklist
1. ❌ **NO arbitrary dark backgrounds**: Never use `bg-gray-800`, `bg-zinc-900`, `bg-slate-900`, or light backgrounds for containers. Use `bg-surface-900` for cards and `bg-surface-950` for root/headers.
2. ❌ **NO heavy shadow utilities**: Never use `shadow-lg`, `shadow-xl`, or colored glow drop-shadows on cards. Rely on `border border-white/10` and `shadow-none`.
3. ❌ **NO generic colors for links or CTA**: Do not use standard blue (`text-blue-500`) or standard purple. Use `bg-brand` (`#6f34ed`), `hover:bg-brand-400`, and `text-brand-300`.
4. ❌ **NO non-monospace metrics**: Numbers, quantities, quotas, and email addresses must use `font-mono`.
5. ❌ **NO missing uppercase headers**: Card eyebrow titles and section headers must use `text-[11px]` or `text-xs font-semibold text-gray-400 uppercase tracking-wider`.
6. ❌ **NO mismatched border styling**: Card borders must be `border-white/10`. Row dividers inside lists must be `divide-white/5`.
