# Release Note: Provider Payout List Pagination

Date: 2026-04-09
Area: `GET /api/v1/providers/me/payouts`

## Summary

Provider payout listing now uses a bounded pagination contract.

The endpoint response is now an object with pagination metadata:

```json
{
  "payouts": [
    {
      "payoutId": "string",
      "providerUserId": "string",
      "bookingId": "string",
      "paymentId": "string",
      "amountCents": 5000,
      "currency": "EUR",
      "status": "pending",
      "settlementRef": null,
      "createdAt": "2026-04-01T12:00:00.000Z",
      "settledAt": null
    }
  ],
  "nextCursor": "string-or-null",
  "limit": 20
}
```

## Request Parameters

- `limit` (optional): positive integer page size.
- `cursor` (optional): opaque cursor from previous page `nextCursor`.

Server behavior:

- default `limit`: `20`
- maximum `limit`: `100`
- invalid `limit` (non-integer or <= 0): `400 Bad Request`

## Compatibility Notes

- Product app loader accepts both the new paginated object and legacy array payloads for transition safety.
- Downstream consumers should migrate to the paginated object shape and stop assuming a raw array response.

## Verification Performed

- Contract tests for payouts controller query handling and pagination forwarding.
- Payout repository/service tests for bounded pagination and cursor progression.
- End-to-end smoke assertions on `main` for:
  - default payout list response includes `payouts`, `nextCursor`, `limit: 20`
  - bounded payout list response with `?limit=1` includes `limit: 1`
