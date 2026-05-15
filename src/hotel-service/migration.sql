CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE TABLE "Hotels" (
        "Id" uuid NOT NULL DEFAULT (gen_random_uuid()),
        "Name" text NOT NULL,
        "LocationPoint" text NOT NULL,
        "Description" text NOT NULL,
        "AdminEmail" text NOT NULL,
        CONSTRAINT "PK_Hotels" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE TABLE "Notifications" (
        "Id" uuid NOT NULL DEFAULT (gen_random_uuid()),
        "UserId" text NOT NULL,
        "Title" text NOT NULL,
        "Body" text NOT NULL,
        "IsRead" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE TABLE "Rooms" (
        "Id" uuid NOT NULL DEFAULT (gen_random_uuid()),
        "HotelId" uuid NOT NULL,
        "RoomType" text NOT NULL,
        "BasePrice" numeric(10,2) NOT NULL,
        CONSTRAINT "PK_Rooms" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Rooms_Hotels_HotelId" FOREIGN KEY ("HotelId") REFERENCES "Hotels" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE TABLE "Reservations" (
        "Id" uuid NOT NULL DEFAULT (gen_random_uuid()),
        "RoomId" uuid NOT NULL,
        "UserId" text NOT NULL,
        "CheckInDate" date NOT NULL,
        "CheckOutDate" date NOT NULL,
        "GuestCount" integer NOT NULL,
        "PricePaid" numeric(10,2) NOT NULL,
        CONSTRAINT "PK_Reservations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Reservations_Rooms_RoomId" FOREIGN KEY ("RoomId") REFERENCES "Rooms" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE TABLE "RoomAvailabilities" (
        "Id" uuid NOT NULL DEFAULT (gen_random_uuid()),
        "RoomId" uuid NOT NULL,
        "StartDate" date NOT NULL,
        "EndDate" date NOT NULL,
        "IsVacant" boolean NOT NULL,
        "TotalCapacity" integer NOT NULL,
        "ReservedCount" integer NOT NULL,
        CONSTRAINT "PK_RoomAvailabilities" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_RoomAvailabilities_Rooms_RoomId" FOREIGN KEY ("RoomId") REFERENCES "Rooms" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE INDEX "IX_Reservations_RoomId" ON "Reservations" ("RoomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE INDEX "IX_RoomAvailabilities_RoomId" ON "RoomAvailabilities" ("RoomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    CREATE INDEX "IX_Rooms_HotelId" ON "Rooms" ("HotelId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515134738_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260515134738_InitialCreate', '9.0.16');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515140732_AddHotelImageUrl') THEN
    ALTER TABLE "Hotels" ADD "ImageUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260515140732_AddHotelImageUrl') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260515140732_AddHotelImageUrl', '9.0.16');
    END IF;
END $EF$;
COMMIT;

