package br.com.datacorp.sifap.records;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import org.hibernate.annotations.Immutable;

// REQ-127: read-only projection of the persisted legacy audit view.
@Entity
@Immutable
@Table(name = "active_audit_event")
class AuditEvent {
    @Id String id;
    @Column(name = "event_date")
    LocalDate eventDate;
    String module;
    String action;
    String entity;
    protected AuditEvent() {}
}
