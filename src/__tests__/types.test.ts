/**
 * Tests for TypeScript types
 * Verifies that all types are properly defined and can be used correctly
 */

import type {
  ApiError,
  BatchCreateOrderItemsRequest,
  BatchUpdateOrderItemStatusRequest,
  CreateBillRequest,
  CreateOrderRequest,
  CreatePaymentRequest,
  KitchenViewResponse,
  LoginRequest,
  LoginResponse,
  OrderCreatedEvent,
  OrderItemCreatedEvent,
  PaginatedResponse,
  SSEEventType,
  SSETopic,
  WaiterCallEvent,
} from '../types/api';
// Import actual enum values for runtime tests
import {
  BillStatus as BillStatusEnum,
  CustomerType as CustomerTypeEnum,
  DayOfWeek as DayOfWeekEnum,
  DevicePlatform as DevicePlatformEnum,
  DeviceType as DeviceTypeEnum,
  DiscountApplicableTo as DiscountApplicableToEnum,
  DiscountType as DiscountTypeEnum,
  DiscountValueType as DiscountValueTypeEnum,
  MenuCategoryType as MenuCategoryTypeEnum,
  OrderItemStatus as OrderItemStatusEnum,
  OrderStatus as OrderStatusEnum,
  OrderType as OrderTypeEnum,
  PaymentMethod as PaymentMethodEnum,
  ReasonTemplateType as ReasonTemplateTypeEnum,
  ReservationStatus as ReservationStatusEnum,
  Role as RoleEnum,
  ServiceFeeType as ServiceFeeTypeEnum,
  SortOrder as SortOrderEnum,
  WaiterCallStatus as WaiterCallStatusEnum,
} from '../types/enums';
import type {
  Account,
  Bill,
  Customer,
  Discount,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  Reservation,
  Table,
  Translation,
  WaiterCall,
  Zone,
} from '../types/models';

