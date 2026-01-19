# Maestro Backend - Waiter App API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL & Headers](#base-url--headers)
3. [Authentication](#authentication)
4. [Enums & Types](#enums--types)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Waiter Calls](#waiter-call-endpoints)
   - [Orders](#order-endpoints)
   - [Order Items](#order-item-endpoints)
   - [Tables & Zones](#table--zone-endpoints)
   - [Menu](#menu-endpoints)
   - [Customers](#customer-endpoints)
   - [Bills & Payments](#bill--payment-endpoints)
   - [Discounts](#discount-endpoints)
   - [Extras](#extra-endpoints)
   - [Reservations](#reservation-endpoints)
   - [Service Fees](#service-fee-endpoints)
   - [Reason Templates](#reason-template-endpoints)
6. [Real-time SSE Events](#real-time-sse-events)
7. [Error Handling](#error-handling)

---

## Overview

This documentation covers all API endpoints and features needed for waiter app development. The Maestro backend is a restaurant management system built with Express.js and TypeScript.

**Key Features:**
- Session-based authentication (NOT JWT)
- Role-based access control (RBAC)
- Real-time updates via Server-Sent Events (SSE)
- Multi-language support (en, ru, tm)
- Device tracking and limits

---

## Base URL & Headers

### Base URL
```
http://{HOST}:{PORT}/api/v1
```

### Required Headers for All Authenticated Requests

```http
maestro-session-id: {session_id_from_login}
x-device-id: {unique_device_uuid}
x-device-type: mobile | desktop
x-device-platform: ios | android | windows | macos | linux | web
x-device-name: {optional_device_name}
x-app-version: {optional_app_version}
Content-Type: application/json
```

**Important Notes:**
- `maestro-session-id` - Obtained from login response
- `x-device-id` - Generate once and persist on device (UUID format recommended)
- `x-device-type` - Use `mobile` for iOS/Android apps
- `x-device-platform` - Use `ios` or `android` accordingly
- Device headers are **required** for non-superadmin accounts

---

## Authentication

### Session Management

The system uses **Redis-backed session tokens** with the following characteristics:

| Property | Value |
|----------|-------|
| TTL | 24 hours |
| Auto-refresh | Yes (each request extends session) |
| Storage | Redis |
| Format | 64-character hex string |

### Authentication Flow

```
1. POST /auth/login with credentials
2. Receive sessionId in response
3. Store sessionId securely on device
4. Include maestro-session-id header in all subsequent requests
5. Session auto-refreshes on each valid request
6. POST /auth/logout to invalidate session
```

### Device Tracking

The system tracks devices per organization with limits:
- `deviceLimit` - Desktop/tablet devices
- `mobileDeviceLimit` - Mobile devices

If device limit is exceeded, authentication will fail with 403.

---

## Enums & Types

### Role
```typescript
enum Role {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  BAR = 'bar',
  KITCHEN = 'kitchen'
}
```

### OrderType
```typescript
enum OrderType {
  DELIVERY = 'Delivery',
  DINE_IN = 'Dine-in',
  TO_GO = 'To go'
}
```

### OrderStatus
```typescript
enum OrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}
```

### OrderItemStatus
```typescript
enum OrderItemStatus {
  PENDING = 'Pending',
  SENT_TO_PREPARE = 'SentToPrepare',
  PREPARING = 'Preparing',
  READY = 'Ready',
  SERVED = 'Served',
  DECLINED = 'Declined',
  CANCELED = 'Canceled'
}
```

### WaiterCallStatus
```typescript
enum WaiterCallStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

### MenuCategoryType
```typescript
enum MenuCategoryType {
  BAR = 'bar',
  KITCHEN = 'kitchen'
}
```

### PaymentMethod
```typescript
enum PaymentMethod {
  CASH = 'Cash',
  BANK_CARD = 'BankCard',
  GAPJYK_PAY = 'GapjykPay',
  CUSTOMER_ACCOUNT = 'CustomerAccount'
}
```

### ReservationStatus
```typescript
enum ReservationStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}
```

### CustomerType
```typescript
enum CustomerType {
  NEW = 'New',
  REGULAR = 'Regular',
  VIP = 'VIP'
}
```

### Translation Type
```typescript
interface Translation {
  en: string;  // English
  ru: string;  // Russian
  tm: string;  // Turkmen
}
```

---

## API Endpoints

### Authentication Endpoints

#### Login
```http
POST /auth/login
```

**Auth Required:** No

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "account": {
    "id": "uuid",
    "username": "string",
    "role": "waiter",
    "organizationId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "sessionId": "64-character-hex-string"
}
```

**Error Responses:**
- 401: Invalid credentials
- 429: Rate limited (too many attempts)

---

#### Check Session
```http
GET /auth/check
```

**Auth Required:** Yes

**Response (200):**
```json
{
  "id": "uuid",
  "username": "string",
  "role": "waiter",
  "organizationId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Logout
```http
POST /auth/logout
```

**Auth Required:** Yes

**Response (200):** Empty response

---

### Waiter Call Endpoints

#### Create Waiter Call (Public)
```http
POST /waiter-call
```

**Auth Required:** No (Public endpoint for customers)

**Request Body:**
```json
{
  "tableId": "uuid",
  "reason": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tableId": "uuid",
  "waiterId": "uuid or null",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Get Pending Waiter Calls
```http
GET /waiter-call
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | number | 0 | Offset for pagination |
| take | number | 10 | Limit for pagination |
| status | string | 'pending' | Filter by status |
| tableId | uuid | - | Filter by table |
| waiterId | uuid | - | Filter by waiter |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "tableId": "uuid",
      "waiterId": "uuid or null",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "acknowledgedAt": null,
      "completedAt": null,
      "table": {
        "id": "uuid",
        "title": "Table 1",
        "zone": {
          "id": "uuid",
          "title": { "en": "VIP", "ru": "ВИП", "tm": "VIP" }
        }
      }
    }
  ],
  "total": 10
}
```

---

#### Get Waiter Call by ID
```http
GET /waiter-call/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "id": "uuid",
  "tableId": "uuid",
  "waiterId": "uuid or null",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "acknowledgedAt": null,
  "completedAt": null,
  "table": {
    "id": "uuid",
    "title": "Table 1",
    "zone": {
      "id": "uuid",
      "title": { "en": "VIP", "ru": "ВИП", "tm": "VIP" }
    }
  }
}
```

---

#### Acknowledge Waiter Call
```http
PUT /waiter-call/:id/acknowledge
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "id": "uuid",
  "status": "acknowledged",
  "acknowledgedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Complete Waiter Call
```http
PUT /waiter-call/:id/complete
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "id": "uuid",
  "status": "completed",
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Cancel Waiter Call
```http
PUT /waiter-call/:id/cancel
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "id": "uuid",
  "status": "cancelled"
}
```

---

### Order Endpoints

#### Create Order
```http
POST /order
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderType": "Dine-in",
  "tableId": "uuid (required for Dine-in)",
  "customerId": "uuid (optional)",
  "serviceFeeId": "uuid (optional)",
  "description": "string (optional)",
  "notes": "string (optional)",
  "address": "string (required for Delivery)",
  "pickupTime": "ISO8601 (optional for To go/Delivery)"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderNumber": 1,
  "orderCode": "240101-123456-001",
  "orderType": "Dine-in",
  "orderStatus": "Pending",
  "tableId": "uuid",
  "waiterId": "uuid",
  "issuedById": "uuid",
  "totalAmount": "0",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Get All Orders
```http
GET /order
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by order code/number |
| status | string | Filter by OrderStatus |
| orderType | string | Filter by OrderType |
| tableId | uuid | Filter by table |
| waiterId | uuid | Filter by waiter |
| customerId | uuid | Filter by customer |
| fromDate | ISO8601 | Start date filter |
| toDate | ISO8601 | End date filter |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": 1,
      "orderCode": "240101-123456-001",
      "orderType": "Dine-in",
      "orderStatus": "Pending",
      "totalAmount": "150.00",
      "tableId": "uuid",
      "waiterId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "table": {
        "id": "uuid",
        "title": "Table 1"
      },
      "waiter": {
        "id": "uuid",
        "username": "waiter001"
      },
      "orderItems": []
    }
  ],
  "total": 100
}
```

---

#### Get Order by ID
```http
GET /order/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "id": "uuid",
  "orderNumber": 1,
  "orderCode": "240101-123456-001",
  "orderType": "Dine-in",
  "orderStatus": "InProgress",
  "totalAmount": "150.00",
  "tableId": "uuid",
  "waiterId": "uuid",
  "issuedById": "uuid",
  "serviceFeeId": "uuid",
  "serviceFeeTitle": { "en": "Service", "ru": "Обслуживание", "tm": "Hyzmat" },
  "serviceFeeType": "Percentage",
  "serviceFeePercent": "10",
  "serviceFeeAmount": "15.00",
  "description": "string",
  "notes": "string",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "table": { ... },
  "waiter": { ... },
  "customer": { ... },
  "orderItems": [
    {
      "id": "uuid",
      "menuItemId": "uuid",
      "quantity": "2",
      "status": "Pending",
      "itemTitle": { "en": "Pizza", "ru": "Пицца", "tm": "Pizza" },
      "itemPrice": "50.00",
      "subtotal": "100.00",
      "extras": []
    }
  ]
}
```

---

#### Update Order
```http
PUT /order/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderStatus": "InProgress (optional)",
  "tableId": "uuid (optional)",
  "customerId": "uuid (optional)",
  "description": "string (optional)",
  "notes": "string (optional)",
  "cancelReason": "string (required if cancelling)"
}
```

**Response (200):** Updated order object

---

### Order Item Endpoints

#### Create Order Item
```http
POST /order-item
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderId": "uuid",
  "menuItemId": "uuid (required if not stockId)",
  "stockId": "uuid (required if not menuItemId)",
  "quantity": 2,
  "notes": "string (optional, max 500 chars)",
  "orderType": "Dine-in (optional)",
  "extras": [
    {
      "extraId": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "menuItemId": "uuid",
  "quantity": "2",
  "status": "Pending",
  "itemTitle": { "en": "Pizza", "ru": "Пицца", "tm": "Pizza" },
  "itemPrice": "50.00",
  "subtotal": "100.00",
  "notes": "No onions",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Batch Create Order Items
```http
POST /order-item/batch
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderId": "uuid",
  "items": [
    {
      "menuItemId": "uuid",
      "quantity": 2,
      "notes": "string (optional)",
      "extras": []
    },
    {
      "menuItemId": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response (201):** Array of created order items

---

#### Get All Order Items
```http
GET /order-item
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| orderId | uuid | Filter by order |
| status | string | Filter by OrderItemStatus |
| menuType | string | Filter by MenuCategoryType (bar/kitchen) |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "menuItemId": "uuid",
      "quantity": "2",
      "status": "Pending",
      "itemTitle": { "en": "Pizza", "ru": "Пицца", "tm": "Pizza" },
      "itemPrice": "50.00",
      "subtotal": "100.00",
      "notes": "No onions",
      "menuType": "kitchen",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "order": { ... },
      "menuItem": { ... },
      "extras": []
    }
  ],
  "total": 50
}
```

---

#### Get Order Item by ID
```http
GET /order-item/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Response (200):** Single order item object

---

#### Update Order Item
```http
PUT /order-item/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "quantity": 3,
  "notes": "string (optional)",
  "extras": []
}
```

**Response (200):** Updated order item object

---

#### Batch Update Order Item Status
```http
PATCH /order-item/batch/status
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Request Body:**
```json
{
  "ids": ["uuid", "uuid"],
  "status": "Ready",
  "declineReason": "string (required if Declined)",
  "declineReasonId": "uuid (optional)",
  "cancelReason": "string (required if Canceled)",
  "cancelReasonId": "uuid (optional)"
}
```

**Response (200):** Array of updated order items

---

#### Get Kitchen View
```http
GET /order-item/kitchen/view
```

**Auth Required:** Yes
**Roles:** MANAGER, ADMIN, KITCHEN, BAR

**Response (200):**
```json
{
  "pending": [...],
  "preparing": [...],
  "ready": [...]
}
```

---

### Table & Zone Endpoints

#### Get All Tables
```http
GET /table
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| zoneId | uuid | Filter by zone |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Table 1",
      "capacity": 4,
      "zoneId": "uuid",
      "x": "100",
      "y": "200",
      "width": "80",
      "height": "80",
      "color": "#CCCCCC",
      "zone": {
        "id": "uuid",
        "title": { "en": "Main Hall", "ru": "Главный зал", "tm": "Esasy zal" }
      }
    }
  ],
  "total": 20
}
```

---

#### Get Table by ID
```http
GET /table/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single table object with zone details

---

#### Get All Zones
```http
GET /zone
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| isActive | boolean | Filter by active status |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "Main Hall", "ru": "Главный зал", "tm": "Esasy zal" },
      "isActive": true,
      "x": "0",
      "y": "0",
      "tables": [...]
    }
  ],
  "total": 5
}
```

---

#### Get Zone by ID
```http
GET /zone/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single zone object with tables

---

### Menu Endpoints

#### Get All Menu Categories
```http
GET /menu-category
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| type | string | Filter by MenuCategoryType |
| parentId | uuid | Filter by parent category |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "Appetizers", "ru": "Закуски", "tm": "Işdäaçarlar" },
      "type": "kitchen",
      "imagePath": "/uploads/categories/appetizers.jpg",
      "parentId": null,
      "children": [...]
    }
  ],
  "total": 10
}
```

---

#### Get Menu Category by ID
```http
GET /menu-category/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single category object

---

#### Get All Menu Items
```http
GET /menu-item
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| categoryId | uuid | Filter by category |
| isActive | boolean | Filter by active status |
| isGroup | boolean | Filter group items |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "Margherita Pizza", "ru": "Пицца Маргарита", "tm": "Margherita Pizza" },
      "description": { "en": "Classic...", "ru": "Классическая...", "tm": "Klassiki..." },
      "price": "50.00",
      "categoryId": "uuid",
      "imagePath": "/uploads/menu/pizza.jpg",
      "isActive": true,
      "isGroup": false,
      "timeForPreparation": "00:15:00",
      "availability": [
        { "day": "Monday", "startTime": "10:00", "endTime": "22:00" }
      ],
      "category": {
        "id": "uuid",
        "title": { "en": "Pizza", "ru": "Пицца", "tm": "Pizza" },
        "type": "kitchen"
      },
      "extras": [...]
    }
  ],
  "total": 50
}
```

---

#### Get Menu Item by ID
```http
GET /menu-item/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN, KITCHEN, BAR

**Response (200):** Single menu item with all details

---

### Customer Endpoints

#### Get All Customers
```http
GET /customer
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by name/phone |
| customerType | string | Filter by CustomerType |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+99361234567",
      "deposit": "100.00",
      "credit": "0.00",
      "dateOfBirth": "1990-01-15",
      "customerType": "Regular",
      "addresses": [
        { "address": "123 Main St", "isDefault": true }
      ]
    }
  ],
  "total": 100
}
```

---

#### Get Customer by ID
```http
GET /customer/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single customer object

