insert into donors (
  dtn,
  first_name,
  middle_name,
  last_name,
  birthdate,
  address,
  contact_number,
  collection_program,
  status,
  created_by
)
values
  (
    'DEMO-DTN-001',
    'Maria',
    'Santos',
    'Reyes',
    '1996-03-12',
    'Bangkal, Makati City',
    '09171234567',
    'Supsup Todo',
    'Active',
    (select user_id from users where username = 'nurse')
  ),
  (
    'DEMO-DTN-002',
    'Ana',
    'Cruz',
    'Dela Paz',
    '1993-08-20',
    'Palanan, Makati City',
    '09189876543',
    'Mom''s Act',
    'Active',
    (select user_id from users where username = 'midwife')
  )
on conflict (dtn) do nothing;

insert into beneficiaries (
  first_name,
  last_name,
  contact_number,
  address,
  is_active,
  created_by
)
values
  (
    'Liza',
    'Torres',
    '09170001111',
    'Makati Medical Center',
    true,
    (select user_id from users where username = 'nurse')
  ),
  (
    'Carla',
    'Mendoza',
    '09170002222',
    'Ospital ng Makati',
    true,
    (select user_id from users where username = 'midwife')
  )
on conflict do nothing;

insert into milk_batches (
  batch_number,
  is_pooled,
  total_volume,
  available_volume,
  status,
  expiration_date
)
values
  ('DEMO-BATCH-001', false, 650, 400, 'Available', current_date + interval '30 days'),
  ('DEMO-BATCH-002', false, 220, 0, 'Pending Lab', null)
on conflict (batch_number) do nothing;

insert into milk_collections (
  batch_id,
  donor_id,
  collection_type,
  collection_date,
  volume_ml,
  collected_by,
  status
)
select
  b.batch_id,
  d.donor_id,
  'Walk-in Donation',
  current_date - interval '2 days',
  650,
  u.user_id,
  'Available'
from milk_batches b
join donors d on d.dtn = 'DEMO-DTN-001'
left join users u on u.username = 'nurse'
where b.batch_number = 'DEMO-BATCH-001'
  and not exists (
    select 1 from milk_collections c where c.batch_id = b.batch_id and c.donor_id = d.donor_id
  );

insert into milk_collections (
  batch_id,
  donor_id,
  collection_type,
  collection_date,
  volume_ml,
  collected_by,
  status
)
select
  b.batch_id,
  d.donor_id,
  'Home Collection',
  current_date - interval '1 day',
  220,
  u.user_id,
  'Pending Lab'
from milk_batches b
join donors d on d.dtn = 'DEMO-DTN-002'
left join users u on u.username = 'midwife'
where b.batch_number = 'DEMO-BATCH-002'
  and not exists (
    select 1 from milk_collections c where c.batch_id = b.batch_id and c.donor_id = d.donor_id
  );

insert into pasteurization_records (
  batch_id,
  pre_test_result,
  pre_test_date,
  post_test_result,
  post_test_date,
  expiration_date,
  recorded_by
)
select
  b.batch_id,
  'Passed',
  current_date - interval '2 days',
  'Passed',
  current_date - interval '1 day',
  current_date + interval '30 days',
  u.user_id
from milk_batches b
left join users u on u.username = 'nurse'
where b.batch_number = 'DEMO-BATCH-001'
  and not exists (
    select 1 from pasteurization_records p where p.batch_id = b.batch_id
  );

insert into milk_inquiries (
  beneficiary_id,
  inquiry_date,
  status,
  logged_by
)
select
  b.beneficiary_id,
  current_date,
  'Pending',
  u.user_id
from beneficiaries b
left join users u on u.username = 'nurse'
where b.contact_number = '09170002222'
  and not exists (
    select 1 from milk_inquiries i where i.beneficiary_id = b.beneficiary_id and i.status = 'Pending'
  );

insert into dispensing_transactions (
  beneficiary_id,
  batch_id,
  volume_dispensed,
  price,
  dispensed_by,
  transaction_date
)
select
  be.beneficiary_id,
  mb.batch_id,
  250,
  500,
  u.user_id,
  current_date
from beneficiaries be
join milk_batches mb on mb.batch_number = 'DEMO-BATCH-001'
left join users u on u.username = 'nurse'
where be.contact_number = '09170001111'
  and not exists (
    select 1
    from dispensing_transactions t
    where t.beneficiary_id = be.beneficiary_id
      and t.batch_id = mb.batch_id
      and t.volume_dispensed = 250
  );

insert into sms_logs (
  beneficiary_id,
  message,
  sent_by,
  delivery_status
)
select
  b.beneficiary_id,
  'Milk is now available at the milk bank. Please contact staff for confirmation.',
  u.user_id,
  'Sent'
from beneficiaries b
left join users u on u.username = 'nurse'
where b.contact_number = '09170002222'
  and not exists (
    select 1 from sms_logs s where s.beneficiary_id = b.beneficiary_id
  );
