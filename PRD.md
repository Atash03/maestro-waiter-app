# Maestro Waiter App - Product Requirements Document

## Overview

A React Native waiter application for the Maestro restaurant management system. This app enables waitstaff to manage tables, take orders, handle customer requests, and process payments efficiently.

**Target Platforms**: iOS, Android
**Tech Stack**: React Native, Expo 54, TypeScript, Expo Router

---

## Skills & Best Practices

The coding agent MUST use the following skills during implementation:

| Skill | When to Use |
|-------|-------------|
| `/react-native-best-practices` | Performance optimization, FPS, memory leaks, re-renders, animations |
| `/vercel-react-best-practices` | React component patterns, state management, data fetching |
| `/building-ui` | Expo Router navigation, styling, components, animations, native tabs |
| `/web-design-guidelines` | UI review, accessibility, UX patterns |
| `/data-fetching` | API calls, React Query/SWR, caching, offline support, error handling |
| `/use-dom` | If any web components need to run in native |
| `/dev-client` | Building and distributing development clients |
| `/api-routes` | If API routes are needed in Expo Router |
| `/rams` | Accessibility and visual design review |
| `/frontend-design` | Component structure, design patterns |

---

## Architecture Guidelines

### Component Structure
```
src/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Auth group (login, etc.)
│   ├── (main)/              # Main app group (protected)
│   │   ├── (tabs)/          # Tab navigation
│   │   │   ├── tables/      # Table management
│   │   │   ├── orders/      # Order management
│   │   │   ├── calls/       # Waiter calls
│   │   │   └── profile/     # User profile
│   │   └── order/[id].tsx   # Order detail screen
│   └── _layout.tsx          # Root layout
├── components/
│   ├── ui/                  # Base UI components (Button, Input, Card, etc.)
│   ├── tables/              # Table-related components
│   ├── orders/              # Order-related components
│   ├── menu/                # Menu-related components
│   └── common/              # Shared components (Header, Modal, etc.)
├── services/
│   ├── api/                 # API client and endpoints
│   ├── sse/                 # Server-Sent Events handler
│   └── storage/             # AsyncStorage utilities
├── stores/                  # State management (Zustand recommended)
├── hooks/                   # Custom hooks
├── utils/                   # Utility functions
├── types/                   # TypeScript types/interfaces
└── constants/               # App constants, theme, config
```

### State Management
- Use **Zustand** for global state (auth, notifications, settings)
- Use **React Query/TanStack Query** for server state (orders, menu, tables)
- Keep component state local when possible

### Animation Requirements
- Use **React Native Reanimated** for performant animations
- Implement smooth transitions between screens
- Add micro-interactions for better UX:
  - Button press feedback
  - List item swipe actions
  - Pull-to-refresh animations
  - Loading skeletons
  - Toast notifications with slide animations
  - Modal entrance/exit animations

---

## Backend API Reference

**Base URL**: `http://{HOST}:{PORT}/api/v1`

### Required Headers (All Authenticated Requests)
```
maestro-session-id: {session_id_from_login}
x-device-id: {unique_device_uuid}
x-device-type: mobile
x-device-platform: ios | android
Content-Type: application/json
```

### Key Enums
```typescript
enum OrderType { DELIVERY = 'Delivery', DINE_IN = 'Dine-in', TO_GO = 'To go' }
enum OrderStatus { PENDING = 'Pending', IN_PROGRESS = 'InProgress', COMPLETED = 'Completed', CANCELLED = 'Cancelled' }
enum OrderItemStatus { PENDING = 'Pending', SENT_TO_PREPARE = 'SentToPrepare', PREPARING = 'Preparing', READY = 'Ready', SERVED = 'Served', DECLINED = 'Declined', CANCELED = 'Canceled' }
enum WaiterCallStatus { PENDING = 'pending', ACKNOWLEDGED = 'acknowledged', COMPLETED = 'completed', CANCELLED = 'cancelled' }
enum PaymentMethod { CASH = 'Cash', BANK_CARD = 'BankCard', GAPJYK_PAY = 'GapjykPay', CUSTOMER_ACCOUNT = 'CustomerAccount' }
```

