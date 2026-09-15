CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE legacy_snapshot (
    snapshot_key VARCHAR(64) PRIMARY KEY,
    source_schema_version SMALLINT NOT NULL
        CHECK (source_schema_version = 1),
    synthetic BOOLEAN NOT NULL
        CHECK (synthetic),
    snapshot_date DATE NOT NULL,
    legacy_commit VARCHAR(40) NOT NULL
        CHECK (legacy_commit ~ '^[0-9a-f]{40}$'),
    generator_sha256 VARCHAR(64) NOT NULL
        CHECK (generator_sha256 ~ '^[0-9a-f]{64}$'),
    source_content_sha256 VARCHAR(64) NOT NULL
        CHECK (source_content_sha256 ~ '^[0-9a-f]{64}$'),
    natural_version VARCHAR(16) NOT NULL,
    adabas_version VARCHAR(16) NOT NULL,
    adabas_dbid INTEGER NOT NULL CHECK (adabas_dbid > 0),
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (legacy_commit, generator_sha256, source_content_sha256)
);

CREATE TABLE legacy_snapshot_period (
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    period VARCHAR(7) NOT NULL
        CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    display_order SMALLINT NOT NULL CHECK (display_order > 0),
    PRIMARY KEY (snapshot_key, period),
    UNIQUE (snapshot_key, display_order)
);

CREATE TABLE legacy_snapshot_program (
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    program_code VARCHAR(4) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    type_code VARCHAR(8) NOT NULL,
    status_code VARCHAR(8) NOT NULL,
    source_row_sha256 VARCHAR(64) NOT NULL
        CHECK (source_row_sha256 ~ '^[0-9a-f]{64}$'),
    PRIMARY KEY (snapshot_key, program_code)
);

CREATE TABLE legacy_snapshot_beneficiary (
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    beneficiary_key VARCHAR(16) NOT NULL,
    source_identity_digest VARCHAR(64) NOT NULL
        CHECK (source_identity_digest ~ '^[0-9a-f]{64}$'),
    document_masked VARCHAR(24) NOT NULL,
    nis_masked VARCHAR(20) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    program_code VARCHAR(4) NOT NULL,
    state VARCHAR(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
    city VARCHAR(80) NOT NULL,
    region VARCHAR(2) NOT NULL,
    status_code VARCHAR(8) NOT NULL,
    enrolled_at DATE NOT NULL,
    dependents SMALLINT NOT NULL CHECK (dependents BETWEEN 0 AND 10),
    family_income NUMERIC(11,2) NOT NULL CHECK (family_income >= 0),
    source_row_sha256 VARCHAR(64) NOT NULL
        CHECK (source_row_sha256 ~ '^[0-9a-f]{64}$'),
    PRIMARY KEY (snapshot_key, beneficiary_key),
    UNIQUE (snapshot_key, source_identity_digest),
    FOREIGN KEY (snapshot_key, program_code)
        REFERENCES legacy_snapshot_program(snapshot_key, program_code)
);

CREATE TABLE legacy_snapshot_payment (
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    payment_id VARCHAR(24) NOT NULL,
    beneficiary_key VARCHAR(16) NOT NULL,
    period VARCHAR(7) NOT NULL,
    gross_amount NUMERIC(11,2) NOT NULL CHECK (gross_amount >= 0),
    discount_amount NUMERIC(11,2) NOT NULL CHECK (discount_amount >= 0),
    net_amount NUMERIC(11,2) NOT NULL CHECK (net_amount >= 0),
    status_code VARCHAR(8) NOT NULL,
    type_code VARCHAR(8) NOT NULL,
    source_row_sha256 VARCHAR(64) NOT NULL
        CHECK (source_row_sha256 ~ '^[0-9a-f]{64}$'),
    PRIMARY KEY (snapshot_key, payment_id),
    FOREIGN KEY (snapshot_key, beneficiary_key)
        REFERENCES legacy_snapshot_beneficiary(snapshot_key, beneficiary_key),
    FOREIGN KEY (snapshot_key, period)
        REFERENCES legacy_snapshot_period(snapshot_key, period)
);

CREATE TABLE legacy_snapshot_audit_event (
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    audit_id VARCHAR(24) NOT NULL,
    event_date DATE NOT NULL,
    module_code VARCHAR(16) NOT NULL,
    action_code VARCHAR(8) NOT NULL,
    entity_code VARCHAR(8) NOT NULL,
    source_row_sha256 VARCHAR(64) NOT NULL
        CHECK (source_row_sha256 ~ '^[0-9a-f]{64}$'),
    PRIMARY KEY (snapshot_key, audit_id)
);

CREATE TABLE legacy_snapshot_activation (
    activation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    snapshot_key VARCHAR(64) NOT NULL
        REFERENCES legacy_snapshot(snapshot_key),
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(160) NOT NULL,
    rollback_of_activation_id BIGINT
        REFERENCES legacy_snapshot_activation(activation_id)
);

CREATE INDEX ix_legacy_beneficiary_program
    ON legacy_snapshot_beneficiary (snapshot_key, program_code, beneficiary_key);
CREATE INDEX ix_legacy_beneficiary_filters
    ON legacy_snapshot_beneficiary (snapshot_key, state, status_code);
CREATE INDEX ix_legacy_payment_period
    ON legacy_snapshot_payment (snapshot_key, period, payment_id);
CREATE INDEX ix_legacy_payment_history
    ON legacy_snapshot_payment (snapshot_key, beneficiary_key, period DESC, payment_id);
CREATE INDEX ix_legacy_payment_filters
    ON legacy_snapshot_payment (snapshot_key, status_code);
CREATE INDEX ix_legacy_audit_recent
    ON legacy_snapshot_audit_event (snapshot_key, event_date DESC, audit_id DESC);

CREATE FUNCTION reject_legacy_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'legacy snapshots are append-only';
END;
$$;

CREATE FUNCTION guard_legacy_snapshot_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.snapshot_key, 0));
    IF EXISTS (
        SELECT 1
        FROM legacy_snapshot_activation activation
        WHERE activation.snapshot_key = NEW.snapshot_key
    ) THEN
        RAISE EXCEPTION 'active legacy snapshots are sealed';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_legacy_period_insert_guard
