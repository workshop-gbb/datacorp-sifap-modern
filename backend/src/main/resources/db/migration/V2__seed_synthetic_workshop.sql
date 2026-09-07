-- Valores de demonstracao; nenhuma formula de beneficio legado e implementada.
INSERT INTO social_program (code, name, type, status) VALUES
('PRG-001', 'Renda Cidada', 'INCOME', 'ACTIVE'),
('PRG-002', 'Aprender Mais', 'EDUCATION', 'ACTIVE'),
('PRG-003', 'Casa Acolhedora', 'HOUSING', 'ACTIVE'),
('PRG-004', 'Saude Presente', 'HEALTH', 'ACTIVE'),
('PRG-005', 'Mesa para Todos', 'FOOD', 'ACTIVE'),
('PRG-006', 'Novos Caminhos', 'EMPLOYMENT', 'SUSPENDED');

INSERT INTO beneficiary (id, name, document_masked, program_code, state, city, status, enrolled_at)
SELECT 'BEN-' || lpad(n::text, 4, '0'),
       'Participante ' || lpad(n::text, 3, '0'),
       '***.***.***-**',
       'PRG-' || lpad(((n - 1) % 6 + 1)::text, 3, '0'),
       (ARRAY['SP', 'RJ', 'MG', 'BA', 'PE', 'CE', 'RS', 'PR', 'PA', 'DF'])[(n - 1) % 10 + 1],
       (ARRAY['Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Recife',
              'Fortaleza', 'Porto Alegre', 'Curitiba', 'Belem', 'Brasilia'])[(n - 1) % 10 + 1],
       CASE WHEN n % 17 = 0 THEN 'SUSPENDED' WHEN n % 13 = 0 THEN 'PENDING' ELSE 'ACTIVE' END,
       DATE '2026-01-01' + ((n - 1) % 60)
FROM generate_series(1, 150) AS n;

INSERT INTO payment (id, beneficiary_id, period, amount, status, paid_at)
SELECT 'PAY-' || m || '-' || lpad(n::text, 4, '0'),
       'BEN-' || lpad(n::text, 4, '0'),
       '2026-' || lpad(m::text, 2, '0'),
       (ARRAY[600.00, 250.00, 450.00, 300.00, 220.00, 380.00])[(n - 1) % 6 + 1],
       CASE WHEN n % 17 = 0 THEN 'BLOCKED'
            WHEN m = 8 AND n % 7 = 0 THEN 'PENDING' ELSE 'PAID' END,
       CASE WHEN n % 17 = 0 OR (m = 8 AND n % 7 = 0) THEN NULL
            ELSE make_date(2026, m, 10 + n % 15) END
FROM generate_series(1, 150) AS n CROSS JOIN generate_series(3, 8) AS m;
