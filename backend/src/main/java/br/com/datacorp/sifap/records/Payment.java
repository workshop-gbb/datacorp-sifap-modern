package br.com.datacorp.sifap.records;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.hibernate.annotations.Immutable;

// REQ-127 REQ-130 REQ-131: preserve active snapshot amounts and opaque source codes.
@Entity
@Immutable
@Table(name = "active_payment")
class Payment {
    @Id String id;
    @Column(name = "beneficiary_id")
    String beneficiaryId;
    String period;
    @Column(name = "gross_amount")
    BigDecimal grossAmount;
    @Column(name = "discount_amount")
    BigDecimal discountAmount;
    BigDecimal amount;
    String status;
    String type;
    @Column(name = "paid_at")
    LocalDate paidAt;
    protected Payment() {}
}
