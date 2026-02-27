## Testing & QA Checklist

This document describes how to manually verify the updated dashboard, agreements, signatures, and encryption flows.

### 1. Dashboard tables & search

- **Pending / Signed / Templates tables**
  - Sign in and navigate to `/dashboard`.
  - Verify three tables are shown: Pending agreements, Signed agreements, Templates.
  - Confirm pagination controls appear when more than 10 rows exist in any section.
  - Confirm actions:
    - Pending: `View` opens `/dashboard/[id]`, `Delete` removes the row and refreshes the table.
    - Signed: `View` opens `/dashboard/[id]` and shows signatures.
    - Templates: `Edit` opens `/templates/[id]/edit`, `Delete` removes the template and refreshes.
- **Search**
  - Use the search box to filter by title text.
  - Confirm all three tables are filtered server-side (only matching rows appear).
  - Clear the search and verify full lists and pagination return.

### 2. Placeholder-based agreements

- **Creation**
  - Go to `/create` and attempt to submit without `{{signature}}` in the content.
  - Confirm you receive an error that at least one `{{signature}}` placeholder is required.
  - Create an agreement with N `{{signature}}` placeholders:
    - Verify the agreement is created and visible in the Pending table.
    - Inspect the `agreements` row in the database and confirm `required_signatures = N`.
- **Draft editing & publish**
  - Create a draft agreement (or use an existing one) and open `/dashboard/[id]/edit`.
  - Edit the content to adjust the number of `{{signature}}` placeholders.
  - Save and verify:
    - Updates are accepted only when at least one placeholder is present.
    - `required_signatures` matches the placeholder count.
  - Publish the draft and confirm the agreement appears in the Pending table.

### 3. Slot-based signing & owner auto-sign

- **Owner auto-sign**
  - After creating or publishing an agreement with placeholders, open `/sign/[id]` as the creator.
  - Confirm:
    - The Signatures list already includes the creator.
    - One signature spot is marked as signed by the creator.
- **Signature spots UI**
  - On `/sign/[id]`, verify:
    - A “Signature spots” panel shows one button per `{{signature}}` placeholder.
    - Spots signed by someone display “signed by …” and are disabled.
    - Unsigned spots are selectable; only one can be selected at a time.
- **Signing**
  - As a non-creator user, open the same `/sign/[id]` link.
  - Attempt to sign without choosing a spot; confirm you get a validation error.
  - Choose an available spot, enter a signature text and style, and sign.
  - Refresh the page and confirm:
    - The chosen spot is now marked as signed by that user.
    - The signature appears in the Signatures list with the correct timestamp.
  - Repeat until all spots are signed:
    - Confirm that once all spots are occupied, no additional spots are available.

### 4. Finalization & encryption

- **Agreement finalization**
  - For an agreement with N placeholders, collect N signatures (including the creator).
  - Confirm in the database:
    - `agreements.status = 'signed'`.
    - `agreements.is_encrypted = true`.
    - `agreements.encrypted_content` and `agreements.encryption_kms_key_id` are non-null.
- **Viewing finalized agreements**
  - As the creator, open `/dashboard/[id]` for the signed agreement.
  - Confirm:
    - The agreement content is still rendered correctly.
    - Signatures show both the display text and the correct `signed_at` date/time.
  - As a signer (non-creator), open `/sign/[id]`:
    - Confirm the content renders identically.
    - Confirm all signatures, including your own, are visible with timestamps.
- **Tampering & immutability**
  - Attempt to modify the `agreements.content` or `content_hash` directly in the database for a `pending` or `signed` agreement and verify the trigger blocks the update.
  - Attempt to change `status` away from `signed` and confirm it is rejected.

### 5. Existing data & migration notes

- **Existing agreements without placeholders**
  - Identify any older `draft` agreements whose content does not contain `{{signature}}`.
  - Attempt to publish them:
    - Confirm publish is blocked with a message requiring at least one placeholder.
  - Edit those drafts to add the appropriate number of `{{signature}}` placeholders and re-publish.
- **Existing signed agreements**
  - Existing signed agreements created before this change will remain readable and immutable.
  - Optionally, select a small subset and re-sign them (by creating new agreements) to benefit from placeholder slots and encryption.