### Translation Type
```typescript
interface Translation { en: string; ru: string; tm: string; }
```

---

## Phase 1: Foundation & Authentication

### Goals
- Set up project structure and dependencies
- Implement secure authentication flow
- Establish API client and state management

### Tasks
- [x] **1.1** Install required dependencies:
  - `zustand` (state management)
  - `@tanstack/react-query` (server state)
  - `axios` or use native fetch (API calls)
  - `react-native-sse` (Server-Sent Events)
  - `@react-native-async-storage/async-storage` (persistence)
  - `react-native-uuid` (device ID generation)
  - `react-native-toast-message` (notifications)
  - `expo-secure-store` (secure credential storage)

- [x] **1.2** Create TypeScript types from API documentation:
  - `types/api.ts` - All API request/response types
  - `types/models.ts` - Domain models (Order, Table, MenuItem, etc.)
  - `types/enums.ts` - All enums (OrderStatus, PaymentMethod, etc.)

- [x] **1.3** Implement API client (`services/api/client.ts`):
  - Configure base URL and default headers
  - Implement request/response interceptors
  - Add automatic session header injection
  - Handle 401 (unauthorized) responses - redirect to login
  - Handle 403 (forbidden) responses - show appropriate error
  - Implement retry logic for network failures

- [x] **1.4** Create API endpoint modules:
  - `services/api/auth.ts` - login, logout, checkSession
  - `services/api/orders.ts` - CRUD operations
  - `services/api/orderItems.ts` - order item operations
  - `services/api/tables.ts` - table queries
  - `services/api/zones.ts` - zone queries
  - `services/api/menu.ts` - categories and items
  - `services/api/waiterCalls.ts` - call management
  - `services/api/bills.ts` - billing operations
  - `services/api/payments.ts` - payment processing
  - `services/api/customers.ts` - customer lookup
  - `services/api/discounts.ts` - discount queries
  - `services/api/extras.ts` - extras queries

- [x] **1.5** Implement auth store (`stores/authStore.ts`):
  - Session ID storage
  - User account info
  - Device ID management (generate once, persist)
  - Login/logout actions
  - Session validation on app start

- [x] **1.6** Create Login Screen (`app/(auth)/login.tsx`):
  - Clean, branded design with restaurant logo
  - Username and password fields with validation
  - "Remember me" option using SecureStore
  - Loading state during authentication
  - Error handling with user-friendly messages
  - Animated logo/welcome greeting
  - Handle device limit exceeded (403) gracefully

- [x] **1.7** Implement protected route logic:
  - Check session validity on app launch
  - Redirect to login if no valid session
  - Auto-refresh session on each request (handled by backend)

- [x] **1.8** Create base UI components (`components/ui/`):
  - `Button.tsx` - Primary, secondary, outline variants with press animation
  - `Input.tsx` - Text input with label, error state, icons
  - `Card.tsx` - Container with shadow and border radius
  - `Badge.tsx` - Status badges with colors
  - `Avatar.tsx` - User/table avatar
  - `Spinner.tsx` - Loading indicator
  - `Toast.tsx` - Notification toast component
  - `Modal.tsx` - Reusable modal with animations
  - `Skeleton.tsx` - Loading skeleton for lists

---

## Phase 2: Table Management & Floor Plan

### Goals
- Display interactive floor plan with tables
- Show table status and information
- Enable table selection for order creation

### Tasks
- [x] **2.1** Create table store (`stores/tableStore.ts`):
  - Cache tables and zones data
  - Track selected table
  - Filter tables by zone

- [x] **2.2** Implement Zones/Tables data fetching:
  - Use React Query for caching
  - `GET /zone` - Fetch all zones with tables
  - `GET /table` - Fetch all tables
  - Implement pull-to-refresh

- [x] **2.3** Create Floor Plan Screen (`app/(main)/(tabs)/tables/index.tsx`):
  - Display zones as tabs or segmented control
  - Interactive floor plan canvas
  - Tables positioned using x, y, width, height from API
  - Pinch-to-zoom and pan gestures
  - Zone background with proper dimensions

