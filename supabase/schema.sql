create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table app_state enable row level security;

create policy "Allow public read for class demo"
on app_state for select
using (true);

create policy "Allow public insert for class demo"
on app_state for insert
with check (true);

create policy "Allow public update for class demo"
on app_state for update
using (true)
with check (true);
