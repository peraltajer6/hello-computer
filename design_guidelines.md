# Messaging App Design Guidelines

## Design Approach
**System Selected**: Material Design  
**Rationale**: Messaging apps prioritize clarity, efficiency, and established interaction patterns. Material Design provides robust components for chat interfaces, list views, and real-time updates with clear visual hierarchy.

## Layout Architecture

### Application Structure
Three-screen layout system:

1. **Login Screen**: Full-viewport centered card (max-w-md) with name input field
2. **Main Interface**: Two-column layout
   - Left sidebar (w-80): Conversation list and search
   - Right panel (flex-1): Active chat area
3. **Mobile**: Single column stack with slide-over navigation

### Spacing System
Use Tailwind units: **2, 3, 4, 6, 8** for consistent rhythm
- Component padding: p-4 to p-6
- Message gaps: gap-3
- Section spacing: py-6 to py-8
- Tight elements (badges, chips): p-2

## Typography Hierarchy

**Font Family**: Inter (Google Fonts)
- Primary font with excellent readability at small sizes

**Scale**:
- Username headers: text-lg font-semibold
- Message text: text-base font-normal
- Timestamps: text-xs text-gray-500
- Input placeholders: text-sm
- Button text: text-sm font-medium

## Core Components

### Login Screen
- Centered card with subtle shadow
- Large heading (text-3xl font-bold)
- Single text input with prominent styling
- Primary action button (full width)
- Error message display area below input

### Conversation Sidebar
- Search bar at top (sticky positioning)
- Scrollable conversation list
- Each conversation item displays:
  - Username (text-sm font-semibold)
  - Last message preview (text-sm truncate)
  - Timestamp (text-xs)
  - Unread indicator (small badge)
- Active conversation highlighted state

### Chat Area
- Header bar with recipient name and status
- Scrollable message container (flex-col-reverse for bottom anchoring)
- Message input bar (sticky bottom)

### Message Bubbles
**Sent Messages**:
- Right-aligned, max-w-md
- Rounded corners (rounded-2xl rounded-br-sm for tail effect)
- Padding: px-4 py-2

**Received Messages**:
- Left-aligned, max-w-md
- Rounded corners (rounded-2xl rounded-bl-sm)
- Padding: px-4 py-2

**Timestamps**: Below each message, text-xs, right-aligned for sent, left-aligned for received

### Input Area
- Text input field (flex-1)
- Send button (icon button, rounded-full)
- Container with border-top separator
- Fixed height (h-16), flex layout with items-center

### User Search
- Input field with search icon prefix
- Dropdown results list (absolute positioning)
- Each result: clickable row with username
- Empty state message when no results

## Component Specifications

### Buttons
- Primary: Rounded (rounded-lg), medium padding (px-6 py-3)
- Icon buttons: Circular (rounded-full), compact (p-2)
- Hover states handled internally

### Form Inputs
- Border styling with focus states
- Height: h-12 for standard inputs
- Rounded corners: rounded-lg
- Padding: px-4

### Cards & Containers
- Conversation cards: rounded-lg with subtle shadow
- Main chat container: border-left separator
- Login card: rounded-xl with shadow-lg

## Icons
**Library**: Heroicons (CDN)
- Search icon: magnifying glass
- Send message: paper airplane
- User profile: user circle
- Menu/navigation: bars-3

## Layout Behavior

### Responsive Breakpoints
- Mobile (< 768px): Single column, slide-over sidebar
- Desktop (≥ 768px): Two-column layout

### Scrolling
- Conversation list: Vertical scroll with fixed search bar
- Message area: Auto-scroll to bottom on new message, smooth scrolling
- Message input: Always visible (sticky bottom)

### States
- Loading: Skeleton screens for conversation list
- Empty: Center-aligned message with icon for no conversations
- Error: Inline error messages (username taken, network error)
- Active conversation: Highlighted background in sidebar

## Interaction Patterns

### Login Flow
1. Enter username → Validate uniqueness → Proceed to main interface
2. Show inline error if username exists

### Messaging Flow
1. Search user → Select from results → Start conversation
2. Click existing conversation → Load message history
3. Type message → Send (Enter key or button)

### Real-time Updates
- New messages appear immediately with subtle fade-in
- Conversation list reorders on new message
- Typing indicators not included (keep simple)

## Accessibility
- All interactive elements have proper focus states
- Form inputs include labels (can be visually hidden with sr-only)
- Message containers have proper ARIA roles
- Keyboard navigation support for conversation list and search results

**Note**: No images required for this utility-focused application. Focus on clean, functional interface with clear information hierarchy.