---

### Bill & Payment Endpoints

#### Create Bill
```http
POST /bill
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderId": "uuid",
  "customerId": "uuid (optional)",
  "items": [
    {
      "orderItemId": "uuid",
      "quantity": 2,
      "price": "50.00"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "subtotal": "100.00",
  "discountAmount": "0.00",
  "totalAmount": "100.00",
  "paidAmount": "0.00",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Get All Bills
```http
GET /bill
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "customerId": "uuid",
      "subtotal": "100.00",
      "discountAmount": "10.00",
      "totalAmount": "90.00",
      "paidAmount": "90.00",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "order": { ... },
      "customer": { ... },
      "billItems": [...],
      "payments": [...]
    }
  ],
  "total": 50
}
```

---

#### Get Bill by ID
```http
GET /bill/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single bill with all details

---

#### Update Bill
```http
PUT /bill/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "status": "draft | finalized | paid | cancelled",
  "notes": "string (optional)"
}
```

---

#### Update Bill Discounts
```http
PUT /bill/:id/discounts
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "discountIds": ["uuid", "uuid"],
  "customDiscountAmount": 10.00
}
```

---

#### Calculate Bill
```http
POST /bill/calculate
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "orderId": "uuid",
  "discountIds": ["uuid"],
  "customDiscountAmount": 0
}
```

