package br.com.datacorp.sifap.records;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

// REQ-127 REQ-132: reads are mapped to the atomically activated snapshot view.
@Entity
@Immutable
@Table(name = "active_social_program")
class Program {
    @Id String code;
    String name;
    String type;
    String status;
    protected Program() {}
}
