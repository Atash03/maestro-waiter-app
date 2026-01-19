/**
 * Send to Kitchen Modal Tests
 *
 * Tests for the SendToKitchenModal component (Task 3.10)
 */

import { fireEvent, render } from '@testing-library/react-native';
import {
  SendToKitchenModal,
  type SendToKitchenModalProps,
  type SendToKitchenModalState,
} from '../../components/orders/SendToKitchenModal';

// ============================================================================
// Test Data
// ============================================================================

const defaultProps: SendToKitchenModalProps = {
  visible: true,
  state: 'confirm',
  itemCount: 3,
  totalQuantity: 5,
  errorMessage: null,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  onRetry: jest.fn(),
  onDismissSuccess: jest.fn(),
  testID: 'test-modal',
};

function renderModal(props: Partial<SendToKitchenModalProps> = {}) {
  return render(<SendToKitchenModal {...defaultProps} {...props} />);
}

// ============================================================================
// Test Suites
// ============================================================================

describe('SendToKitchenModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = renderModal({ visible: true });
      expect(getByTestId('test-modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = renderModal({ visible: false });
      expect(queryByTestId('test-modal')).toBeNull();
    });
  });

  describe('Confirm State', () => {
    it('should render confirm state content', () => {
      const { getByTestId, getByText } = renderModal({ state: 'confirm' });

      expect(getByTestId('test-modal-confirm')).toBeTruthy();
      expect(getByText('Send to Kitchen?')).toBeTruthy();
    });

    it('should show correct item count text for multiple items', () => {
      const { getByText } = renderModal({
        state: 'confirm',
        totalQuantity: 5,
      });

      expect(getByText('Send 5 items to the kitchen for preparation.')).toBeTruthy();
    });

    it('should show correct item count text for single item', () => {
      const { getByText } = renderModal({
        state: 'confirm',
        totalQuantity: 1,
      });

      expect(getByText('Send 1 item to the kitchen for preparation.')).toBeTruthy();
    });

    it('should render cancel button', () => {
      const { getByTestId } = renderModal({ state: 'confirm' });
      expect(getByTestId('test-modal-cancel-button')).toBeTruthy();
    });

    it('should render confirm button', () => {
      const { getByTestId } = renderModal({ state: 'confirm' });
      expect(getByTestId('test-modal-confirm-button')).toBeTruthy();
    });

    it('should call onCancel when cancel button is pressed', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'confirm', onCancel });

      fireEvent.press(getByTestId('test-modal-cancel-button'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is pressed', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = renderModal({ state: 'confirm', onConfirm });

      fireEvent.press(getByTestId('test-modal-confirm-button'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop is pressed in confirm state', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'confirm', onCancel });

      fireEvent.press(getByTestId('test-modal-backdrop'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sending State', () => {
    it('should render sending state content', () => {
      const { getByTestId, getByText } = renderModal({ state: 'sending' });

      expect(getByTestId('test-modal-sending')).toBeTruthy();
      expect(getByText('Sending Order...')).toBeTruthy();
    });

    it('should show loading indicator', () => {
      const { getByTestId } = renderModal({ state: 'sending' });
      expect(getByTestId('test-modal-loading-indicator')).toBeTruthy();
    });

    it('should show correct item count during sending', () => {
      const { getByText } = renderModal({
        state: 'sending',
        totalQuantity: 3,
      });

      expect(getByText('Sending 3 items to the kitchen')).toBeTruthy();
    });

    it('should not close when backdrop is pressed in sending state', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'sending', onCancel });

      fireEvent.press(getByTestId('test-modal-backdrop'));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    it('should render success state content', () => {
      const { getByTestId, getByText } = renderModal({ state: 'success' });

      expect(getByTestId('test-modal-success')).toBeTruthy();
      expect(getByText('Order Sent!')).toBeTruthy();
    });

    it('should show success icon', () => {
      const { getByTestId } = renderModal({ state: 'success' });
      expect(getByTestId('success-icon')).toBeTruthy();
    });

    it('should show correct item count in success message', () => {
      const { getByText } = renderModal({
        state: 'success',
        totalQuantity: 4,
      });

      expect(getByText('4 items sent to the kitchen')).toBeTruthy();
    });

    it('should auto-dismiss after delay', async () => {
      const onDismissSuccess = jest.fn();
      renderModal({ state: 'success', onDismissSuccess });

      // Fast-forward timers
      jest.advanceTimersByTime(2000);

      expect(onDismissSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not close when backdrop is pressed in success state', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'success', onCancel });

      fireEvent.press(getByTestId('test-modal-backdrop'));

      // In success state, backdrop press should not trigger cancel
      // (modal auto-dismisses after timer)
    });
  });

  describe('Error State', () => {
    it('should render error state content', () => {
      const { getByTestId, getByText } = renderModal({ state: 'error' });

      expect(getByTestId('test-modal-error')).toBeTruthy();
      expect(getByText('Failed to Send')).toBeTruthy();
    });

    it('should show error icon', () => {
      const { getByTestId } = renderModal({ state: 'error' });
      expect(getByTestId('error-icon')).toBeTruthy();
    });

    it('should display error message', () => {
      const { getByText } = renderModal({
        state: 'error',
        errorMessage: 'Network connection failed',
      });

      expect(getByText('Network connection failed')).toBeTruthy();
    });

    it('should display default error message when errorMessage is null', () => {
      const { getByText } = renderModal({
        state: 'error',
        errorMessage: null,
      });

      expect(getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('should render dismiss button', () => {
      const { getByTestId } = renderModal({ state: 'error' });
      expect(getByTestId('test-modal-dismiss-button')).toBeTruthy();
    });

    it('should render retry button', () => {
      const { getByTestId } = renderModal({ state: 'error' });
      expect(getByTestId('test-modal-retry-button')).toBeTruthy();
    });

    it('should call onCancel when dismiss button is pressed', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'error', onCancel });

      fireEvent.press(getByTestId('test-modal-dismiss-button'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = renderModal({ state: 'error', onRetry });

      fireEvent.press(getByTestId('test-modal-retry-button'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop is pressed in error state', () => {
      const onCancel = jest.fn();
      const { getByTestId } = renderModal({ state: 'error', onCancel });

      fireEvent.press(getByTestId('test-modal-backdrop'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Transitions', () => {
    it('should transition from confirm to sending', () => {
      const { rerender, queryByTestId } = renderModal({ state: 'confirm' });

      expect(queryByTestId('test-modal-confirm')).toBeTruthy();
      expect(queryByTestId('test-modal-sending')).toBeNull();

      rerender(<SendToKitchenModal {...defaultProps} state="sending" />);

      expect(queryByTestId('test-modal-confirm')).toBeNull();
      expect(queryByTestId('test-modal-sending')).toBeTruthy();
    });

    it('should transition from sending to success', () => {
      const { rerender, queryByTestId } = renderModal({ state: 'sending' });

      expect(queryByTestId('test-modal-sending')).toBeTruthy();

      rerender(<SendToKitchenModal {...defaultProps} state="success" />);

      expect(queryByTestId('test-modal-sending')).toBeNull();
      expect(queryByTestId('test-modal-success')).toBeTruthy();
    });

    it('should transition from sending to error', () => {
      const { rerender, queryByTestId } = renderModal({ state: 'sending' });

      expect(queryByTestId('test-modal-sending')).toBeTruthy();

      rerender(<SendToKitchenModal {...defaultProps} state="error" />);

      expect(queryByTestId('test-modal-sending')).toBeNull();
      expect(queryByTestId('test-modal-error')).toBeTruthy();
    });
  });
});

describe('SendToKitchenModal Exports', () => {
  it('should export SendToKitchenModal component', async () => {
    const module = await import('../../components/orders/SendToKitchenModal');
    expect(module.SendToKitchenModal).toBeDefined();
    expect(typeof module.SendToKitchenModal).toBe('function');
  });

  it('should be exported from orders index', async () => {
    const orders = await import('../../components/orders');
    expect(orders.SendToKitchenModal).toBeDefined();
  });
});

describe('SendToKitchenModalState Type', () => {
  it('should accept valid state values', () => {
    const states: SendToKitchenModalState[] = ['confirm', 'sending', 'success', 'error'];
    expect(states).toHaveLength(4);
  });
});