**Response (200):**
```json
{
  "subtotal": "100.00",
  "discountAmount": "10.00",
  "serviceFeeAmount": "9.00",
  "totalAmount": "99.00"
}
```

---

#### Create Payment
```http
POST /payment
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "billId": "uuid",
  "amount": 50.00,
  "method": "Cash",
  "transactionId": "string (optional)",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "billId": "uuid",
  "amount": "50.00",
  "paymentMethod": "Cash",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### Get All Payments
```http
GET /payment
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Array of payment objects

---

### Discount Endpoints

#### Get All Discounts
```http
GET /discount
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| isActive | boolean | Filter active only |
| discountType | string | Filter by DiscountType |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "10% Off", "ru": "Скидка 10%", "tm": "10% arzanladyş" },
      "description": { ... },
      "discountType": "Manual",
      "discountValueType": "Percentage",
      "discountValue": "10",
      "applicableTo": "Order",
      "isActive": true,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    }
  ],
  "total": 10
}
```

---

#### Get Discount by ID
```http
GET /discount/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single discount object

---

#### Calculate Discounts
```http
POST /discount/calculate
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "billAmount": 100.00,
  "itemIds": ["uuid"],
  "discountIds": ["uuid"],
  "customerId": "uuid (optional)"
}
```

**Response (200):**
```json
{
  "totalDiscount": "10.00",
  "discounts": [
    {
      "discountId": "uuid",
      "amount": "10.00",
      "type": "Percentage"
    }
  ]
}
```

---

### Extra Endpoints

#### Get All Extras
```http
GET /extra
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by title |
| isActive | boolean | Filter active only |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "Extra Cheese", "ru": "Дополнительный сыр", "tm": "Goşmaça peýnir" },
      "description": { ... },
      "actualPrice": "5.00",
      "isActive": true
    }
  ],
  "total": 15
}
```

---

#### Get Extra by ID
```http
GET /extra/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single extra object