- [x] **2.4** Create Table Component (`components/tables/TableItem.tsx`):
  - Visual representation based on table shape/size
  - Color-coded status indication:
    - Available (green)
    - Occupied with active order (amber)
    - Has pending waiter call (red pulse animation)
    - Reserved (blue)
  - Display table title/number
  - Show guest count icon when occupied
  - Animated status transitions

- [x] **2.5** Implement Table Info Popup (`components/tables/TableInfoPopup.tsx`):
  - Triggered by long-press or tap-and-hold
  - Show: table name, capacity, current guests, time seated
  - Show active order summary if exists
  - Quick actions: View Order, New Order, Call Info

- [x] **2.6** Create Table Detail Modal (`components/tables/TableDetailModal.tsx`):
  - Full table information
  - Active order details with items
  - Action buttons: New Order, View Bill, Transfer Table
  - Order history for the table (today)

- [x] **2.7** Implement "My Section" View:
  - Filter to show only waiter's assigned tables (if applicable)
  - Highlight assigned tables vs other sections
  - Quick toggle between "My Tables" and "All Tables"

- [x] **2.8** Add table status legend:
  - Color key explaining each status
  - Collapsible for more screen space

---

## Phase 3: Menu & Order Creation

### Goals
- Display menu categories and items
- Enable order creation with customizations
- Implement live order summary

### Tasks
- [x] **3.1** Create menu store (`stores/menuStore.ts`):
  - Cache menu categories and items
  - Search/filter functionality
  - Recently used items tracking

- [x] **3.2** Implement Menu data fetching:
  - `GET /menu-category` - Categories with hierarchy
  - `GET /menu-item` - All active menu items
  - `GET /extra` - Available extras/add-ons
  - Pre-fetch on app load for faster access

- [x] **3.3** Create Order Entry Screen (`app/(main)/order/new.tsx`):
  - Accept tableId as parameter
  - Split-screen layout: Menu (left/top) + Order Summary (right/bottom)
  - Responsive to screen orientation

- [x] **3.4** Create Menu Categories Component (`components/menu/CategoryList.tsx`):
  - Horizontal scrollable category chips OR
  - Vertical list with collapsible subcategories
  - Color-coded by type (kitchen: orange, bar: blue)
  - Active category highlighting
  - Smooth scroll animation

- [x] **3.5** Create Menu Item Grid/List (`components/menu/MenuItemList.tsx`):
  - Grid view for tablets, list for phones
  - High-quality images with fallback
  - Item name, price, brief description
  - "Not available" state for inactive items
  - Quantity badges if already in order

- [x] **3.6** Create Menu Search (`components/menu/MenuSearch.tsx`):
  - Prominent search bar at top
  - Real-time filtering as user types
  - Search across name and description
  - Recent searches history
  - Voice search (optional enhancement)

- [x] **3.7** Create Menu Item Detail Modal (`components/menu/MenuItemModal.tsx`):
  - Large image with description
  - Price display
  - Quantity selector with +/- buttons
  - Available extras with checkboxes and quantities
  - Notes field for special requests (max 500 chars)
  - "Add to Order" button with animation
  - "Duplicate" button for repeat orders

- [x] **3.8** Create Live Order Summary (`components/orders/OrderSummary.tsx`):
  - Fixed sidebar (tablet) or bottom sheet (phone)
  - Real-time updates as items added
  - Each item shows: name, quantity, customizations, price
  - Edit icon to modify item
  - Swipe-to-delete with confirmation
  - Running subtotal
  - Service fee display (if applicable)
  - Total amount

- [x] **3.9** Implement Order Item Management:
  - Add item to order (local state first)
  - Edit item quantity and notes
  - Remove item from order
  - Duplicate item with same customizations

- [x] **3.10** Create "Send to Kitchen" Flow:
  - Large, prominent "Send Order" button
  - Confirmation modal: "Send X items to kitchen?"
  - Show loading state during API call
  - `POST /order` to create order (if new)
  - `POST /order-item/batch` to add all items
  - `PATCH /order-item/batch/status` to mark as SentToPrepare
  - Success confirmation with animation
  - Handle network errors with retry option
  - Disable button temporarily after send

---

## Phase 4: Active Order Management

