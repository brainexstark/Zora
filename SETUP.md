# ZORA [ΖΟΡΑ] — Setup Guide

## 1. Supabase setup (5 minutes)

1. Go to https://supabase.com and create a new project.
2. Open **SQL Editor** and paste the entire contents of `supabase/schema.sql`. Run it.
3. Under **Storage → Buckets**, confirm `zora-media` appeared (the SQL creates it).
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key**

## 2. Environment variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Enable auth providers (optional for social login)

In Supabase → **Authentication → Providers**:
- Enable Google (needs Google Cloud OAuth app)
- Enable Facebook (needs Facebook app)

For email/password auth (works out of the box) no extra config is needed.

For 18+ phone OTP: enable **Phone** provider and connect Twilio or Vonage.

## 4. Run the app

```bash
npm run start
# or
npm run android
npm run ios
```

## 5. ZORA AI engines

| Engine | Status at launch |
|--------|-----------------|
| Age Guard (blazeface) | Active if camera permission granted |
| Vibe Engine | Active from first launch, regenerates daily |
| Content Classifier (MobileNet) | Active, falls back to keyword if TF fails |
| Twin Engine (ONNX) | Falls back to slang engine until model placed at `documentDirectory/phi3-mini-quantized.onnx` |
| Quest Timer | Active, DB-enforced — reinstalling cannot bypass |

## 6. Acceptance test checklist

- [ ] DOB 2012-01-01 → under_14 UI
- [ ] DOB 2000-01-01 → needs OTP
- [ ] Selfie screen loads camera and runs tf.ready()
- [ ] Close and reopen next day → vibe accent changes
- [ ] Press "I Did This" 3× → quest_count in DB → Flex unlocked
- [ ] Upload image → appears in zora-media bucket → shows in feed
- [ ] StoryTray shows real stories from DB
- [ ] Search → real profiles from DB
- [ ] Chat → realtime, no refresh needed
- [ ] Create group with 2 members → group_members has 2 rows
- [ ] Save to Vault → plays offline (airplane mode)
- [ ] AI Hub → Train Twin → Generate Draft (100% on device)
- [ ] `grep -r "placeholder\|unsplash\|picsum\|lorem" app utils components` → 0 results
