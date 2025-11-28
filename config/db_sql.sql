create sequence user_id_seq
	as integer;

alter sequence user_id_seq owner to vaultadminpgdb;

alter sequence user_id_seq owned by "user".id;

create sequence asset_id_seq
	as integer;

alter sequence asset_id_seq owner to vaultadminpgdb;

alter sequence asset_id_seq owned by asset.id;

create sequence "adminWallet_id_seq"
	as integer;

alter sequence "adminWallet_id_seq" owner to vaultadminpgdb;

alter sequence "adminWallet_id_seq" owned by "adminWallet".id;

create sequence wallet_id_seq
	as integer;

alter sequence wallet_id_seq owner to vaultadminpgdb;

alter sequence wallet_id_seq owned by wallet.id;

create sequence transaction_id_seq
	as integer;

alter sequence transaction_id_seq owner to vaultadminpgdb;

alter sequence transaction_id_seq owned by transaction.id;

create sequence "whitelistedAddress_id_seq"
	as integer;

alter sequence "whitelistedAddress_id_seq" owner to vaultadminpgdb;

alter sequence "whitelistedAddress_id_seq" owned by "whitelistedAddress".id;

create sequence snapshot_id_seq
	as integer;

alter sequence snapshot_id_seq owner to vaultadminpgdb;

alter sequence snapshot_id_seq owned by snapshot.id;

create sequence logs_id_seq
	as integer;

alter sequence logs_id_seq owner to vaultadminpgdb;

alter sequence logs_id_seq owned by logs.id;

create sequence permission_id_seq
	as integer;

alter sequence permission_id_seq owner to vaultadminpgdb;

alter sequence permission_id_seq owned by permission.id;

create sequence role_id_seq
	as integer;

alter sequence role_id_seq owner to vaultadminpgdb;

alter sequence role_id_seq owned by role.id;

create sequence key1_id_seq
	as integer;

-- auto-generated definition
create sequence key1_id_seq
    as integer;

alter sequence key1_id_seq owner to vaultadminpgdb;

alter sequence key1_id_seq owned by key1.id;


create table if not exists "user"
(
    id              serial
        primary key,
    "userId"        uuid                     not null
        unique,
    firstname       varchar(255)             not null,
    lastname        varchar(255)             not null,
    password        varchar(255)             not null,
    email           varchar(255)             not null
        unique,
    phone           varchar(255)             not null
        unique,
    "tfaEnabled"    boolean default false,
    "authSecret"    varchar(255),
    countrycode     varchar(255),
    "deletedAt"     timestamp with time zone,
    "createdAt"     timestamp with time zone not null,
    "updatedAt"     timestamp with time zone not null,
    otp             varchar,
    "otpExpiresAt"  timestamp with time zone,
    "isOTPVerified" boolean default false,
    role            varchar default USER,
    "roleId"        integer,
    "vaultIds"      character varying[],
    "userType"      varchar default USER,
    "companyId"     uuid
);

alter table "user" owner to vaultadminpgdb;

create table if not exists asset
(
    id              serial
        primary key,
    name            varchar(255),
    "assetId"       varchar(255),
    icon            varchar(255),
    "createdAt"     timestamp with time zone,
    "updatedAt"     timestamp with time zone,
    "deletedAt"     timestamp with time zone,
    "krakenAssetId" varchar
);

alter table asset owner to vaultadminpgdb;

create table if not exists "adminWallet"
(
    id           serial
        primary key,
    "userId"     uuid not null
        references "user" ("userId")
            on update cascade on delete cascade,
    "assetId"    varchar(255),
    address      varchar(255),
    "vaultId"    integer,
    mnemonic     varchar(255),
    "privateKey" varchar(255),
    "publicKey"  varchar(255),
    balance      double precision default '0'::double precision,
    network      varchar(255),
    "createdAt"  timestamp with time zone,
    "updatedAt"  timestamp with time zone,
    "deletedAt"  timestamp with time zone,
    notify       boolean          default false
);

alter table "adminWallet" owner to vaultadminpgdb;

create table if not exists wallet
(
    id             serial
        primary key,
    "userId"       uuid not null
        references "user" ("userId")
            on update cascade on delete cascade,
    address        varchar(255),
    "walletName"   varchar(255),
    "assetId"      varchar(255),
    "vaultId"      varchar(255),
    mnemonic       varchar(255),
    "privateKey"   varchar(255),
    "publicKey"    varchar(255),
    balance        double precision default '0'::double precision,
    "createdAt"    timestamp with time zone,
    "updatedAt"    timestamp with time zone,
    "deletedAt"    timestamp with time zone,
    notify         boolean          default false,
    "userType"     varchar,
    archived       boolean          default false,
    "assetArchive" boolean          default false
);

alter table wallet owner to vaultadminpgdb;

create table if not exists transaction
(
    id                serial
        primary key,
    "userId"          uuid not null
        references "user" ("userId")
            on update cascade on delete cascade,
    "transactionId"   uuid not null
        unique,
    amount            double precision,
    "assetId"         varchar(255),
    "sourceAddress"   varchar(255),
    "targetAddress"   varchar(255),
    "txHash"          varchar(255),
    status            varchar(255),
    "subStatus"       varchar(255),
    note              varchar(255),
    "userType"        varchar(255),
    "transactionType" varchar(255),
    "createdAt"       timestamp with time zone,
    "updatedAt"       timestamp with time zone,
    "deletedAt"       timestamp with time zone,
    "whichUser"       varchar
);

alter table transaction owner to vaultadminpgdb;

create table if not exists "whitelistedAddress"
(
    id          serial
        primary key,
    name        varchar(255),
    "userId"    uuid not null
        references "user" ("userId")
            on update cascade on delete cascade,
    address     varchar(255),
    "assetId"   varchar(255),
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedAt" timestamp with time zone,
    allowed     varchar,
    "roleIds"   integer[]
);

alter table "whitelistedAddress" owner to vaultadminpgdb;

create table if not exists snapshot
(
    id           serial
        primary key,
    address      varchar(255),
    "walletName" varchar(255),
    "assetId"    varchar(255),
    balance      double precision default '0'::double precision,
    "vaultId"    varchar(255),
    "createdAt"  timestamp with time zone,
    "updatedAt"  timestamp with time zone,
    "deletedAt"  timestamp with time zone
);

alter table snapshot owner to vaultadminpgdb;

create table if not exists logs
(
    id           serial
        primary key,
    "userId"     uuid,
    firstname    varchar(255),
    lastname     varchar(255),
    method       varchar(255),
    ip           varchar(255),
    "desc"       text,
    "statusCode" integer,
    "createdAt"  timestamp with time zone not null,
    "updatedAt"  timestamp with time zone not null
);

alter table logs owner to vaultadminpgdb;

create table if not exists permission
(
    id          serial
        primary key,
    name        varchar(255),
    label       varchar(255),
    category    varchar(255),
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone not null,
    "updatedAt" timestamp with time zone not null
);

alter table permission owner to vaultadminpgdb;
create table if not exists role
(
    id          serial
        primary key,
    name        varchar(255),
    permissions varchar(255)[],
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone not null,
    "updatedAt" timestamp with time zone not null,
    category    varchar,
    "companyId" uuid
);

alter table role owner to vaultadminpgdb;


create table if not exists key1
(
    id          serial
        primary key,
    key         varchar(255)             not null,
    "walletId"  varchar(255)             not null,
    currency    varchar(255)             not null,
    "createdAt" timestamp with time zone not null,
    "updatedAt" timestamp with time zone not null
);

alter table key1 owner to vaultadminpgdb;

