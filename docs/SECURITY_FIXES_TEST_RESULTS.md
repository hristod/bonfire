# Security Fixes Testing Checklist

## Test Date: [YYYY-MM-DD]
## Tester: [Name]
## Branch: bonfire-core-mechanics
## Commit: [SHA]

---

## Phase 1: PIN Rate Limiting

### Test 1.1: Normal PIN Entry (Success)
- [ ] Create bonfire with 4-digit PIN: "1234"
- [ ] Join bonfire with correct PIN on first try
- **Expected:** Success, can access chat
- **Actual:**
- **Status:**

### Test 1.2: Wrong PIN (1-4 Attempts)
- [ ] Create bonfire with PIN: "5678"
- [ ] Enter wrong PIN 4 times: "0000", "1111", "2222", "3333"
- **Expected:** Each shows "Invalid secret code or PIN"
- **Actual:**
- **Status:**

### Test 1.3: Rate Limit Triggered (5th Attempt)
- [ ] Continue from Test 1.2, enter 5th wrong PIN: "4444"
- **Expected:** Error "Too many incorrect PIN attempts. Please wait 15 minutes"
- **Actual:**
- **Status:**

### Test 1.4: Rate Limit Persists
- [ ] Immediately try with correct PIN after rate limit
- **Expected:** Still rate limited
- **Actual:**
- **Status:**

### Test 1.5: Rate Limit Expires
- [ ] Wait 15 minutes
- [ ] Enter correct PIN: "5678"
- **Expected:** Success, can join bonfire
- **Actual:**
- **Status:**

### Test 1.6: Successful PIN Resets Counter
- [ ] Create bonfire with PIN: "9999"
- [ ] Enter wrong PIN 3 times
- [ ] Enter correct PIN: "9999"
- [ ] Create new bonfire with PIN: "8888"
- [ ] Enter wrong PIN 4 more times (should still be under limit)
- **Expected:** Still can attempt (success reset counter)
- **Actual:**
- **Status:**

---

## Phase 2: Secret Code Security

### Test 2.1: Secret Code Not in Discovery
- [ ] Call findNearbyBonfires API
- [ ] Inspect returned bonfire objects
- **Expected:** No current_secret_code field in response
- **Actual:**
- **Status:**

### Test 2.2: Get Secret When Within Radius
- [ ] Stand within 30m of bonfire
- [ ] Tap bonfire in discovery list
- **Expected:** Secret fetched successfully, navigates to join screen
- **Actual:**
- **Status:**

### Test 2.3: Cannot Get Secret When Too Far
- [ ] Stand > 50m from bonfire
- [ ] Tap bonfire in discovery list
- **Expected:** Error "You must be closer to the bonfire to join"
- **Actual:**
- **Status:**

### Test 2.4: Cannot Join With Old Secret
- [ ] Get secret code for bonfire A
- [ ] Wait 6 minutes (secret rotates every 5 min)
- [ ] Try to join with old secret
- **Expected:** "Invalid secret code or PIN"
- **Actual:**
- **Status:**

---

## Phase 3: Async Cleanup & Race Conditions

### Test 3.1: Rapid Screen Navigation
- [ ] Open bonfire chat screen
- [ ] Immediately press back before loading completes
- [ ] Repeat 5 times rapidly
- **Expected:** No errors, no memory warnings
- **Actual:**
- **Status:**

### Test 3.2: Presence Interval After Unmount
- [ ] Open bonfire chat
- [ ] Wait 35 seconds (past presence interval)
- [ ] Navigate away
- [ ] Check console for errors
- **Expected:** No errors about updating unmounted component
- **Actual:**
- **Status:**

---

## Phase 4: Location & Image Validation

### Test 4.1: Low Accuracy Location Rejected
- [ ] In location simulator, set accuracy to 100m
- [ ] Trigger background location update
- [ ] Check logs
- **Expected:** Log shows "Location accuracy too low, skipping update"
- **Actual:**
- **Status:**

### Test 4.2: Stale Location Rejected
- [ ] Mock location with timestamp 2 minutes old
- [ ] Trigger background update
- **Expected:** Log shows "Location is stale, skipping update"
- **Actual:**
- **Status:**