describe('Enums', () => {
  describe('Role', () => {
    it('should have all required values', () => {
      expect(RoleEnum.SUPERADMIN).toBe('superadmin');
      expect(RoleEnum.ADMIN).toBe('admin');
      expect(RoleEnum.MANAGER).toBe('manager');
      expect(RoleEnum.CASHIER).toBe('cashier');
      expect(RoleEnum.WAITER).toBe('waiter');
      expect(RoleEnum.BAR).toBe('bar');
      expect(RoleEnum.KITCHEN).toBe('kitchen');
    });

    it('should have exactly 7 values', () => {
      const values = Object.values(RoleEnum);
      expect(values).toHaveLength(7);
    });
  });

  describe('OrderType', () => {
    it('should have all required values', () => {
      expect(OrderTypeEnum.DELIVERY).toBe('Delivery');
      expect(OrderTypeEnum.DINE_IN).toBe('Dine-in');
      expect(OrderTypeEnum.TO_GO).toBe('To go');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(OrderTypeEnum);
      expect(values).toHaveLength(3);
    });
  });

  describe('OrderStatus', () => {
    it('should have all required values', () => {
      expect(OrderStatusEnum.PENDING).toBe('Pending');
      expect(OrderStatusEnum.IN_PROGRESS).toBe('InProgress');
      expect(OrderStatusEnum.COMPLETED).toBe('Completed');
      expect(OrderStatusEnum.CANCELLED).toBe('Cancelled');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(OrderStatusEnum);
      expect(values).toHaveLength(4);
    });
  });

  describe('OrderItemStatus', () => {
    it('should have all required values', () => {
      expect(OrderItemStatusEnum.PENDING).toBe('Pending');
      expect(OrderItemStatusEnum.SENT_TO_PREPARE).toBe('SentToPrepare');
      expect(OrderItemStatusEnum.PREPARING).toBe('Preparing');
      expect(OrderItemStatusEnum.READY).toBe('Ready');
      expect(OrderItemStatusEnum.SERVED).toBe('Served');
      expect(OrderItemStatusEnum.DECLINED).toBe('Declined');
      expect(OrderItemStatusEnum.CANCELED).toBe('Canceled');
    });

    it('should have exactly 7 values', () => {
      const values = Object.values(OrderItemStatusEnum);
      expect(values).toHaveLength(7);
    });
  });

  describe('WaiterCallStatus', () => {
    it('should have all required values', () => {
      expect(WaiterCallStatusEnum.PENDING).toBe('pending');
      expect(WaiterCallStatusEnum.ACKNOWLEDGED).toBe('acknowledged');
      expect(WaiterCallStatusEnum.COMPLETED).toBe('completed');
      expect(WaiterCallStatusEnum.CANCELLED).toBe('cancelled');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(WaiterCallStatusEnum);
      expect(values).toHaveLength(4);
    });
  });

  describe('MenuCategoryType', () => {
    it('should have all required values', () => {
      expect(MenuCategoryTypeEnum.BAR).toBe('bar');
      expect(MenuCategoryTypeEnum.KITCHEN).toBe('kitchen');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(MenuCategoryTypeEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('PaymentMethod', () => {
    it('should have all required values', () => {
      expect(PaymentMethodEnum.CASH).toBe('Cash');
      expect(PaymentMethodEnum.BANK_CARD).toBe('BankCard');
      expect(PaymentMethodEnum.GAPJYK_PAY).toBe('GapjykPay');
      expect(PaymentMethodEnum.CUSTOMER_ACCOUNT).toBe('CustomerAccount');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(PaymentMethodEnum);
      expect(values).toHaveLength(4);
    });
  });

  describe('ReservationStatus', () => {
    it('should have all required values', () => {
      expect(ReservationStatusEnum.PENDING).toBe('Pending');
      expect(ReservationStatusEnum.CONFIRMED).toBe('Confirmed');
      expect(ReservationStatusEnum.CANCELLED).toBe('Cancelled');
      expect(ReservationStatusEnum.COMPLETED).toBe('Completed');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(ReservationStatusEnum);
      expect(values).toHaveLength(4);
    });
  });

  describe('CustomerType', () => {
    it('should have all required values', () => {
      expect(CustomerTypeEnum.NEW).toBe('New');
      expect(CustomerTypeEnum.REGULAR).toBe('Regular');
      expect(CustomerTypeEnum.VIP).toBe('VIP');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(CustomerTypeEnum);
      expect(values).toHaveLength(3);
    });
  });

  describe('DeviceType', () => {
    it('should have all required values', () => {
      expect(DeviceTypeEnum.MOBILE).toBe('mobile');
      expect(DeviceTypeEnum.DESKTOP).toBe('desktop');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(DeviceTypeEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('DevicePlatform', () => {
    it('should have all required values', () => {
      expect(DevicePlatformEnum.IOS).toBe('ios');
      expect(DevicePlatformEnum.ANDROID).toBe('android');
      expect(DevicePlatformEnum.WINDOWS).toBe('windows');
      expect(DevicePlatformEnum.MACOS).toBe('macos');
      expect(DevicePlatformEnum.LINUX).toBe('linux');
      expect(DevicePlatformEnum.WEB).toBe('web');
    });

    it('should have exactly 6 values', () => {
      const values = Object.values(DevicePlatformEnum);
      expect(values).toHaveLength(6);
    });
  });

  describe('SortOrder', () => {
    it('should have all required values', () => {
      expect(SortOrderEnum.ASC).toBe('ASC');
      expect(SortOrderEnum.DESC).toBe('DESC');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(SortOrderEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('ServiceFeeType', () => {
    it('should have all required values', () => {
      expect(ServiceFeeTypeEnum.PERCENTAGE).toBe('Percentage');
      expect(ServiceFeeTypeEnum.FIXED).toBe('Fixed');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(ServiceFeeTypeEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('DiscountType', () => {
    it('should have all required values', () => {
      expect(DiscountTypeEnum.MANUAL).toBe('Manual');
      expect(DiscountTypeEnum.AUTOMATIC).toBe('Automatic');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(DiscountTypeEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('DiscountValueType', () => {
    it('should have all required values', () => {
      expect(DiscountValueTypeEnum.PERCENTAGE).toBe('Percentage');
      expect(DiscountValueTypeEnum.FIXED).toBe('Fixed');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(DiscountValueTypeEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('DiscountApplicableTo', () => {
    it('should have all required values', () => {
      expect(DiscountApplicableToEnum.ORDER).toBe('Order');
      expect(DiscountApplicableToEnum.ITEM).toBe('Item');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(DiscountApplicableToEnum);
      expect(values).toHaveLength(2);
    });
  });

  describe('BillStatus', () => {
    it('should have all required values', () => {
      expect(BillStatusEnum.DRAFT).toBe('draft');
      expect(BillStatusEnum.FINALIZED).toBe('finalized');
      expect(BillStatusEnum.PAID).toBe('paid');
      expect(BillStatusEnum.CANCELLED).toBe('cancelled');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(BillStatusEnum);
      expect(values).toHaveLength(4);
    });
  });

  describe('ReasonTemplateType', () => {
    it('should have all required values', () => {
      expect(ReasonTemplateTypeEnum.DISCOUNT).toBe('discount');
      expect(ReasonTemplateTypeEnum.REFUND).toBe('refund');
      expect(ReasonTemplateTypeEnum.CANCELLATION).toBe('cancellation');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(ReasonTemplateTypeEnum);
      expect(values).toHaveLength(3);
    });
  });

  describe('DayOfWeek', () => {
    it('should have all required values', () => {
      expect(DayOfWeekEnum.MONDAY).toBe('Monday');
      expect(DayOfWeekEnum.TUESDAY).toBe('Tuesday');
      expect(DayOfWeekEnum.WEDNESDAY).toBe('Wednesday');
      expect(DayOfWeekEnum.THURSDAY).toBe('Thursday');
      expect(DayOfWeekEnum.FRIDAY).toBe('Friday');
      expect(DayOfWeekEnum.SATURDAY).toBe('Saturday');
      expect(DayOfWeekEnum.SUNDAY).toBe('Sunday');
    });

    it('should have exactly 7 values', () => {
      const values = Object.values(DayOfWeekEnum);
      expect(values).toHaveLength(7);
    });
  });
});

describe('Models', () => {
  describe('Translation', () => {
    it('should accept valid translation object', () => {
      const translation: Translation = {
        en: 'Hello',
        ru: 'Привет',
        tm: 'Salam',
      };
      expect(translation.en).toBe('Hello');
      expect(translation.ru).toBe('Привет');
      expect(translation.tm).toBe('Salam');
    });
  });

  describe('Account', () => {
    it('should accept valid account object', () => {
      const account: Account = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'waiter001',
        role: RoleEnum.WAITER,
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      expect(account.id).toBeDefined();
      expect(account.username).toBe('waiter001');
      expect(account.role).toBe(RoleEnum.WAITER);
    });
  });

  describe('Zone', () => {
    it('should accept valid zone object', () => {
      const zone: Zone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: { en: 'Main Hall', ru: 'Главный зал', tm: 'Esasy zal' },
        isActive: true,
        x: '0',
        y: '0',
      };
      expect(zone.id).toBeDefined();
      expect(zone.title.en).toBe('Main Hall');
      expect(zone.isActive).toBe(true);
    });

    it('should accept zone with tables', () => {
      const zone: Zone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: { en: 'Main Hall', ru: 'Главный зал', tm: 'Esasy zal' },
        isActive: true,
        x: '0',
        y: '0',
        tables: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Table 1',
            capacity: 4,
            zoneId: '123e4567-e89b-12d3-a456-426614174000',
            x: '100',
            y: '200',
            width: '80',
            height: '80',
            color: '#CCCCCC',
          },
        ],
      };
      expect(zone.tables).toHaveLength(1);
    });
  });

  describe('Table', () => {
    it('should accept valid table object', () => {
      const table: Table = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Table 1',
        capacity: 4,
        zoneId: '123e4567-e89b-12d3-a456-426614174001',
        x: '100',
        y: '200',
        width: '80',
        height: '80',
        color: '#CCCCCC',
      };
      expect(table.title).toBe('Table 1');
      expect(table.capacity).toBe(4);
    });
  });

  describe('WaiterCall', () => {
    it('should accept valid waiter call object', () => {
      const call: WaiterCall = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tableId: '123e4567-e89b-12d3-a456-426614174001',
        waiterId: null,
        status: WaiterCallStatusEnum.PENDING,
        createdAt: '2024-01-01T00:00:00.000Z',
        acknowledgedAt: null,
        completedAt: null,
      };
      expect(call.status).toBe(WaiterCallStatusEnum.PENDING);
      expect(call.waiterId).toBeNull();
    });
  });

  describe('Order', () => {
    it('should accept valid order object', () => {
      const order: Order = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 1,
        orderCode: '240101-123456-001',
        orderType: OrderTypeEnum.DINE_IN,
        orderStatus: OrderStatusEnum.PENDING,
        totalAmount: '150.00',
        tableId: '123e4567-e89b-12d3-a456-426614174001',
        waiterId: '123e4567-e89b-12d3-a456-426614174002',
        issuedById: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(order.orderType).toBe(OrderTypeEnum.DINE_IN);
      expect(order.orderStatus).toBe(OrderStatusEnum.PENDING);
    });
  });

  describe('OrderItem', () => {
    it('should accept valid order item object', () => {
      const item: OrderItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderId: '123e4567-e89b-12d3-a456-426614174001',
        menuItemId: '123e4567-e89b-12d3-a456-426614174002',
        quantity: '2',
        status: OrderItemStatusEnum.PENDING,
        itemTitle: { en: 'Pizza', ru: 'Пицца', tm: 'Pizza' },
        itemPrice: '50.00',
        subtotal: '100.00',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(item.status).toBe(OrderItemStatusEnum.PENDING);
      expect(item.quantity).toBe('2');
    });
  });

  describe('MenuItem', () => {
    it('should accept valid menu item object', () => {
      const menuItem: MenuItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: { en: 'Margherita Pizza', ru: 'Пицца Маргарита', tm: 'Margherita Pizza' },
        price: '50.00',
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        imagePath: '/uploads/menu/pizza.jpg',
        isActive: true,
        isGroup: false,
      };
      expect(menuItem.title.en).toBe('Margherita Pizza');
      expect(menuItem.isActive).toBe(true);
    });
  });

  describe('Customer', () => {
    it('should accept valid customer object', () => {
      const customer: Customer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+99361234567',
        deposit: '100.00',
        credit: '0.00',
        customerType: CustomerTypeEnum.REGULAR,
      };
      expect(customer.firstName).toBe('John');
      expect(customer.customerType).toBe(CustomerTypeEnum.REGULAR);
    });
  });

  describe('Bill', () => {
    it('should accept valid bill object', () => {
      const bill: Bill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderId: '123e4567-e89b-12d3-a456-426614174001',
        subtotal: '100.00',
        discountAmount: '10.00',
        totalAmount: '90.00',
        paidAmount: '90.00',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(bill.subtotal).toBe('100.00');
      expect(bill.totalAmount).toBe('90.00');
    });
  });

  describe('Payment', () => {
    it('should accept valid payment object', () => {
      const payment: Payment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        billId: '123e4567-e89b-12d3-a456-426614174001',
        amount: '50.00',
        paymentMethod: PaymentMethodEnum.CASH,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(payment.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(payment.amount).toBe('50.00');
    });
  });

  describe('Discount', () => {
    it('should accept valid discount object', () => {
      const discount: Discount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: { en: '10% Off', ru: 'Скидка 10%', tm: '10% arzanladyş' },
        discountType: DiscountTypeEnum.MANUAL,
        discountValueType: DiscountValueTypeEnum.PERCENTAGE,
        discountValue: '10',
        applicableTo: DiscountApplicableToEnum.ORDER,
        isActive: true,
      };
      expect(discount.discountType).toBe(DiscountTypeEnum.MANUAL);
      expect(discount.discountValueType).toBe(DiscountValueTypeEnum.PERCENTAGE);
    });
  });

  describe('Reservation', () => {
    it('should accept valid reservation object', () => {
      const reservation: Reservation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reservationNumber: 'RES-20240101-001',
        status: ReservationStatusEnum.CONFIRMED,
        dateTime: '2024-01-15T19:00:00.000Z',
        numberOfGuests: 4,
        tableId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(reservation.status).toBe(ReservationStatusEnum.CONFIRMED);
      expect(reservation.numberOfGuests).toBe(4);
    });
  });
});

describe('API Types', () => {
  describe('LoginRequest', () => {
    it('should accept valid login request', () => {
      const request: LoginRequest = {
        username: 'waiter001',
        password: 'password123',
      };
      expect(request.username).toBe('waiter001');
      expect(request.password).toBe('password123');
    });
  });

  describe('LoginResponse', () => {
    it('should accept valid login response', () => {
      const response: LoginResponse = {
        account: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'waiter001',
          role: RoleEnum.WAITER,
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        sessionId: '64-character-hex-string',
      };
      expect(response.sessionId).toBeDefined();
      expect(response.account.role).toBe(RoleEnum.WAITER);
    });
  });

  describe('PaginatedResponse', () => {
    it('should accept valid paginated response', () => {
      const response: PaginatedResponse<{ id: string }> = {
        data: [{ id: '1' }, { id: '2' }],
        total: 100,
      };
      expect(response.data).toHaveLength(2);
      expect(response.total).toBe(100);
    });
  });

  describe('ApiError', () => {
    it('should accept valid API error', () => {
      const error: ApiError = {
        status: 'error',
        message: 'Invalid credentials',
      };
      expect(error.status).toBe('error');
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('CreateOrderRequest', () => {
    it('should accept valid create order request for dine-in', () => {
      const request: CreateOrderRequest = {
        orderType: OrderTypeEnum.DINE_IN,
        tableId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(request.orderType).toBe(OrderTypeEnum.DINE_IN);
      expect(request.tableId).toBeDefined();
    });

    it('should accept valid create order request for delivery', () => {
      const request: CreateOrderRequest = {
        orderType: OrderTypeEnum.DELIVERY,
        address: '123 Main St',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(request.orderType).toBe(OrderTypeEnum.DELIVERY);
      expect(request.address).toBeDefined();
    });
  });

  describe('BatchCreateOrderItemsRequest', () => {
    it('should accept valid batch create request', () => {
      const request: BatchCreateOrderItemsRequest = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 2,
            notes: 'No onions',
            extras: [{ extraId: '123e4567-e89b-12d3-a456-426614174002', quantity: 1 }],
          },
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174003',
            quantity: 1,
          },
        ],
      };
      expect(request.items).toHaveLength(2);
      expect(request.items[0].extras).toHaveLength(1);
    });
  });

  describe('BatchUpdateOrderItemStatusRequest', () => {
    it('should accept valid batch update status request', () => {
      const request: BatchUpdateOrderItemStatusRequest = {
        ids: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
        status: OrderItemStatusEnum.READY,
      };
      expect(request.ids).toHaveLength(2);
      expect(request.status).toBe(OrderItemStatusEnum.READY);
    });

    it('should accept request with decline reason', () => {
      const request: BatchUpdateOrderItemStatusRequest = {
        ids: ['123e4567-e89b-12d3-a456-426614174000'],
        status: OrderItemStatusEnum.DECLINED,
        declineReason: 'Out of stock',
        declineReasonId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(request.declineReason).toBe('Out of stock');
    });
  });

  describe('CreateBillRequest', () => {
    it('should accept valid create bill request', () => {
      const request: CreateBillRequest = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            orderItemId: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 2,
            price: '50.00',
          },
        ],
      };
      expect(request.orderId).toBeDefined();
      expect(request.items).toHaveLength(1);
    });
  });

  describe('CreatePaymentRequest', () => {
    it('should accept valid create payment request', () => {
      const request: CreatePaymentRequest = {
        billId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50.0,
        method: PaymentMethodEnum.CASH,
      };
      expect(request.method).toBe(PaymentMethodEnum.CASH);
      expect(request.amount).toBe(50.0);
    });
  });

  describe('KitchenViewResponse', () => {
    it('should accept valid kitchen view response', () => {
      const response: KitchenViewResponse = {
        pending: [],
        preparing: [],
        ready: [],
      };
      expect(response.pending).toEqual([]);
      expect(response.preparing).toEqual([]);
      expect(response.ready).toEqual([]);
    });
  });
});

describe('SSE Event Types', () => {
  describe('WaiterCallEvent', () => {
    it('should accept valid waiter call event', () => {
      const event: WaiterCallEvent = {
        callId: '123e4567-e89b-12d3-a456-426614174000',
        tableId: '123e4567-e89b-12d3-a456-426614174001',
        tableTitle: 'Table 1',
        zoneName: 'Main Hall',
        zoneId: '123e4567-e89b-12d3-a456-426614174002',
        waiterId: null,
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(event.tableTitle).toBe('Table 1');
      expect(event.zoneName).toBe('Main Hall');
    });
  });

  describe('OrderCreatedEvent', () => {
    it('should accept valid order created event', () => {
      const event: OrderCreatedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 1,
        orderCode: '240101-123456-001',
        orderType: OrderTypeEnum.DINE_IN,
        tableId: '123e4567-e89b-12d3-a456-426614174001',
        waiterId: '123e4567-e89b-12d3-a456-426614174002',
        totalAmount: '0',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(event.orderType).toBe(OrderTypeEnum.DINE_IN);
      expect(event.totalAmount).toBe('0');
    });
  });

  describe('OrderItemCreatedEvent', () => {
    it('should accept valid order item created event', () => {
      const event: OrderItemCreatedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderId: '123e4567-e89b-12d3-a456-426614174001',
        menuItemId: '123e4567-e89b-12d3-a456-426614174002',
        itemTitle: { en: 'Pizza', ru: 'Пицца', tm: 'Pizza' },
        quantity: '2',
        status: OrderItemStatusEnum.PENDING,
        menuType: MenuCategoryTypeEnum.KITCHEN,
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(event.menuType).toBe(MenuCategoryTypeEnum.KITCHEN);
      expect(event.status).toBe(OrderItemStatusEnum.PENDING);
    });
  });

  describe('SSEEventType', () => {
    it('should allow valid event types', () => {
      const eventTypes: SSEEventType[] = [
        'waiter:call',
        'waiter:call-acknowledged',
        'waiter:call-completed',
        'waiter:call-cancelled',
        'order:created',
        'order:updated',
        'order-item:created',
        'order-item:updated',
      ];
      expect(eventTypes).toHaveLength(8);
    });
  });

  describe('SSETopic', () => {
    it('should allow valid topics', () => {
      const topics: SSETopic[] = ['org', 'waiter', 'kitchen', 'bar'];
      expect(topics).toHaveLength(4);
    });
  });
});

describe('Type exports from index', () => {
  it('should be able to import all types from index', async () => {
    // This test verifies that the index file exports everything correctly
    const types = await import('../types');

    // Check enums are exported
    expect(types.Role).toBeDefined();
    expect(types.OrderType).toBeDefined();
    expect(types.OrderStatus).toBeDefined();
    expect(types.OrderItemStatus).toBeDefined();
    expect(types.WaiterCallStatus).toBeDefined();
    expect(types.MenuCategoryType).toBeDefined();
    expect(types.PaymentMethod).toBeDefined();
    expect(types.ReservationStatus).toBeDefined();
    expect(types.CustomerType).toBeDefined();
    expect(types.DeviceType).toBeDefined();
    expect(types.DevicePlatform).toBeDefined();
    expect(types.SortOrder).toBeDefined();
    expect(types.ServiceFeeType).toBeDefined();
    expect(types.DiscountType).toBeDefined();
    expect(types.DiscountValueType).toBeDefined();
    expect(types.DiscountApplicableTo).toBeDefined();
    expect(types.BillStatus).toBeDefined();
    expect(types.ReasonTemplateType).toBeDefined();
    expect(types.DayOfWeek).toBeDefined();
  });
});
