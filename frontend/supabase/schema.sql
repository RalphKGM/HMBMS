-- Human Milk Bank Management System schema
-- Run this in the Supabase SQL editor before starting the backend.

create table if not exists users (
  user_id serial primary key,
  username varchar(50) not null unique,
  password varchar(255) not null,
  role varchar(20) not null check (role in ('Admin', 'Doctor', 'Nurse', 'Midwife')),
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  is_active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists donors (
  donor_id serial primary key,
  dtn varchar(30) not null unique,
  first_name varchar(100) not null,
  middle_name varchar(100),
  last_name varchar(100) not null,
  birthdate date not null,
  address text not null,
  contact_number varchar(20) not null,
  collection_program varchar(100),
  status varchar(20) not null default 'Active' check (status in ('Active', 'Inactive')),
  created_by int references users(user_id) on delete set null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists milk_batches (
  batch_id serial primary key,
  batch_number varchar(50) not null unique,
  is_pooled boolean not null default false,
  total_volume decimal(8,2) not null default 0,
  available_volume decimal(8,2) not null default 0,
  status varchar(30) not null default 'Pending Lab'
    check (status in ('Pending Lab', 'Passed', 'Failed', 'Disposed', 'Pasteurized', 'Available')),
  expiration_date date,
  created_at timestamp not null default now()
);

create table if not exists milk_collections (
  collection_id serial primary key,
  batch_id int not null references milk_batches(batch_id) on delete cascade,
  donor_id int not null references donors(donor_id) on delete restrict,
  collection_type varchar(50) not null,
  collection_date date not null,
  volume_ml decimal(8,2) not null check (volume_ml > 0),
  collected_by int references users(user_id) on delete set null,
  status varchar(30) not null default 'Pending Lab'
    check (status in ('Pending Lab', 'Passed', 'Failed', 'Disposed', 'Pasteurized', 'Available')),
  created_at timestamp not null default now()
);

create table if not exists pasteurization_records (
  pasteurization_id serial primary key,
  batch_id int not null references milk_batches(batch_id) on delete cascade,
  pre_test_result varchar(10) check (pre_test_result in ('Passed', 'Failed')),
  pre_test_date date,
  post_test_result varchar(10) check (post_test_result in ('Passed', 'Failed')),
  post_test_date date,
  expiration_date date,
  recorded_by int references users(user_id) on delete set null
);

create table if not exists disposal_records (
  disposal_id serial primary key,
  batch_id int not null references milk_batches(batch_id) on delete cascade,
  disposal_date date not null,
  reason text not null,
  disposed_by int references users(user_id) on delete set null,
  created_at timestamp not null default now()
);

create table if not exists beneficiaries (
  beneficiary_id serial primary key,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  contact_number varchar(20) not null,
  address text not null,
  is_active boolean not null default true,
  created_by int references users(user_id) on delete set null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists milk_inquiries (
  inquiry_id serial primary key,
  beneficiary_id int not null references beneficiaries(beneficiary_id) on delete cascade,
  inquiry_date date not null default current_date,
  status varchar(20) not null default 'Pending' check (status in ('Pending', 'Fulfilled')),
  logged_by int references users(user_id) on delete set null,
  created_at timestamp not null default now()
);

create table if not exists dispensing_transactions (
  transaction_id serial primary key,
  beneficiary_id int not null references beneficiaries(beneficiary_id) on delete restrict,
  batch_id int not null references milk_batches(batch_id) on delete restrict,
  volume_dispensed decimal(8,2) not null check (volume_dispensed > 0),
  price decimal(10,2) not null default 0,
  dispensed_by int references users(user_id) on delete set null,
  transaction_date date not null default current_date,
  created_at timestamp not null default now()
);

create table if not exists sms_logs (
  sms_id serial primary key,
  beneficiary_id int not null references beneficiaries(beneficiary_id) on delete cascade,
  message text not null,
  sent_by int references users(user_id) on delete set null,
  sent_at timestamp not null default now(),
  delivery_status varchar(20) not null default 'Sent'
    check (delivery_status in ('Sent', 'Delivered', 'Failed')),
  created_at timestamp not null default now()
);

create index if not exists idx_donors_dtn on donors(dtn);
create index if not exists idx_donors_status on donors(status);
create index if not exists idx_batches_status on milk_batches(status);
create index if not exists idx_batches_expiry on milk_batches(expiration_date);
create index if not exists idx_collections_batch on milk_collections(batch_id);
create index if not exists idx_collections_donor on milk_collections(donor_id);
create index if not exists idx_past_batch on pasteurization_records(batch_id);
create index if not exists idx_disposal_batch on disposal_records(batch_id);
create index if not exists idx_inquiries_bene on milk_inquiries(beneficiary_id);
create index if not exists idx_inquiries_status on milk_inquiries(status);
create index if not exists idx_dispense_bene on dispensing_transactions(beneficiary_id);
create index if not exists idx_dispense_batch on dispensing_transactions(batch_id);
create index if not exists idx_sms_bene on sms_logs(beneficiary_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at_column();

drop trigger if exists trg_donors_updated_at on donors;
create trigger trg_donors_updated_at
  before update on donors
  for each row execute function update_updated_at_column();

drop trigger if exists trg_beneficiaries_updated_at on beneficiaries;
create trigger trg_beneficiaries_updated_at
  before update on beneficiaries
  for each row execute function update_updated_at_column();

create or replace function generate_dtn()
returns trigger as $$
declare
  today_str text;
  seq_num int;
begin
  today_str := to_char(now(), 'YYYYMMDD');
  select count(*) + 1
    into seq_num
    from donors
    where dtn like 'DTN-' || today_str || '-%';
  new.dtn := 'DTN-' || today_str || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_donors_generate_dtn on donors;
create trigger trg_donors_generate_dtn
  before insert on donors
  for each row execute function generate_dtn();

create or replace function deduct_batch_volume()
returns trigger as $$
begin
  update milk_batches
  set available_volume = greatest(available_volume - new.volume_dispensed, 0)
  where batch_id = new.batch_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deduct_volume_on_dispense on dispensing_transactions;
create trigger trg_deduct_volume_on_dispense
  after insert on dispensing_transactions
  for each row execute function deduct_batch_volume();

insert into users (username, password, role, first_name, last_name)
values
  ('admin', '$2b$10$BEYCFQ4JnQp8RO0/bSZ9buE2d2HLacFRC.GmLbYL0z6qCbnfX6MS2', 'Admin', 'System', 'Administrator'),
  ('doctor', '$2b$10$nG7xGPlTAFtNkdarQzO0seQswsHrk7y2fV8yfkrkjU4LLZR9URy0S', 'Doctor', 'Demo', 'Doctor'),
  ('nurse', '$2b$10$pQaSjn9msxdi8qOzPMA7We7eZ28fUOJ.ibzy9nilQGO9xF8QdGgvy', 'Nurse', 'Demo', 'Nurse'),
  ('midwife', '$2b$10$Qb8k6sJP7NlRb6bqhCYeKu1qgHcKHVTEwPIb6aLDS7uYYfVYDZQaG', 'Midwife', 'Demo', 'Midwife')
on conflict (username) do nothing;
