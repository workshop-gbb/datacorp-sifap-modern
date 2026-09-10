package br.com.datacorp.sifap.records;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.hibernate.annotations.Immutable;

// REQ-127 REQ-129: only privacy-safe columns from the active view are mapped.
@Entity
@Immutable
@Table(name = "active_beneficiary")
class Beneficiary {
    @Id String id;
    String name;
    @Column(name = "document_masked")
    String documentMasked;
    @Column(name = "nis_masked")
    String nisMasked;
    @Column(name = "birth_date")
    LocalDate birthDate;
    @Column(name = "program_code")
    String programCode;
    String state;
    String city;
    String region;
    String status;
    @Column(name = "enrolled_at")
    LocalDate enrolledAt;
    short dependents;
    @Column(name = "family_income")
    BigDecimal familyIncome;
    protected Beneficiary() {}
}