BEFORE INSERT ON legacy_snapshot_period
FOR EACH ROW EXECUTE FUNCTION guard_legacy_snapshot_insert();

CREATE TRIGGER trg_legacy_program_insert_guard
BEFORE INSERT ON legacy_snapshot_program
FOR EACH ROW EXECUTE FUNCTION guard_legacy_snapshot_insert();

CREATE TRIGGER trg_legacy_beneficiary_insert_guard
BEFORE INSERT ON legacy_snapshot_beneficiary
FOR EACH ROW EXECUTE FUNCTION guard_legacy_snapshot_insert();

CREATE TRIGGER trg_legacy_payment_insert_guard
BEFORE INSERT ON legacy_snapshot_payment
FOR EACH ROW EXECUTE FUNCTION guard_legacy_snapshot_insert();

CREATE TRIGGER trg_legacy_audit_insert_guard
BEFORE INSERT ON legacy_snapshot_audit_event
FOR EACH ROW EXECUTE FUNCTION guard_legacy_snapshot_insert();

CREATE TRIGGER trg_legacy_snapshot_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_snapshot_no_truncate
BEFORE TRUNCATE ON legacy_snapshot
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_period_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_period
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_period_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_period
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_program_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_program
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_program_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_program
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_beneficiary_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_beneficiary
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_beneficiary_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_beneficiary
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_payment_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_payment
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_payment_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_payment
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_audit_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_audit_event
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_audit_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_audit_event
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_activation_no_update_delete
BEFORE UPDATE OR DELETE ON legacy_snapshot_activation
FOR EACH ROW EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE TRIGGER trg_legacy_activation_no_truncate
BEFORE TRUNCATE ON legacy_snapshot_activation
FOR EACH STATEMENT EXECUTE FUNCTION reject_legacy_snapshot_mutation();

CREATE VIEW active_legacy_snapshot AS
SELECT snapshot.*
FROM legacy_snapshot snapshot
JOIN (
    SELECT snapshot_key
    FROM legacy_snapshot_activation
    ORDER BY activation_id DESC
    FETCH FIRST 1 ROW ONLY
) active USING (snapshot_key);

CREATE VIEW active_social_program AS
SELECT program.program_code AS code,
       program.display_name AS name,
       program.type_code AS type,
       program.status_code AS status
FROM legacy_snapshot_program program
JOIN active_legacy_snapshot active USING (snapshot_key);

CREATE VIEW active_beneficiary AS
SELECT beneficiary.beneficiary_key AS id,
       beneficiary.full_name AS name,
       beneficiary.document_masked,
       beneficiary.nis_masked,
       beneficiary.birth_date,
       beneficiary.program_code,
       beneficiary.state,
       beneficiary.city,
       beneficiary.region,
       beneficiary.status_code AS status,
       beneficiary.enrolled_at,
       beneficiary.dependents,
       beneficiary.family_income
FROM legacy_snapshot_beneficiary beneficiary
JOIN active_legacy_snapshot active USING (snapshot_key);

CREATE VIEW active_payment AS
SELECT payment.payment_id AS id,
       payment.beneficiary_key AS beneficiary_id,
       payment.period,
       payment.gross_amount,
       payment.discount_amount,
       payment.net_amount AS amount,
       payment.status_code AS status,
       payment.type_code AS type,
       NULL::DATE AS paid_at
FROM legacy_snapshot_payment payment
JOIN active_legacy_snapshot active USING (snapshot_key);

CREATE VIEW active_audit_event AS
SELECT audit.audit_id AS id,
       audit.event_date,
       audit.module_code AS module,
       audit.action_code AS action,
       audit.entity_code AS entity
FROM legacy_snapshot_audit_event audit
JOIN active_legacy_snapshot active USING (snapshot_key);