---

### Reservation Endpoints

#### Get All Reservations
```http
GET /reservation
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by reservation number |
| status | string | Filter by ReservationStatus |
| tableId | uuid | Filter by table |
| customerId | uuid | Filter by customer |
| fromDate | ISO8601 | Start date filter |
| toDate | ISO8601 | End date filter |
| sortBy | string | Sort field |
| sortOrder | ASC/DESC | Sort direction |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "reservationNumber": "RES-20240101-001",
      "status": "Confirmed",
      "dateTime": "2024-01-15T19:00:00.000Z",
      "numberOfGuests": 4,
      "tableId": "uuid",
      "customerId": "uuid",
      "table": { ... },
      "customer": { ... }
    }
  ],
  "total": 20
}
```

---

#### Create Reservation
```http
POST /reservation
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "customerId": "uuid (optional)",
  "tableId": "uuid",
  "dateTime": "2024-01-15T19:00:00.000Z",
  "numberOfGuests": 4,
  "notes": "string (optional)"
}
```

**Response (201):** Created reservation object

---

#### Get Reservation by ID
```http
GET /reservation/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Single reservation object

---

#### Update Reservation
```http
PUT /reservation/:id
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "tableId": "uuid (optional)",
  "dateTime": "ISO8601 (optional)",
  "numberOfGuests": 4,
  "status": "Confirmed | Cancelled | Completed",
  "notes": "string (optional)"
}
```

---

### Service Fee Endpoints

#### Get All Service Fees
```http
GET /service-fee
```

**Auth Required:** Yes
**Roles:** MANAGER, ADMIN (read), WAITER, CASHIER (delivery-options only)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": { "en": "Service Charge", "ru": "Плата за обслуживание", "tm": "Hyzmat tölegi" },
      "type": "Percentage",
      "percent": "10",
      "amount": null,
      "orderType": "Dine-in"
    }
  ],
  "total": 3
}
```

