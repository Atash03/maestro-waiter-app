/**
 * Main Route Group Layout
 *
 * Protected routes for the main app functionality.
 * Includes order creation, order detail, and other authenticated screens.
 */

import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="order/new"
        options={{
          headerShown: true,
          title: 'New Order',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: false,
          title: 'Order Details',
        }}
      />
      <Stack.Screen
        name="bill/[orderId]"
        options={{
          headerShown: false,
          title: 'Bill',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
