package br.com.datacorp.sifap.records;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.LocalDate;

@Entity
class Beneficiary {
    @Id String id;
    String name;
    String documentMasked;
    String programCode;
    String state;
    String city;
    String status;
    LocalDate enrolledAt;
    protected Beneficiary() {}
}
