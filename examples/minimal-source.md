# Payment Creation Spec

When a user submits an order, the system MUST check whether stock is available.

If stock is available, the system creates a payment request and returns `PAYMENT_PENDING`.

If stock is unavailable, the system MUST return `OUT_OF_STOCK` and must not create a payment request.

The spec does not define retry behavior for payment provider timeouts.
