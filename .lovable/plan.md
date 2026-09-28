# Criar webhook avulso da Professora Mia

## Implementação
- Criar o endereço antigo exclusivo `webhook-professora-mia`, fixado ao conteúdo “Professora Mia, Segredo Secreto!”.
- Aceitar os formatos de notificação já usados pelos webhooks antigos e processar somente pagamentos aprovados.
- Identificar o comprador pelo e-mail, vincular conta existente ou deixar o acesso corretamente associado ao cadastro.
- Liberar acesso vitalício somente à série Professora Mia, sem conceder +18 geral, VIP ou outros títulos.
- Registrar a compra e impedir que reenvios criem acesso duplicado.

## Validação
- Publicar a função e testar notificação aprovada, pagamento não aprovado e ausência de e-mail.
- Confirmar que o acesso criado aponta exclusivamente para Professora Mia.
- Informar o endereço completo para configurar no produto correspondente no GGCheckout.
