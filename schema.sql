create table if not exists birthdays (
  guild_id text not null,
  user_id  text not null,
  day      integer not null,
  month    integer not null,
  primary key (guild_id, user_id)
);

create table if not exists settings (
  guild_id   text primary key,
  channel_id text not null
);

create table if not exists greeted (
  guild_id text not null,
  day_key  text not null,
  primary key (guild_id, day_key)
);