### Test 4.3: Image URLs Refresh on Chat Open
- [ ] Send image message in bonfire
- [ ] Close app completely
- [ ] Reopen chat after 1 hour
- [ ] Check image loads successfully
- **Expected:** Image displays (URL refreshed)
- **Actual:**
- **Status:**

---

## Phase 5: RPC Rate Limiting

### Test 5.1: Normal Discovery Usage
- [ ] Pull-to-refresh discovery screen 10 times over 30 seconds
- **Expected:** All requests succeed
- **Actual:**
- **Status:**

### Test 5.2: Rapid Discovery Spam Triggers Limit
- [ ] Write script to call findNearbyBonfires 31 times in 10 seconds
- **Expected:** 31st call fails with "Rate limit exceeded"
- **Actual:**
- **Status:**

### Test 5.3: Rate Limit Error Shows User Message
- [ ] Continue from 5.2
- [ ] Check UI for error message
- **Expected:** Alert shows "Searching too frequently. Please wait a moment"
- **Actual:**
- **Status:**

### Test 5.4: Rate Limit Resets After Window
- [ ] Wait 60 seconds after rate limit
- [ ] Pull-to-refresh discovery
- **Expected:** Request succeeds
- **Actual:**
- **Status:**

---

## Database Cleanup Tests

### Test 6.1: Old PIN Attempts Cleaned
- [ ] Create bonfire with PIN
- [ ] Enter wrong PIN 5 times (triggers rate limit)
- [ ] Check pin_attempts table: `SELECT COUNT(*) FROM pin_attempts WHERE user_id = [your-id]`
- [ ] Wait 1 hour
- [ ] Run cleanup: `SELECT cleanup_old_pin_attempts()`
- [ ] Check table again
- **Expected:** Old attempts deleted
- **Actual:**
- **Status:**

### Test 6.2: Expired Bonfires Cleaned
- [ ] Create bonfire with 1-hour expiry
- [ ] Wait for expiry + 24 hours (or mock with manual SQL)
- [ ] Run cleanup cron or manual: `DELETE FROM bonfires WHERE expires_at < NOW() - interval '24 hours'`
- **Expected:** Expired bonfire deleted
- **Actual:**
- **Status:**

---

## Performance Tests

### Test 7.1: Battery Drain During Background Tracking
- [ ] Enable background location tracking
- [ ] Charge device to 100%
- [ ] Disconnect charger
- [ ] Leave app running with tracking enabled for 1 hour
- [ ] Check battery percentage
- **Expected:** <10% battery drain
- **Actual:**
- **Status:**

### Test 7.2: Database Query Performance
- [ ] Create 50 test bonfires in various locations
- [ ] Call findNearbyBonfires with 50m radius
- [ ] Measure response time
- **Expected:** <500ms response time
- **Actual:**
- **Status:**

---

## Security Audit

### Test 8.1: Non-Participant Cannot Read Messages
- [ ] User A creates bonfire
- [ ] User B (not participant) attempts to query messages via SQL
- **Expected:** RLS policy blocks, returns empty
- **Actual:**
- **Status:**

### Test 8.2: Cannot Manipulate Rate Limit Table
- [ ] User attempts to INSERT into rpc_rate_limits via SQL
- **Expected:** RLS policy blocks
- **Actual:**
- **Status:**

### Test 8.3: Cannot Manipulate PIN Attempts
- [ ] User attempts to DELETE from pin_attempts via SQL
- **Expected:** RLS policy blocks
- **Actual:**
- **Status:**

---

## Regression Tests

### Test 9.1: Normal Bonfire Creation Still Works
- [ ] Create bonfire without PIN
- [ ] Verify appears in discovery
- [ ] Join bonfire
- [ ] Send text message
- [ ] Send image message
- **Expected:** All functionality works as before
- **Actual:**
- **Status:**

### Test 9.2: OAuth Sign-In Still Works
- [ ] Sign out completely
- [ ] Sign in with Apple
- [ ] Sign in with Google
- **Expected:** Both work without issues
- **Actual:**
- **Status:**

---

## Summary

**Total Tests:** 34
**Passed:**
**Failed:**
**Skipped:**

**Critical Issues Found:**


**Recommended Actions:**


**Ready for Production:** [ ] Yes [ ] No
