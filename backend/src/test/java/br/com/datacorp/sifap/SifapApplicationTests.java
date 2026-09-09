package br.com.datacorp.sifap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class SifapApplicationTests {
	@Autowired MockMvc http;

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
	@Test void should_compute_dashboard_from_database() throws Exception { // REQ-105
		http.perform(get("/api/v1/dashboard").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
			.andExpect(status().isOk()).andExpect(jsonPath("$.dataset.synthetic").value(true))
			.andExpect(jsonPath("$.totals.beneficiaries").value(150))
			.andExpect(jsonPath("$.totals.payments").value(150))
			.andExpect(jsonPath("$.totals.activePrograms").value(5))
			.andExpect(jsonPath("$.monthlyPayments.length()").value(6));
	}
	@Test void should_filter_paginate_and_validate_queries() throws Exception { // REQ-106 REQ-107
		var viewer = jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"));
		http.perform(get("/api/v1/beneficiaries?program=PRG-001&size=5").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(25))
			.andExpect(jsonPath("$.items.length()").value(5));
		http.perform(get("/api/v1/payments?size=101").with(viewer)).andExpect(status().isBadRequest());
		http.perform(get("/api/v1/beneficiaries/unknown").with(viewer)).andExpect(status().isNotFound());
		http.perform(get("/api/v1/beneficiaries/BEN-0001").with(viewer))
			.andExpect(status().isOk()).andExpect(jsonPath("$.payments.length()").value(6));
	}
	@Test void should_export_all_filtered_rows() throws Exception { // REQ-108
		http.perform(get("/api/v1/reports/payments.csv?program=PRG-001&locale=pt-BR")
			.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"))))
			.andExpect(status().isOk()).andExpect(header().string("Content-Disposition",
				"attachment; filename=\"sifap-synthetic-2026-08.csv\""))
			.andExpect(content().string(org.hamcrest.Matchers.containsString("Dados sinteticos")));
	}
	@Test void should_authenticate_real_viewer_credentials() throws Exception { // REQ-103
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"test-only\",\"role\":\"VIEWER\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("VIEWER"))
			.andExpect(jsonPath("$.accessToken").isString());
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"wrong\",\"role\":\"VIEWER\"}"))
			.andExpect(status().isUnauthorized());
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"viewer\",\"password\":\"test-only\",\"role\":\"ADMIN\"}"))
			.andExpect(status().isUnauthorized());
		http.perform(post("/api/v1/auth/login").contentType("application/json")
			.content("{\"username\":\"admin\",\"password\":\"admin-test-only\",\"role\":\"ADMIN\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("ADMIN"));
		http.perform(post("/api/v1/auth/viewer")).andExpect(status().isUnauthorized());
	}
	@Test void should_expose_consistent_details_and_report_views() throws Exception { // REQ-105 REQ-106 REQ-107 REQ-108
		var viewer = jwt().authorities(new SimpleGrantedAuthority("ROLE_VIEWER"));
		http.perform(get("/api/v1/programs?q=Renda").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(1));
		http.perform(get("/api/v1/programs/PRG-001").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.beneficiaries.length()").value(25));
		http.perform(get("/api/v1/payments/PAY-8-0001").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.beneficiaryId").value("BEN-0001"));
		http.perform(get("/api/v1/reports/summary?program=PRG-001").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.totalPayments").value(25)).andExpect(jsonPath("$.byProgram.length()").value(1));
		http.perform(get("/api/v1/payments?status=BLOCKED&state=SP").with(viewer)).andExpect(status().isOk());
		http.perform(get("/api/v1/beneficiaries?q=unmatched&page=1").with(viewer)).andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(0));
		for (String locale : java.util.List.of("en", "es", "pt-BR")) {
			http.perform(get("/api/v1/reports/payments.csv?locale=" + locale).with(viewer)).andExpect(status().isOk());
		}
		http.perform(get("/api/v1/reports/payments.csv?locale=unknown").with(viewer)).andExpect(status().isBadRequest());
		http.perform(post("/api/v1/auth/login").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
	}
}
