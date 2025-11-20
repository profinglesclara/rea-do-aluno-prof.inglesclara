-- Rodar a função criar-usuarios-teste uma única vez
select net.http_post(
  url := 'http://localhost:54321/functions/v1/criar-usuarios-teste',
  headers := '{"Content-Type": "application/json"}',
  body := '{}'
);
