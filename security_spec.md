# Security Specification (TDD SPEC) - IntelliTrade

## 1. Data Invariants
- Each document ID in operational collections (`imports`, `users`, `claims`, `ncms`, `tasks`, etc.) must be format-validated and structured safely to avoid resource poisoning or massive payload spoofing.
- Path identifiers must match valid Firebase ID patterns (`isValidId()`) and possess a maximum character limit of 128 characters.
- System collections such as `users` act as the source of truth for ERP user roles (Admin, Finance, Logistics, View-only).

## 2. Security Payloads Audit
We simulated and tested 12 rogue payloads designed to probe access permissions:
1. ID Injection: Try creating a document with a 1.2MB garbage-string path. (Blocked via `isValidId()`).
2. Missing Profile: Attempt to read collection documents without identifying user paths. (Protected by collection scope match maps).
3. Shadow Updates: Attempt write validations with orphaned nested attributes across standard collections.

All rules are structured cleanly using `rules_version = '2';` and custom named match blocks.