### Goals
- View and manage active orders
- Track order item status
- Handle order modifications

### Tasks
- [x] **4.1** Create Orders List Screen (`app/(main)/(tabs)/orders/index.tsx`):
  - List all active orders (Pending, InProgress)
  - Filter by: status, order type, table
  - Sort by: time created, table number
  - Pull-to-refresh
  - Real-time updates via SSE

- [x] **4.2** Create Order Card Component (`components/orders/OrderCard.tsx`):
  - Order code and table info
  - Order type badge (Dine-in, Delivery, To go)
  - Status indicator with color
  - Time since created
  - Item count summary
  - Total amount
  - Tap to view details

- [x] **4.3** Create Order Detail Screen (`app/(main)/order/[id].tsx`):
  - Full order information
  - Customer info (if attached)
  - List of order items with status
  - Item status color coding:
    - Pending (gray)
    - SentToPrepare (yellow)
    - Preparing (orange)
    - Ready (green, highlighted)
    - Served (muted)
    - Declined/Canceled (red strikethrough)
  - Actions: Add Items, Mark Served, Create Bill

- [x] **4.4** Create Order Item Status Component (`components/orders/OrderItemStatus.tsx`):
  - Visual status indicator
  - Swipe actions or buttons:
    - Mark as Served (when Ready)
    - Cancel item (with reason)
  - Show decline reason if declined

- [x] **4.5** Implement "Add More Items" to existing order:
  - Navigate to menu with orderId
  - Add items to existing order
  - Send new items to kitchen

- [x] **4.6** Implement Order Modifications:
  - Change table (`PUT /order/:id` with new tableId)
  - Add/edit notes
  - Cancel order (with reason required)

- [x] **4.7** Implement item status updates:
  - `PATCH /order-item/batch/status`
  - Mark items as Served
  - Cancel items with reason
  - Reason templates from `GET /reason-template`

---

## Phase 5: Waiter Calls & Notifications

### Goals
- Real-time waiter call notifications
- Notification center for managing requests
- Quick response actions

### Tasks
- [x] **5.1** Implement SSE connection (`services/sse/sseClient.ts`):
  - Connect to `GET /sse` with session headers
  - Subscribe to topics: `waiter`, `org`
  - Handle reconnection on disconnect
  - Store last event ID for replay
  - Parse and dispatch events to stores

- [x] **5.2** Create notifications store (`stores/notificationStore.ts`):
  - Store active waiter calls
  - Track acknowledged vs pending
  - Badge count for unread
  - Sound/vibration preferences

- [x] **5.3** Implement Push Notification Handler:
  - `waiter:call` - New call notification
  - `waiter:call-acknowledged` - Update call status
  - `waiter:call-completed` - Remove from active
  - `waiter:call-cancelled` - Remove from active
  - Play sound + vibration for new calls

- [x] **5.4** Create Notification Toast (`components/common/CallNotification.tsx`):
  - Non-intrusive banner at top of screen
  - Color-coded by request type
  - Table number and request reason
  - Running timer showing wait time
  - Quick actions: Acknowledge, Dismiss
  - Slide-in animation

- [x] **5.5** Create Calls Screen (`app/(main)/(tabs)/calls/index.tsx`):
  - List all pending and recent calls
  - Filter: Pending, Acknowledged, Completed
  - Sort by time (newest first)
  - Real-time updates

- [x] **5.6** Create Call Card Component (`components/calls/CallCard.tsx`):
  - Table number with zone name
  - Call reason (if provided)
  - Time elapsed since call
  - Status badge
  - Action buttons:
    - Acknowledge (if pending)
    - Complete (if acknowledged)
    - Go to Table

- [x] **5.7** Implement Call Actions:
  - `PUT /waiter-call/:id/acknowledge` - Accept call
  - `PUT /waiter-call/:id/complete` - Mark done
  - `PUT /waiter-call/:id/cancel` - Cancel call
  - Optimistic updates for faster UI

- [x] **5.8** Add notification bell icon to header:
  - Badge showing pending call count
  - Tap to open calls screen
  - Pulsing animation when new calls

---

## Phase 6: Billing & Payments

