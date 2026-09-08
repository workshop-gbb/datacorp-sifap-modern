package br.com.datacorp.sifap;

import org.springframework.boot.SpringApplication;

public class TestSifapApplication {

	public static void main(String[] args) {
		SpringApplication.from(SifapApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
