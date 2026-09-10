CREATE FUNCTION validate_legacy_snapshot_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    snapshot CONSTANT VARCHAR(64) := 'legacy-2018-03-14-e47a0914';
    actual_hash VARCHAR(64);
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.snapshot_key, 0));
    IF NEW.snapshot_key <> snapshot THEN
        RAISE EXCEPTION 'legacy snapshot is not approved for activation';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM legacy_snapshot source
        WHERE source.snapshot_key = snapshot
          AND source.source_schema_version = 1
          AND source.synthetic
          AND source.snapshot_date = DATE '2018-03-14'
          AND source.legacy_commit = 'b87992324dda18bdfc86e6507c3f99b86b99e35d'
          AND source.generator_sha256 = '1e5ca9ca29ca80f3922d795854332247094c007c6d5a3c140aaddd1b5ec7b1a1'
          AND source.source_content_sha256 = 'e47a0914fd70b3519bc47f6fe28a24f20ea95ec133598298d5263f9f0427b5b9'
          AND source.natural_version = '9.3.3'
          AND source.adabas_version = '7.4.0'
          AND source.adabas_dbid = 12
    ) THEN
        RAISE EXCEPTION 'legacy snapshot provenance mismatch';
    END IF;
    IF (SELECT COUNT(*) FROM legacy_snapshot_program WHERE snapshot_key = snapshot) <> 6 THEN
        RAISE EXCEPTION 'legacy program count mismatch';
    END IF;
    IF (SELECT COUNT(*) FROM legacy_snapshot_beneficiary WHERE snapshot_key = snapshot) <> 500 THEN
        RAISE EXCEPTION 'legacy beneficiary count mismatch';
    END IF;
    IF (SELECT COUNT(*) FROM legacy_snapshot_payment WHERE snapshot_key = snapshot) <> 2000 THEN
        RAISE EXCEPTION 'legacy payment count mismatch';
    END IF;
    IF (SELECT COUNT(*) FROM legacy_snapshot_audit_event WHERE snapshot_key = snapshot) <> 200 THEN
        RAISE EXCEPTION 'legacy audit count mismatch';
    END IF;
    IF (SELECT COUNT(*) FROM legacy_snapshot_period WHERE snapshot_key = snapshot) <> 4 THEN
        RAISE EXCEPTION 'legacy period count mismatch';
    END IF;
    IF (
        SELECT ARRAY_AGG(period ORDER BY display_order)
        FROM legacy_snapshot_period
        WHERE snapshot_key = snapshot
    ) <> ARRAY['2018-01', '2017-12', '2017-11', '2017-10']::VARCHAR[] THEN
        RAISE EXCEPTION 'legacy period values or ordering mismatch';
    END IF;
    IF EXISTS (
        SELECT beneficiary.beneficiary_key
        FROM legacy_snapshot_beneficiary beneficiary
        LEFT JOIN legacy_snapshot_payment payment
          ON payment.snapshot_key = beneficiary.snapshot_key
         AND payment.beneficiary_key = beneficiary.beneficiary_key
        WHERE beneficiary.snapshot_key = snapshot
        GROUP BY beneficiary.beneficiary_key
        HAVING COUNT(payment.payment_id) <> 4
    ) THEN
        RAISE EXCEPTION 'legacy beneficiary payment history mismatch';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM legacy_snapshot_beneficiary beneficiary
        WHERE beneficiary.snapshot_key = snapshot
          AND beneficiary.beneficiary_key = 'BEN-000005'
          AND beneficiary.full_name = 'MARIA ALMEIDA ALMEIDA'
          AND beneficiary.program_code = 'GASF'
          AND beneficiary.city = 'CURITIBA'
          AND beneficiary.state = 'PR'
    ) THEN
        RAISE EXCEPTION 'canonical Maria record mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', program_code, display_name, type_code, status_code, source_row_sha256),
        E'\n' ORDER BY program_code), 'sha256'), 'hex')
    INTO actual_hash
    FROM legacy_snapshot_program
    WHERE snapshot_key = snapshot;
    IF actual_hash <> '1d42ea202faec7feb786844bb0159de9dbf7e82ebdeaa809464c21e271d23c4a' THEN
        RAISE EXCEPTION 'legacy program manifest mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', beneficiary_key, source_identity_digest, document_masked, nis_masked,
            full_name, birth_date::TEXT, program_code, state, city, region, status_code,
            enrolled_at::TEXT, dependents::TEXT, family_income::TEXT, source_row_sha256),
        E'\n' ORDER BY beneficiary_key), 'sha256'), 'hex')
    INTO actual_hash
    FROM legacy_snapshot_beneficiary
    WHERE snapshot_key = snapshot;
    IF actual_hash <> 'abf008e09a9e4fea21ca0efffd1b849cdd4ef3e38f362a91b2adf964762c1a01' THEN
        RAISE EXCEPTION 'legacy beneficiary manifest mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', payment_id, beneficiary_key, period, gross_amount::TEXT,
            discount_amount::TEXT, net_amount::TEXT, status_code, type_code, source_row_sha256),
        E'\n' ORDER BY payment_id), 'sha256'), 'hex')
    INTO actual_hash
    FROM legacy_snapshot_payment
    WHERE snapshot_key = snapshot;
    IF actual_hash <> '5e2e34c7bc466816835bb75864c875afefa2ce8b2e67ce7e84b0c46e644cb462' THEN
        RAISE EXCEPTION 'legacy payment manifest mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', audit_id, event_date::TEXT, module_code, action_code,
            entity_code, source_row_sha256),
        E'\n' ORDER BY audit_id), 'sha256'), 'hex')
    INTO actual_hash
    FROM legacy_snapshot_audit_event
    WHERE snapshot_key = snapshot;
    IF actual_hash <> 'b7d0c042335ca954faa0e56ec7c5059376bde4ba1a844ec4b87aea658045a45b' THEN
        RAISE EXCEPTION 'legacy audit manifest mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', period, display_order::TEXT),
        E'\n' ORDER BY display_order), 'sha256'), 'hex')
    INTO actual_hash
    FROM legacy_snapshot_period
    WHERE snapshot_key = snapshot;
    IF actual_hash <> '785348211eba5b6b3e07c70df6b80efe2f1b86b8f130f807e097cd1ee9e9460c' THEN
        RAISE EXCEPTION 'legacy period manifest mismatch';
    END IF;

    SELECT encode(digest(string_agg(
        concat_ws('|', period, program_code, payment_count::TEXT, gross_amount::TEXT,
            discount_amount::TEXT, net_amount::TEXT),
        E'\n' ORDER BY period, program_code), 'sha256'), 'hex')
    INTO actual_hash
    FROM (
        SELECT payment.period,
               beneficiary.program_code,
               COUNT(*) AS payment_count,
               SUM(payment.gross_amount) AS gross_amount,
               SUM(payment.discount_amount) AS discount_amount,
               SUM(payment.net_amount) AS net_amount
        FROM legacy_snapshot_payment payment
        JOIN legacy_snapshot_beneficiary beneficiary
          ON beneficiary.snapshot_key = payment.snapshot_key
         AND beneficiary.beneficiary_key = payment.beneficiary_key
        WHERE payment.snapshot_key = snapshot
        GROUP BY payment.period, beneficiary.program_code
    ) aggregate_rows;
    IF actual_hash <> '383e086ff6630f12b92f4627eada31afb6c8032a5f160f68cdc0b257194eadfa' THEN
        RAISE EXCEPTION 'legacy aggregate manifest mismatch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_legacy_snapshot_activation
BEFORE INSERT ON legacy_snapshot_activation
FOR EACH ROW EXECUTE FUNCTION validate_legacy_snapshot_activation();

INSERT INTO legacy_snapshot_activation (snapshot_key, reason)
SELECT 'legacy-2018-03-14-e47a0914',
       'Activate the complete normalized legacy workshop snapshot'
WHERE NOT EXISTS (
    SELECT 1
    FROM legacy_snapshot_activation
    WHERE snapshot_key = 'legacy-2018-03-14-e47a0914'
      AND reason = 'Activate the complete normalized legacy workshop snapshot'
);
