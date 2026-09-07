package br.com.datacorp.sifap;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArchitectureTest {
    @Test void should_keep_feature_modules_independent() { // REQ-112
        var classes = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("br.com.datacorp.sifap");
        slices().matching("br.com.datacorp.sifap.(*)..").should().beFreeOfCycles().check(classes);
        noClasses().that().resideInAPackage("..records..").should().dependOnClassesThat()
            .resideInAnyPackage("..auth..", "..integrations..").check(classes);
    }
}
