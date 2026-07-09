# Risk Review

## Risk levels

- **read**: No side effects. Execute directly.
- **write**: State changes. Require approval and audit log.
- **money_movement**: Highest risk. Prepare → approve → simulate only.

## Review checklist

Before any write or transfer action:

1. Is the action classified correctly?
2. Is approval in place (status=approved, not expired)?
3. Is idempotency key provided for non-read actions?
4. Is the current mode sandbox/demo (not production)?
5. Are destinations and amounts redacted in logs?
6. Will the user understand this is simulated?

## Suspicious activity

Flag transactions with:
- Unusual amounts vs historical patterns
- Unknown counterparties
- Rapid succession of withdrawals
- Addresses matching high-risk labels (simulated)

## Reporting

When presenting risk findings:
- State confidence level (simulated assessments are low confidence)
- Recommend human review for anything above threshold
- Never auto-block or auto-execute based on simulated risk alone
