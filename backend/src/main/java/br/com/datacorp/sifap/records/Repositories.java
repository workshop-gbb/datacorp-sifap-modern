package br.com.datacorp.sifap.records;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProgramRepository extends JpaRepository<Program, String> {}
interface BeneficiaryRepository extends JpaRepository<Beneficiary, String> {}
interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByPeriodOrderByIdAsc(String period);
    List<Payment> findByBeneficiaryIdOrderByPeriodDesc(String beneficiaryId);
}
interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
    List<AuditEvent> findTop6ByOrderByEventDateDescIdDesc();
}
