CREATE TABLE social_program (
    code VARCHAR(12) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(24) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED'))
);

CREATE TABLE beneficiary (
    id VARCHAR(16) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    document_masked VARCHAR(24) NOT NULL,
    program_code VARCHAR(12) NOT NULL REFERENCES social_program(code),
    state VARCHAR(2) NOT NULL,
    city VARCHAR(80) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    enrolled_at DATE NOT NULL
);

CREATE TABLE payment (
    id VARCHAR(24) PRIMARY KEY,
    beneficiary_id VARCHAR(16) NOT NULL REFERENCES beneficiary(id),
    period VARCHAR(7) NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PAID', 'PENDING', 'BLOCKED')),
    paid_at DATE
);

CREATE INDEX ix_beneficiary_program_state ON beneficiary (program_code, state);
CREATE INDEX ix_payment_period_status ON payment (period, status);
CREATE INDEX ix_payment_beneficiary ON payment (beneficiary_id);