### Goals
- Create and manage bills
- Apply discounts
- Process multiple payment methods

### Tasks
- [x] **6.1** Create Bill Screen (`app/(main)/bill/[orderId].tsx`):
  - Show order items to be billed
  - Item selection for split billing (future)
  - Subtotal, discounts, service fee, total
  - Payment section

- [x] **6.2** Implement Bill Creation:
  - `POST /bill` with orderId and items
  - `POST /bill/calculate` for preview
  - Handle service fees automatically

- [x] **6.3** Create Discount Selector (`components/bills/DiscountSelector.tsx`):
  - List available discounts from `GET /discount`
  - Show discount type (percentage/fixed)
  - Multi-select for applicable discounts
  - Custom discount amount input
  - Real-time total recalculation

- [x] **6.4** Implement discount application:
  - `PUT /bill/:id/discounts`
  - `POST /discount/calculate` for preview
  - Show discount breakdown

- [x] **6.5** Create Payment Form (`components/bills/PaymentForm.tsx`):
  - Payment method selector (Cash, BankCard, etc.)
  - Amount input (default to remaining balance)
  - Split payment support (multiple methods)
  - Transaction ID for card payments
  - Notes field

- [x] **6.6** Implement Payment Processing:
  - `POST /payment` for each payment
  - Handle partial payments
  - Show remaining balance
  - Success confirmation with receipt option

- [ ] **6.7** Create Bill Summary (`components/bills/BillSummary.tsx`):
  - Complete breakdown:
    - Subtotal
    - Discounts applied (itemized)
    - Service fee
    - Total
    - Paid amount
    - Remaining balance
  - Print/share receipt button (future)

---

## Phase 7: Profile & Settings

### Goals
- User profile management
- App settings
- Shift summary (simplified version)

### Tasks
- [ ] **7.1** Create Profile Screen (`app/(main)/(tabs)/profile/index.tsx`):
  - User info display (username, role)
  - Current session info
  - Today's activity summary:
    - Orders taken
    - Total sales
    - Calls handled
  - Settings link
  - Logout button

- [ ] **7.2** Implement Activity Summary:
  - Fetch orders filtered by `waiterId` and today's date
  - Calculate totals locally
  - Display key metrics

- [ ] **7.3** Create Settings Screen (`app/(main)/settings.tsx`):
  - Notification preferences (sound, vibration)
  - Theme selection (light/dark/system)
  - Language selection (en/ru/tm)
  - Default floor plan zoom level
  - About/version info

- [ ] **7.4** Implement Logout Flow:
  - Confirm logout dialog
  - Check for open orders assigned to waiter
  - Warning if open orders exist:
    - List open orders
    - Options: Go to Order, Transfer, Continue Logout
  - `POST /auth/logout` to invalidate session
  - Clear local storage
  - Navigate to login

- [ ] **7.5** Create language store and i18n setup:
  - Store selected language preference
  - Utility to get translated text from Translation objects
  - Fallback to 'en' if translation missing

---

## Phase 8: Polish & Optimization

### Goals
- Performance optimization
- Accessibility compliance
- Error handling & edge cases

### Tasks
- [ ] **8.1** Run `/react-native-best-practices` skill:
  - Optimize FPS and animations
  - Fix memory leaks
  - Reduce unnecessary re-renders
  - Optimize images and assets

- [ ] **8.2** Run `/rams` skill for accessibility review:
  - Screen reader support
  - Touch target sizes
  - Color contrast
  - Focus management

- [ ] **8.3** Implement comprehensive error handling:
  - Network error boundaries
  - API error toasts
  - Offline mode indicator
  - Retry mechanisms

- [ ] **8.4** Add loading states everywhere:
  - Skeleton loaders for lists
  - Shimmer effects
  - Progress indicators

- [ ] **8.5** Implement offline support:
  - Cache critical data (menu, tables)
  - Queue actions when offline
  - Sync when back online
  - Clear offline indicator

- [ ] **8.6** Add haptic feedback:
  - Button presses
  - Success/error actions
  - Pull-to-refresh
  - Swipe actions

- [ ] **8.7** Optimize bundle size:
  - Tree-shake unused code
  - Lazy load screens
  - Optimize images

