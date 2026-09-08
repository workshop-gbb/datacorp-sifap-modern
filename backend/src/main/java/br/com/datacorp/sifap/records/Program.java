package br.com.datacorp.sifap.records;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "social_program")
class Program {
    @Id String code;
    String name;
    String type;
    String status;
    protected Program() {}
}
