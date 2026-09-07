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
            case "pt-BR" -> new String[]{"Referencia","Participante","Programa","UF","Competencia","Valor BRL","Situacao","Dados sinteticos"};
            case "es" -> new String[]{"Referencia","Participante","Programa","Estado","Periodo","Importe BRL","Estado de pago","Datos sinteticos"};
            default -> new String[]{"Reference","Participant","Program","State","Period","Amount BRL","Payment status","Synthetic data"};
        };
        StringBuilder result = new StringBuilder("\uFEFF").append(row(headers));
        for (var payment : payments) {
            String status = switch (locale + ":" + payment.status()) {
                case "pt-BR:PAID" -> "Pago";
                case "pt-BR:PENDING" -> "Pendente";
                case "pt-BR:BLOCKED" -> "Bloqueado";
                case "es:PAID" -> "Pagado";
                case "es:PENDING" -> "Pendiente";
                case "es:BLOCKED" -> "Bloqueado";
                default -> payment.status();
            };
            result.append(row(payment.id(), payment.beneficiaryName(), payment.programName(),
                payment.state(), payment.period(), payment.amount(), status, "true"));
        }
        return result.toString();
    }
}
