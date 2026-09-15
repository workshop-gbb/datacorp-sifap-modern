package br.com.datacorp.sifap.records;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

final class Csv {
    private Csv() {}
    static String cell(String value) {
        String safe = value == null ? "" : value;
        if (safe.stripLeading().matches("^[=+@\\-].*") || safe.startsWith("\t") || safe.startsWith("\r")) {
            safe = "'" + safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
    static String row(String... values) {
        return Arrays.stream(values).map(Csv::cell).collect(Collectors.joining(",")) + "\r\n";
    }
    static String payments(List<Views.PaymentView> payments, String locale) {
        String[] headers = switch (locale) {
            case "pt-BR" -> new String[]{"Referencia", "Participante", "Programa", "UF", "Competencia",
                "Valor bruto BRL", "Desconto BRL", "Valor liquido BRL", "Codigo status", "Codigo tipo",
                "Dados sinteticos"};
            case "es" -> new String[]{"Referencia", "Participante", "Programa", "Estado", "Periodo",
                "Importe bruto BRL", "Descuento BRL", "Importe neto BRL", "Codigo de estado",
                "Codigo de tipo", "Datos sinteticos"};
            default -> new String[]{"Reference", "Participant", "Program", "State", "Period",
                "Gross amount BRL", "Discount amount BRL", "Net amount BRL", "Status code",
                "Type code", "Synthetic data"};
        };
        StringBuilder result = new StringBuilder("\uFEFF").append(row(headers));
        for (var payment : payments) {
            // REQ-130 REQ-131: retain opaque codes and all three source amounts.
            result.append(row(payment.id(), payment.beneficiaryName(), payment.programName(),
                payment.state(), payment.period(), payment.grossAmount(), payment.discountAmount(),
                payment.amount(), payment.status(), payment.type(), "true"));
        }
        return result.toString();
    }
}
