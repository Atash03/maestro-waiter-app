# Common Errors Guide

This document helps prevent common React/React Native errors in this codebase.

## 1. Maximum Update Depth Exceeded

### What it means
React detected an infinite loop of re-renders, usually caused by state updates triggering more state updates.

### Common Causes

#### Including `router` in useEffect dependencies
The `router` object from `useRouter()` (Expo Router) is **not referentially stable** and may change on every render.

```tsx
// BAD - causes infinite loops
useEffect(() => {
  if (someCondition) {
    router.replace('/somewhere');
  }
}, [someCondition, router]); // router causes re-runs!
```

```tsx
// GOOD - router excluded from dependencies
useEffect(() => {
  if (someCondition) {
    router.replace('/somewhere');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [someCondition]); // Only re-run when someCondition changes
```

#### Duplicate navigation logic
Having multiple components/hooks trying to handle the same navigation creates race conditions.

```tsx
// BAD - useProtectedRoute already handles auth redirects
// Don't add another redirect in login.tsx
useEffect(() => {
  if (isAuthenticated) {
    router.replace('/(tabs)');
  }
}, [isAuthenticated]);
```

**Solution:** Use centralized navigation logic in `useProtectedRoute` hook only.

#### Setting state during render
```tsx
// BAD - causes infinite loop
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Called every render!
  return <Text>{count}</Text>;
}
```

#### Missing dependency causing stale closure + state update
```tsx
// BAD - stale closure causes repeated updates
useEffect(() => {
  setItems([...items, newItem]); // items is stale
}, [newItem]); // missing items dependency

// GOOD - use functional update
useEffect(() => {
  setItems(prev => [...prev, newItem]);
}, [newItem]);
```

### How to Debug
1. Check the component stack in the error message
2. Look for useEffect hooks with navigation or state updates
3. Check if `router` or other unstable references are in dependency arrays
4. Look for duplicate logic handling the same concern

---

## 2. Unstable Dependencies in useEffect

### Objects and Functions
Objects and functions created during render are new references each time.

```tsx
// BAD - config is new object every render
const config = { timeout: 1000 };
useEffect(() => {
  doSomething(config);
}, [config]); // Runs every render!

// GOOD - memoize or move outside component
const config = useMemo(() => ({ timeout: 1000 }), []);
useEffect(() => {
  doSomething(config);
}, [config]);
```

### Store Functions
Zustand store functions are stable, but if you destructure them in render, ESLint may flag them.

```tsx
// These are stable and safe to include
const { initialize, login, logout } = useAuthStore();
```

---

## 3. Navigation Best Practices

### Centralized Auth Navigation
All authentication-based navigation should go through `useProtectedRoute` hook in `_layout.tsx`.

**Do NOT add auth redirects in:**
- Individual screen components (login.tsx, etc.)
- Other custom hooks
- Component useEffects

### When to use router methods
- `router.push()` - Add to history stack (user can go back)
- `router.replace()` - Replace current screen (no back)
- `router.back()` - Go back one screen

---

## 4. Zustand Store Patterns

### Avoid subscribing to entire store
```tsx
// BAD - re-renders on ANY store change
const store = useAuthStore();

// GOOD - only re-renders when specific values change
const isAuthenticated = useAuthStore(state => state.isAuthenticated);
const { login, logout } = useAuthStore();
```

### Selector returning new object causes infinite re-renders
**This is a critical pattern that causes "Maximum update depth exceeded" errors!**

Zustand uses reference equality by default. If your selector returns a new object, it will trigger re-renders even if the values inside haven't changed.

```tsx
// BAD - creates new object every render, causes infinite loops!
export const useRememberMe = () =>
  useAuthStore((state) => ({
    rememberMe: state.rememberMe,
    savedUsername: state.savedUsername,
  }));
```

```tsx
// GOOD - use useShallow for object selectors
import { useShallow } from 'zustand/react/shallow';

export const useRememberMe = () =>
  useAuthStore(
    useShallow((state) => ({
      rememberMe: state.rememberMe,
      savedUsername: state.savedUsername,
    }))
  );
```

**Alternative solutions:**
1. Select primitive values individually:
```tsx
const rememberMe = useAuthStore(state => state.rememberMe);
const savedUsername = useAuthStore(state => state.savedUsername);
```

2. Use `useShallow` from `zustand/react/shallow` for object selectors (preferred for hooks)

### Why this happens
- Zustand compares selector results by reference (`===`)
- `{ a: 1 } !== { a: 1 }` (different object references)
- New object = Zustand thinks state changed = re-render = new object = infinite loop
