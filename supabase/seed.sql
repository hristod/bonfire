-- Seed data for development
-- Creates two test users: Alice and Bob with full profiles

-- Note: Supabase Auth passwords are hashed using bcrypt
-- The password for both users is: "password123"
-- Passwords are hashed using PostgreSQL's crypt() function with bcrypt

-- Insert Alice into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  phone_change_token,
  reauthentication_token
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'alice@bonfire.test',
  crypt('password123', gen_salt('bf')), -- Generate bcrypt hash for 'password123'
  now(),
  '{"nickname": "alice"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  ''
);

-- Insert Bob into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  phone_change_token,
  reauthentication_token
) VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'bob@bonfire.test',
  crypt('password123', gen_salt('bf')), -- Generate bcrypt hash for 'password123'
  now(),
  '{"nickname": "bob"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  ''
);

-- Insert identities for email-based auth (required for Supabase Auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "alice@bonfire.test"}'::jsonb,
    'email',
    'a0000000-0000-0000-0000-000000000001',
    now(),
    now(),
    now()
  ),
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'b0000000-0000-0000-0000-000000000001'::uuid,
    '{"sub": "b0000000-0000-0000-0000-000000000001", "email": "bob@bonfire.test"}'::jsonb,
    'email',
    'b0000000-0000-0000-0000-000000000001',
    now(),
    now(),
    now()
  );

-- Insert profiles for Alice and Bob
-- Note: The trigger handle_new_user() should create these automatically,
-- but we insert them manually to ensure consistent seed data
INSERT INTO public.profiles (
  id,
  nickname,
  avatar_url,
  created_at,
  updated_at
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'alice',
    NULL,
    now(),
    now()
  ),
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'bob',
    NULL,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Fix NULL token values for Supabase Auth v2.182.1 compatibility
-- The auth service cannot handle NULL values in VARCHAR token columns
UPDATE auth.users SET
  aud = COALESCE(aud, ''),
  role = COALESCE(role, ''),
  email = COALESCE(email, ''),
  encrypted_password = COALESCE(encrypted_password, ''),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change = COALESCE(phone_change, '');

-- Verify seed data
SELECT
  u.email,
  p.nickname,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('alice@bonfire.test', 'bob@bonfire.test');
