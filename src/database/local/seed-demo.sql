INSERT INTO users (
  id,
  email,
  "passwordHash",
  "firstName",
  "lastName",
  roles,
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'admin@refugiapp.local',
  'demo-password-hash-not-for-production',
  'Admin',
  'Demo',
  ARRAY['admin', 'shelter_manager']::user_role[],
  true,
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO animals (
  id,
  name,
  species,
  sex,
  status,
  "birthDate",
  "intakeDate",
  notes,
  "createdAt",
  "updatedAt"
)
VALUES
  (
    '22222222-2222-4222-8222-222222222222',
    'Luna',
    'dog',
    'female',
    'available_for_adoption',
    '2022-04-10',
    '2026-08-01',
    'Friendly dog, vaccinated and ready for adoption.',
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Milo',
    'cat',
    'male',
    'under_treatment',
    '2024-01-15',
    '2026-08-12',
    'Recovering from a respiratory infection.',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO veterinarians (
  id,
  "firstName",
  "lastName",
  "licenseNumber",
  email,
  phone,
  notes,
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  'Sofia',
  'Martinez',
  'VET-DEMO-001',
  'sofia.martinez@refugiapp.local',
  '+5491100000000',
  'Demo veterinarian for local development.',
  true,
  now(),
  now()
)
ON CONFLICT ("licenseNumber") DO NOTHING;

INSERT INTO medical_records (
  id,
  "animalId",
  "veterinarianId",
  "recordType",
  title,
  diagnosis,
  treatment,
  notes,
  "occurredAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  'consultation',
  'Initial respiratory check',
  'Mild respiratory infection',
  'Antibiotic treatment and observation',
  'Demo clinical record.',
  '2026-08-20T14:00:00Z',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (
  id,
  "animalId",
  category,
  "amountCents",
  currency,
  description,
  "createdByUserId",
  "incurredAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  '33333333-3333-4333-8333-333333333333',
  'medicine',
  185000,
  'ARS',
  'Respiratory treatment medication',
  '11111111-1111-4111-8111-111111111111',
  '2026-08-20T15:00:00Z',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
