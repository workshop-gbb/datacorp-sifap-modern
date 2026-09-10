package br.com.datacorp.sifap;

import java.math.BigDecimal;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class SifapApplicationTests {
	@Autowired MockMvc http;
	@Autowired ObjectMapper json;
	@Autowired JdbcTemplate jdbc;

	@DynamicPropertySource
	static void configuration(DynamicPropertyRegistry props) {
		props.add("sifap.jwt.secret", () -> "test-only-not-a-deployment-secret-12345678");
		props.add("sifap.viewer.password-hash", () -> new BCryptPasswordEncoder().encode("test-only"));
		props.add("sifap.admin.password-hash", () -> new BCryptPasswordEncoder().encode("admin-test-only"));
		props.add("spring.datasource.url", () -> "jdbc:postgresql://unused/test");
		props.add("spring.datasource.username", () -> "unused");
		props.add("spring.datasource.password", () -> "unused");
	}

	@Test
	void contextLoads() {
	}
	@Test void should_deny_anonymous_records() throws Exception { // REQ-103 REQ-104
		http.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized());
	}
	@Test void should_reject_viewer_mutations() throws Exception { // REQ-104
		for (String verb : java.util.List.of("POST","PUT","PATCH","DELETE")) {
			http.perform(request(org.springframework.http.HttpMethod.valueOf(verb), "/api/v1/programs")
				.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
				.andExpect(status().isForbidden());
		}
	}
	@Test void should_compute_dashboard_from_persisted_legacy_snapshot() throws Exception { // REQ-127 REQ-131
		var result = http.perform(get("/api/v1/dashboard")
				.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
			.andExpect(status().isOk()).andReturn();
		var body = json.readTree(result.getResponse().getContentAsString());
		assertAll(
			() -> assertEquals("legacy-2018-03-14", body.at("/dataset/id").asText()),
			() -> assertEquals("2018-03-14", body.at("/dataset/asOf").asText()),
			() -> assertTrue(body.at("/dataset/source").asText().contains(
				"b87992324dda18bdfc86e6507c3f99b86b99e35d")),
			() -> assertEquals("2018-01", body.at("/period").asText()),
			() -> assertEquals(500, body.at("/totals/beneficiaries").asInt()),
			() -> assertEquals(500, body.at("/totals/payments").asInt()),
			() -> assertEquals(6, body.at("/totals/activePrograms").asInt()),
			() -> assertEquals(13, body.at("/totals/coverageStates").asInt()),
			() -> assertEquals(4, body.at("/monthlyPayments").size()),
			() -> assertEquals(6, body.at("/programDistribution").size()),
			() -> assertEquals(13, body.at("/stateDistribution").size()),
			() -> assertEquals("800000000000120", body.at("/recentActivity/0/id").asText()),
			() -> assertFalse(result.getResponse().getContentAsString().contains("EVT-001")));
	}
	@Test void should_expose_complete_legacy_counts_and_bounded_queries() throws Exception { // REQ-125 REQ-126 REQ-127 REQ-129 REQ-132
		var viewer = jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"));
		var provenance = jdbc.queryForMap("""
			SELECT source_schema_version, legacy_commit, generator_sha256, source_content_sha256
			FROM active_legacy_snapshot
			""");
		var paymentsByPeriod = jdbc.queryForList("""
			SELECT COUNT(*) FROM active_payment GROUP BY period ORDER BY period
			""", Long.class);
		var paymentsByBeneficiary = jdbc.queryForList("""
			SELECT COUNT(*) FROM active_payment GROUP BY beneficiary_id ORDER BY beneficiary_id
			""", Long.class);
		assertAll(
			() -> assertEquals("1", provenance.get("source_schema_version").toString()),
			() -> assertEquals("b87992324dda18bdfc86e6507c3f99b86b99e35d", provenance.get("legacy_commit")),
			() -> assertEquals("1e5ca9ca29ca80f3922d795854332247094c007c6d5a3c140aaddd1b5ec7b1a1",
				provenance.get("generator_sha256")),
			() -> assertEquals("e47a0914fd70b3519bc47f6fe28a24f20ea95ec133598298d5263f9f0427b5b9",
				provenance.get("source_content_sha256")),
			() -> assertEquals(6L, jdbc.queryForObject("SELECT COUNT(*) FROM active_social_program", Long.class)),
			() -> assertEquals(500L, jdbc.queryForObject("SELECT COUNT(*) FROM active_beneficiary", Long.class)),
			() -> assertEquals(2_000L, jdbc.queryForObject("SELECT COUNT(*) FROM active_payment", Long.class)),
			() -> assertEquals(200L, jdbc.queryForObject("SELECT COUNT(*) FROM active_audit_event", Long.class)),
			() -> assertEquals(java.util.List.of(500L, 500L, 500L, 500L), paymentsByPeriod),
			() -> assertTrue(paymentsByBeneficiary.stream().allMatch(count -> count == 4L)),
			() -> assertEquals(
				java.util.Set.of("PBF1", "BPC1", "PETI", "AUX1", "GASF", "IDOS"),
				new java.util.HashSet<>(jdbc.queryForList("SELECT code FROM active_social_program", String.class))),
			() -> assertEquals(
				java.util.Set.of("AC", "AM", "BA", "CE", "DF", "GO", "MG", "PE", "PR", "RJ", "RS", "SC", "SP"),
				new java.util.HashSet<>(jdbc.queryForList("SELECT DISTINCT state FROM active_beneficiary", String.class))),
			() -> assertEquals(
				java.util.Set.of("A", "S", "C", "I", "D"),
				new java.util.HashSet<>(jdbc.queryForList("SELECT DISTINCT status FROM active_beneficiary", String.class))),
			() -> assertEquals(
				java.util.Set.of("C", "D", "E", "G", "P", "R"),
				new java.util.HashSet<>(jdbc.queryForList("SELECT DISTINCT status FROM active_payment", String.class))),
			() -> assertEquals(
				java.util.Set.of("N", "A"),
				new java.util.HashSet<>(jdbc.queryForList("SELECT DISTINCT type FROM active_payment", String.class))));
		http.perform(get("/api/v1/programs?size=100").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(6));
		http.perform(get("/api/v1/beneficiaries?size=5").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(500))
			.andExpect(jsonPath("$.items.length()").value(5));
		http.perform(get("/api/v1/payments?period=2018-01").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(500));
		http.perform(get("/api/v1/audit-events?size=100").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(200))
			.andExpect(jsonPath("$.items.length()").value(100));
		http.perform(get("/api/v1/audit-events?q=CADBENEF").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(68));
		http.perform(get("/api/v1/payments?size=101").with(viewer)).andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries?q=12345678901").with(viewer)).andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries?q=123.456.789-01").with(viewer))
			.andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries?q=CPF%20123.456.789-01").with(viewer))
			.andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries?q=ticket%2042%20%2F%20CPF%20123.456.789-01").with(viewer))
			.andExpect(status().isBadRequest());
		http.perform(get("/api/v1/audit-events?q=12345678901").with(viewer)).andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries/unknown").with(viewer)).andExpect(status().isNotFound());
	}
	@Test void should_expose_maria_history_without_complete_personal_identifiers() throws Exception { // REQ-128 REQ-129
		var result = http.perform(get("/api/v1/beneficiaries/BEN-000005")
				.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
			.andExpect(status().isOk()).andReturn();
		var body = json.readTree(result.getResponse().getContentAsString());
		assertAll(
			() -> assertEquals("MARIA ALMEIDA ALMEIDA", body.at("/beneficiary/name").asText()),
			() -> assertEquals("GASF", body.at("/beneficiary/programCode").asText()),
			() -> assertEquals("CURITIBA", body.at("/beneficiary/city").asText()),
			() -> assertEquals("***.*****.50-7", body.at("/beneficiary/nisMasked").asText()),
			() -> assertEquals("1973-09-24", body.at("/beneficiary/birthDate").asText()),
			() -> assertEquals("05", body.at("/beneficiary/region").asText()),
			() -> assertEquals(8, body.at("/beneficiary/dependents").asInt()),
			() -> assertEquals("300.01", body.at("/beneficiary/familyIncome").asText()),
			() -> assertEquals("A", body.at("/beneficiary/status").asText()),
			() -> assertEquals(4, body.at("/payments").size()),
			() -> assertFalse(result.getResponse().getContentAsString()
				.matches("(?s).*\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}.*")),
			() -> assertFalse(result.getResponse().getContentAsString()
				.matches("(?s).*\\d{3}\\.\\d{5}\\.\\d{2}-\\d.*")));
	}
	@Test void should_reject_unapproved_activation_and_snapshot_truncation() { // REQ-132
		jdbc.update("""
			INSERT INTO legacy_snapshot (
			    snapshot_key, source_schema_version, synthetic, snapshot_date, legacy_commit,
			    generator_sha256, source_content_sha256, natural_version, adabas_version, adabas_dbid
			) VALUES (
			    'unapproved-test-snapshot', 1, TRUE, DATE '2018-03-14',
			    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
			    '9.3.3', '7.4.0', 12
			)
			""");
		assertAll(
			() -> assertThrows(DataAccessException.class, () -> jdbc.update("""
				INSERT INTO legacy_snapshot_activation (snapshot_key, reason)
				VALUES ('unapproved-test-snapshot', 'must fail')
				""")),
			() -> assertThrows(DataAccessException.class, () -> jdbc.update("""
				INSERT INTO legacy_snapshot_audit_event (
				    snapshot_key, audit_id, event_date, module_code, action_code,
				    entity_code, source_row_sha256
				) VALUES (
				    'legacy-2018-03-14-e47a0914', '999999999999999',
				    DATE '2018-03-14', 'TEST', 'CO', 'BENF',
				    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
				)
				""")),
			() -> assertThrows(DataAccessException.class,
				() -> jdbc.execute("TRUNCATE legacy_snapshot_payment")));
	}
	@Test void should_aggregate_gross_discount_and_net_without_interpreting_status() throws Exception { // REQ-130 REQ-131
		var viewer = jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"));
		var expected = jdbc.queryForMap("""
			SELECT SUM(gross_amount) AS gross, SUM(discount_amount) AS discount, SUM(amount) AS net
			FROM active_payment WHERE period = '2018-01'
			""");
		var summaryResult = http.perform(get("/api/v1/reports/summary").with(viewer))
			.andExpect(status().isOk()).andReturn();
		var dashboardResult = http.perform(get("/api/v1/dashboard").with(viewer))
			.andExpect(status().isOk()).andReturn();
		var summary = json.readTree(summaryResult.getResponse().getContentAsString());
		var dashboard = json.readTree(dashboardResult.getResponse().getContentAsString());
		assertAll(
			() -> assertEquals(((BigDecimal) expected.get("gross")).toPlainString(), summary.get("grossAmount").asText()),
			() -> assertEquals(((BigDecimal) expected.get("discount")).toPlainString(), summary.get("discountAmount").asText()),
			() -> assertEquals(((BigDecimal) expected.get("net")).toPlainString(), summary.get("netAmount").asText()),
			() -> assertEquals(((BigDecimal) expected.get("gross")).toPlainString(),
				dashboard.at("/totals/grossAmount").asText()),
			() -> assertEquals(((BigDecimal) expected.get("discount")).toPlainString(),
				dashboard.at("/totals/discountAmount").asText()),
			() -> assertEquals(((BigDecimal) expected.get("net")).toPlainString(),
				dashboard.at("/totals/netAmount").asText()),
			() -> assertFalse(summary.has("paidAmount")),
			() -> assertFalse(summary.has("pendingAmount")),
			() -> assertFalse(summary.has("blockedAmount")));
	}
	@Test void should_export_legacy_financial_codes_and_amounts() throws Exception { // REQ-129 REQ-130 REQ-131
		http.perform(get("/api/v1/reports/payments.csv?program=GASF&locale=pt-BR")
			.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
			.andExpect(status().isOk()).andExpect(header().string("Content-Disposition",
				"attachment; filename=\"sifap-legacy-2018-01.csv\""))
			.andExpect(content().string(org.hamcrest.Matchers.containsString(
				"\"Valor bruto BRL\",\"Desconto BRL\",\"Valor liquido BRL\",\"Codigo status\",\"Codigo tipo\"")));
	}
	@Test void should_authenticate_real_viewer_credentials() throws Exception { // REQ-103
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"test-only\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("VIEWER"))
			.andExpect(jsonPath("$.accessToken").isString());
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"wrong\"}"))
			.andExpect(status().isUnauthorized());
		// REQ-122: client role data is ignored; the account remains VIEWER.
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"test-only\",\"role\":\"ADMIN\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("VIEWER"));
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"admin\",\"password\":\"admin-test-only\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("ADMIN"));
		http.perform(post("/api/v1/auth/viewer")).andExpect(status().isUnauthorized());
	}
	@Test void should_expose_consistent_legacy_details_and_report_views() throws Exception { // REQ-127 REQ-130 REQ-131
		var viewer = jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"));
		http.perform(get("/api/v1/programs?q=BOLSA").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(1));
		http.perform(get("/api/v1/programs/GASF").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.beneficiaries.length()").value(83))
			.andExpect(jsonPath("$.program.code").value("GASF"))
			.andExpect(jsonPath("$.program.status").value("A"));
		http.perform(get("/api/v1/payments/900000000001505").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.beneficiaryId").value("BEN-000005"))
			.andExpect(jsonPath("$.grossAmount").value("132.80"))
			.andExpect(jsonPath("$.discountAmount").value("0.00"))
			.andExpect(jsonPath("$.amount").value("132.80"))
			.andExpect(jsonPath("$.status").value("D"))
			.andExpect(jsonPath("$.type").value("N"))
			.andExpect(jsonPath("$.paidAt").doesNotExist());
		http.perform(get("/api/v1/reports/summary?program=GASF").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.totalPayments").value(83)).andExpect(jsonPath("$.byProgram.length()").value(1));
		http.perform(get("/api/v1/payments?status=C&state=SP").with(viewer)).andExpect(status().isOk());
		http.perform(get("/api/v1/beneficiaries?q=unmatched&page=1").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(0));
		for (String uri : java.util.List.of("/api/v1/programs/unknown", "/api/v1/payments/unknown")) {
			http.perform(get(uri).with(viewer)).andExpect(status().isNotFound());
		}
		for (String locale : java.util.List.of("en", "es", "pt-BR")) {
			http.perform(get("/api/v1/reports/payments.csv?locale=" + locale).with(viewer)).andExpect(status().isOk());
		}
		http.perform(get("/api/v1/reports/payments.csv?locale=unknown").with(viewer)).andExpect(status().isBadRequest());
		http.perform(post("/api/v1/auth/login").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
	}
}
