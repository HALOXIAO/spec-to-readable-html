# Payment Creation Spec

When a user submits an order, the system MUST check whether stock is available.

If stock is available, the system creates a payment request and returns `PAYMENT_PENDING`.

If stock is unavailable, the system MUST return `OUT_OF_STOCK` and must not create a payment request.

The spec does not define retry behavior for payment provider timeouts.

The `Order` model has fields `id`, `status`, and `payment_request_id`.

The `PaymentRequest` model has fields `id`, `order_id`, and `status`.

Each `PaymentRequest` references exactly one `Order` through `order_id`.
