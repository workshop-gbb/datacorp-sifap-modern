package br.com.datacorp.sifap.records;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

class SnapshotIsolationTest {
    @Test
    void should_keep_each_read_response_on_one_active_snapshot() { // REQ-132
        var transaction = RecordsService.class.getAnnotation(Transactional.class);

        assertAll(
            () -> assertTrue(transaction.readOnly()),
            () -> assertEquals(Isolation.REPEATABLE_READ, transaction.isolation()));
    }
}