---

#### Get Delivery Options
```http
GET /service-fee/delivery-options
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Response (200):** Array of delivery-type service fees

---

### Reason Template Endpoints

#### Get All Reason Templates
```http
GET /reason-template
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | number | Pagination offset |
| take | number | Pagination limit |
| search | string | Search by name |
| type | string | Filter by type |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Out of stock",
      "type": "cancellation",
      "description": "Item is not available"
    }
  ],
  "total": 10
}
```

---

#### Create Reason Template
```http
POST /reason-template
```

**Auth Required:** Yes
**Roles:** WAITER, CASHIER, MANAGER, ADMIN

**Request Body:**
```json
{
  "name": "string",
  "type": "discount | refund | cancellation",
  "description": "string (optional)"
}
```

---

## Real-time SSE Events

### Connecting to SSE

```http
GET /sse
Headers:
  maestro-session-id: {session_id}
  x-maestro-topics: waiter,org
  Last-Event-ID: {last_event_id} (optional, for reconnection)
```

### Topics

| Topic | Description | Events |
|-------|-------------|--------|
| `org` | Organization-wide events | order:created, order:updated, etc. |
| `waiter` | Waiter-specific events | waiter:call, waiter:call-acknowledged, etc. |
| `kitchen` | Kitchen events | order-item:created (food items) |
| `bar` | Bar events | order-item:created (beverage items) |

### Event Format

```
event: {event_type}
id: {event_id}
data: {json_payload}

