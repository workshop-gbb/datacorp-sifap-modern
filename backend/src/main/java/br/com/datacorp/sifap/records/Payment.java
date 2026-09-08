package br.com.datacorp.sifap.records;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
class Payment {
    @Id String id;
    String beneficiaryId;
    String period;
    BigDecimal amount;
    String status;
    LocalDate paidAt;
    protected Payment() {}
}
