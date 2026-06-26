
-- TABLE: users
CREATE TABLE IF NOT EXISTS users (
    user_id     SERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- store bcrypt hash, never plaintext
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Nurse', 'Midwife')),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- TABLE: donors
CREATE TABLE IF NOT EXISTS donors (
    donor_id            SERIAL PRIMARY KEY,
    dtn                 VARCHAR(20)  NOT NULL UNIQUE,   -- auto-generated Donor Tracking Number
    first_name          VARCHAR(100) NOT NULL,
    middle_name         VARCHAR(100),
    last_name           VARCHAR(100) NOT NULL,
    birthdate           DATE         NOT NULL,
    address             TEXT         NOT NULL,
    contact_number      VARCHAR(20)  NOT NULL,
    collection_program  VARCHAR(100),                  -- e.g. Supsup Todo / Mom's Act / Milky Way
    status              VARCHAR(20)  NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_by          INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- TABLE: milk_batches
CREATE TABLE IF NOT EXISTS milk_batches (
    batch_id            SERIAL PRIMARY KEY,
    batch_number        VARCHAR(50)    NOT NULL UNIQUE,
    is_pooled           BOOLEAN        NOT NULL DEFAULT FALSE,
    total_volume        DECIMAL(8,2)   NOT NULL DEFAULT 0,
    available_volume    DECIMAL(8,2)   NOT NULL DEFAULT 0,
    status              VARCHAR(30)    NOT NULL DEFAULT 'Pending Lab'
                            CHECK (status IN ('Pending Lab', 'Passed', 'Failed', 'Disposed', 'Pasteurized', 'Available')),
    expiration_date     DATE,
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- TABLE: milk_collections
CREATE TABLE IF NOT EXISTS milk_collections (
    collection_id   SERIAL PRIMARY KEY,
    batch_id        INT            NOT NULL REFERENCES milk_batches(batch_id) ON DELETE CASCADE,
    donor_id        INT            NOT NULL REFERENCES donors(donor_id) ON DELETE RESTRICT,
    collection_type VARCHAR(50)    NOT NULL,
    collection_date DATE           NOT NULL,
    volume_ml       DECIMAL(8,2)   NOT NULL CHECK (volume_ml > 0),
    collected_by    INT            REFERENCES users(user_id) ON DELETE SET NULL,
    status          VARCHAR(30)    NOT NULL DEFAULT 'Pending Lab'
                        CHECK (status IN ('Pending Lab', 'Passed', 'Failed', 'Disposed', 'Pasteurized', 'Available')),
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- TABLE: pasteurization_records
CREATE TABLE IF NOT EXISTS pasteurization_records (
    pasteurization_id   SERIAL PRIMARY KEY,
    batch_id            INT         NOT NULL REFERENCES milk_batches(batch_id) ON DELETE CASCADE,
    pre_test_result     VARCHAR(10) CHECK (pre_test_result IN ('Passed', 'Failed')),
    pre_test_date       DATE,
    post_test_result    VARCHAR(10) CHECK (post_test_result IN ('Passed', 'Failed')),
    post_test_date      DATE,
    expiration_date     DATE,
    recorded_by         INT         REFERENCES users(user_id) ON DELETE SET NULL
);

-- TABLE: disposal_records
CREATE TABLE IF NOT EXISTS disposal_records (
    disposal_id     SERIAL PRIMARY KEY,
    batch_id        INT       NOT NULL REFERENCES milk_batches(batch_id) ON DELETE CASCADE,
    disposal_date   DATE      NOT NULL,
    reason          TEXT      NOT NULL,
    disposed_by     INT       REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: beneficiaries
CREATE TABLE IF NOT EXISTS beneficiaries (
    beneficiary_id  SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    contact_number  VARCHAR(20)  NOT NULL,
    address         TEXT         NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- TABLE: milk_inquiries
CREATE TABLE IF NOT EXISTS milk_inquiries (
    inquiry_id      SERIAL PRIMARY KEY,
    beneficiary_id  INT         NOT NULL REFERENCES beneficiaries(beneficiary_id) ON DELETE CASCADE,
    inquiry_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Fulfilled')),
    logged_by       INT         REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- TABLE: dispensing_transactions
CREATE TABLE IF NOT EXISTS dispensing_transactions (
    transaction_id      SERIAL PRIMARY KEY,
    beneficiary_id      INT           NOT NULL REFERENCES beneficiaries(beneficiary_id) ON DELETE RESTRICT,
    batch_id            INT           NOT NULL REFERENCES milk_batches(batch_id) ON DELETE RESTRICT,
    volume_dispensed    DECIMAL(8,2)  NOT NULL CHECK (volume_dispensed > 0),
    price               DECIMAL(10,2) NOT NULL DEFAULT 0,
    dispensed_by        INT           REFERENCES users(user_id) ON DELETE SET NULL,
    transaction_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- TABLE: sms_logs
CREATE TABLE IF NOT EXISTS sms_logs (
    sms_id          SERIAL PRIMARY KEY,
    beneficiary_id  INT         NOT NULL REFERENCES beneficiaries(beneficiary_id) ON DELETE CASCADE,
    message         TEXT        NOT NULL,
    sent_by         INT         REFERENCES users(user_id) ON DELETE SET NULL,  -- NULL = auto-sent
    sent_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'Sent' CHECK (delivery_status IN ('Sent', 'Delivered', 'Failed')),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- INDEXES  (speeds up common searches/filters)
CREATE INDEX IF NOT EXISTS idx_donors_dtn        ON donors(dtn);
CREATE INDEX IF NOT EXISTS idx_donors_status     ON donors(status);
CREATE INDEX IF NOT EXISTS idx_batches_status    ON milk_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_expiry    ON milk_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_collections_batch ON milk_collections(batch_id);
CREATE INDEX IF NOT EXISTS idx_collections_donor ON milk_collections(donor_id);
CREATE INDEX IF NOT EXISTS idx_past_batch        ON pasteurization_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_disposal_batch    ON disposal_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_bene    ON milk_inquiries(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON milk_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_dispense_bene     ON dispensing_transactions(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_dispense_batch    ON dispensing_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_sms_bene          ON sms_logs(beneficiary_id);

-- FUNCTION: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables that have updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_donors_updated_at
    BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_beneficiaries_updated_at
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION: auto-generate DTN for new donors
-- Format: DTN-YYYYMMDD-XXXX (e.g. DTN-20260621-0001)
CREATE OR REPLACE FUNCTION generate_dtn()
RETURNS TRIGGER AS $$
DECLARE
    today_str TEXT;
    seq_num   INT;
    new_dtn   TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1
        INTO seq_num
        FROM donors
        WHERE dtn LIKE 'DTN-' || today_str || '-%';
    new_dtn := 'DTN-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    NEW.dtn := new_dtn;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donors_generate_dtn
    BEFORE INSERT ON donors
    FOR EACH ROW EXECUTE FUNCTION generate_dtn();

-- FUNCTION: deduct available_volume on dispensing
CREATE OR REPLACE FUNCTION deduct_batch_volume()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE milk_batches
    SET available_volume = available_volume - NEW.volume_dispensed
    WHERE batch_id = NEW.batch_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_volume_on_dispense
    AFTER INSERT ON dispensing_transactions
    FOR EACH ROW EXECUTE FUNCTION deduct_batch_volume();

INSERT INTO users (username, password, role, first_name, last_name)
VALUES ('admin', 'admin123', 'Admin', 'System', 'Administrator')
ON CONFLICT (username) DO NOTHING;