: heartbeat (every 15 seconds)
```

### Waiter Events

#### waiter:call
```json
{
  "callId": "uuid",
  "tableId": "uuid",
  "tableTitle": "Table 1",
  "zoneName": "Main Hall",
  "zoneId": "uuid",
  "waiterId": "uuid or null",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### waiter:call-acknowledged
```json
{
  "callId": "uuid",
  "waiterId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### waiter:call-completed
```json
{
  "callId": "uuid",
  "waiterId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### waiter:call-cancelled
```json
{
  "callId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Order Events

#### order:created
```json
{
  "id": "uuid",
  "orderNumber": 1,
  "orderCode": "240101-123456-001",
  "orderType": "Dine-in",
  "tableId": "uuid",
  "waiterId": "uuid",
  "totalAmount": "0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### order:updated
```json
{
  "id": "uuid",
  "orderStatus": "InProgress",
  "totalAmount": "150.00",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### order-item:created
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "menuItemId": "uuid",
  "itemTitle": { "en": "Pizza", "ru": "Пицца", "tm": "Pizza" },
  "quantity": "2",
  "status": "Pending",
  "menuType": "kitchen",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### order-item:updated
```json
{
  "id": "uuid",
  "status": "Ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Reconnection

To handle reconnection with event replay:

1. Store the last received event ID
2. On reconnection, include `Last-Event-ID` header
3. Server will replay all events after that ID

### Example Client Code (React Native)

```typescript
import EventSource from 'react-native-sse';

const connectSSE = (sessionId: string, topics: string[]) => {
  const es = new EventSource(
    `${BASE_URL}/sse`,
    {
      headers: {
        'maestro-session-id': sessionId,
        'x-maestro-topics': topics.join(','),
      },
    }
  );

  es.addEventListener('connected', (event) => {
    console.log('SSE Connected:', event.data);
  });

  es.addEventListener('waiter:call', (event) => {
    const data = JSON.parse(event.data);
    // Handle new waiter call
  });

  es.addEventListener('order:created', (event) => {
    const data = JSON.parse(event.data);
    // Handle new order
  });

  es.addEventListener('order-item:updated', (event) => {
    const data = JSON.parse(event.data);
    // Handle item status update
  });

  es.onerror = (error) => {
    console.error('SSE Error:', error);
    // Implement reconnection logic
  };

  return es;
};
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "status": "error",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request body, validation error |
| 401 | Unauthorized | Missing or invalid session |
| 403 | Forbidden | Role check failed, device limit exceeded, org paused |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded (login) |
| 500 | Server Error | Unexpected server error |

### Common Error Scenarios

#### Invalid Session (401)
```json
{
  "status": "error",
  "message": "Invalid or expired session"
}
```

#### Missing Device Headers (403)
```json
{
  "status": "error",
  "message": "Device headers are required"
}
```

#### Device Limit Exceeded (403)
```json
{
  "status": "error",
  "message": "Device limit exceeded for this organization"
}
```

#### Organization Paused (403)
```json
{
  "status": "error",
  "message": "Organization is currently paused"
}
```

#### Role Not Authorized (403)
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

#### Validation Error (400)
```json
{
  "status": "error",
  "message": "\"orderId\" is required"
}
```

---

## Quick Reference - Waiter App Essentials

### Authentication Headers (All Requests)
```
maestro-session-id: {session_id}
x-device-id: {device_uuid}
x-device-type: mobile
x-device-platform: ios | android
Content-Type: application/json
```

### Most Used Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Login | POST | /auth/login |
| Check Session | GET | /auth/check |
| Logout | POST | /auth/logout |
| Get Pending Calls | GET | /waiter-call |
| Acknowledge Call | PUT | /waiter-call/:id/acknowledge |
| Complete Call | PUT | /waiter-call/:id/complete |
| Get Tables | GET | /table |
| Get Zones | GET | /zone |
| Get Menu Categories | GET | /menu-category |
| Get Menu Items | GET | /menu-item |
| Create Order | POST | /order |
| Get Orders | GET | /order |
| Add Order Item | POST | /order-item |
| Update Item Status | PATCH | /order-item/batch/status |
| Get Customers | GET | /customer |
| Create Bill | POST | /bill |
| Create Payment | POST | /payment |
| Get Discounts | GET | /discount |
| Get Extras | GET | /extra |
| Connect SSE | GET | /sse |

### Waiter Role Permissions Summary

**CAN Access:**
- Waiter calls (view, acknowledge, complete, cancel)
- Orders (create, view, update)
- Order items (create, view, update status)
- Tables (view)
- Zones (view)
- Menu categories (view)
- Menu items (view)
- Customers (view)
- Bills (create, view, update)
- Payments (create, view)
- Discounts (view, calculate)
- Extras (view)
- Reservations (create, view, update)
- Reason templates (CRUD)
- SSE real-time events

**CANNOT Access:**
- Account management
- Organization settings
- Inventory/Stock management
- Financial reports
- Analytics
- Schedule management
- Device management
