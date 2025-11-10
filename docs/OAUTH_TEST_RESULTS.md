# OAuth Integration Test Results

Date: [FILL IN]
Tester: [FILL IN]

## OAuth Sign-Up (New Users)

- [ ] Sign up with Apple - unique nickname auto-created
- [ ] Sign up with Google - unique nickname auto-created
- [ ] Sign up with Apple - nickname conflict, prompted to choose
- [ ] Sign up with Google - nickname conflict, prompted to choose
- [ ] Cancel OAuth flow - stays on sign-in screen
- [ ] Network error during OAuth - shows error, can retry

## OAuth Sign-In (Returning Users)

- [ ] Sign in with Apple - existing account recognized
- [ ] Sign in with Google - existing account recognized
- [ ] Profile loads correctly after OAuth sign-in

## Account Linking

- [ ] Email user signs in with Apple (same email) - accounts linked
- [ ] Email user signs in with Google (same email) - accounts linked
- [ ] Apple user signs in with Google (same email) - accounts linked
- [ ] User can sign in with any linked method afterward

## UI/UX

- [ ] OAuth buttons render correctly on iOS and Android
- [ ] Loading states show during OAuth flow
- [ ] Error messages are user-friendly
- [ ] Nickname selection screen validates input properly

## Edge Cases

- [ ] User with no name in Apple profile - uses email prefix
- [ ] Offline during OAuth - shows appropriate error
- [ ] Multiple rapid OAuth attempts - handled gracefully

## Notes

[Add any issues or observations here]