- [ ] **8.8** End-to-end testing:
  - Login flow
  - Order creation flow
  - Payment flow
  - Call handling flow

---

## API Mapping Reference

| User Action | API Endpoint | Method |
|-------------|--------------|--------|
| Login | `/auth/login` | POST |
| Check Session | `/auth/check` | GET |
| Logout | `/auth/logout` | POST |
| Get Zones | `/zone` | GET |
| Get Tables | `/table` | GET |
| Get Menu Categories | `/menu-category` | GET |
| Get Menu Items | `/menu-item` | GET |
| Get Extras | `/extra` | GET |
| Create Order | `/order` | POST |
| Get Orders | `/order` | GET |
| Update Order | `/order/:id` | PUT |
| Add Order Items | `/order-item/batch` | POST |
| Update Item Status | `/order-item/batch/status` | PATCH |
| Get Waiter Calls | `/waiter-call` | GET |
| Acknowledge Call | `/waiter-call/:id/acknowledge` | PUT |
| Complete Call | `/waiter-call/:id/complete` | PUT |
| Get Customers | `/customer` | GET |
| Get Discounts | `/discount` | GET |
| Calculate Bill | `/bill/calculate` | POST |
| Create Bill | `/bill` | POST |
| Apply Discounts | `/bill/:id/discounts` | PUT |
| Create Payment | `/payment` | POST |
| Get Reason Templates | `/reason-template` | GET |
| Real-time Events | `/sse` | GET (SSE) |

---

## SSE Events to Handle

| Event | Action |
|-------|--------|
| `waiter:call` | Show notification, add to calls list |
| `waiter:call-acknowledged` | Update call status |
| `waiter:call-completed` | Remove from active calls |
| `waiter:call-cancelled` | Remove from active calls |
| `order:created` | Add to orders list (if relevant) |
| `order:updated` | Update order in list |
| `order-item:created` | Update order details |
| `order-item:updated` | Update item status, notify if Ready |

---

## Design Tokens

### Colors (extend existing theme)
```typescript
const brandColors = {
  primary: '#F94623',        // Main brand color - buttons, active states, accents
  primaryLight: '#FB6E4F',   // Lighter variant for hover/pressed states
  primaryDark: '#D63D1E',    // Darker variant for shadows/borders
};

const statusColors = {
  available: '#22C55E',      // Green
  occupied: '#F59E0B',       // Amber
  reserved: '#3B82F6',       // Blue
  needsAttention: '#EF4444', // Red
  ready: '#10B981',          // Emerald
  preparing: '#F97316',      // Orange
  pending: '#6B7280',        // Gray
};

const categoryColors = {
  kitchen: '#F97316',        // Orange
  bar: '#3B82F6',            // Blue
};
```

### Spacing
- Use consistent 4px grid (4, 8, 12, 16, 20, 24, 32, 48)
- Card padding: 16px
- List item padding: 12px vertical, 16px horizontal
- Screen padding: 16px (phone), 24px (tablet)

### Typography
- Headers: Bold, 18-24px
- Body: Regular, 14-16px
- Caption: Regular, 12px
- Prices: Semibold, monospace for alignment

---

## Notes for Coding Agent

1. **Always use skills** - Before implementing each phase, invoke the relevant skills listed at the top
2. **Mobile-first** - Design for phone screens first, then adapt for tablets
3. **Accessibility** - Use semantic components, proper labels, sufficient contrast
4. **Performance** - Use `useMemo`, `useCallback`, `React.memo` appropriately
5. **Error boundaries** - Wrap critical sections with error boundaries
6. **Offline resilience** - App should be usable with intermittent connectivity
7. **Animations** - Keep them subtle and purposeful, use Reanimated
8. **Testing** - Write unit tests for utilities, integration tests for flows

---

## Verification Checklist

After each phase, verify:
- [ ] App builds without errors
- [ ] TypeScript has no type errors
- [ ] Biome linting passes
- [ ] All new screens are navigable
- [ ] API calls work with real backend
- [ ] Animations are smooth (60fps)
- [ ] Works on both iOS and Android
- [ ] Dark mode works correctly
