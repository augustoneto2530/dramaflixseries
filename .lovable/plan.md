# Auditoria e estabilização completa da Dramaflix

## Objetivo
Revisar o funcionamento real do site, corrigir falhas de acesso e pagamento, validar os popups e reduzir o tempo entre clicar em assistir e o vídeo começar, sem alterar preços ou planos comerciais.

## Checklist de implementação

1. **Pagamentos e webhooks**
   - Auditar mensal, anual, VIP, +18 e todos os títulos avulsos.
   - Impedir que uma compra enviada ao webhook errado libere outro plano ou conteúdo.
   - Aceitar somente notificações de pagamento realmente aprovado e validar o produto correspondente.
   - Tornar reenvios da mesma transação seguros, sem duplicar ou reduzir acessos já existentes.
   - Garantir conta existente, conta nova e compra anterior ao cadastro.
   - Reprocessar somente compras aprovadas que ficaram pendentes por falha técnica.

2. **Regras de acesso**
   - Validar a hierarquia VIP, anual, mensal, +18 e avulso no navegador e no banco.
   - Garantir que o avulso, inclusive +18, libere somente o título comprado.
   - Corrigir divergências entre card, página do conteúdo, lista de episódios e tela do vídeo.
   - Atualizar o acesso imediatamente depois do login e após o reconhecimento de uma compra.

3. **Login, cadastro e atividade**
   - Testar cadastro, login, recuperação de acesso e criação automática do perfil.
   - Conferir cadastros, espectadores e reproduções recentes.
   - Revisar erros recentes do site, autenticação, banco e funções de pagamento.

4. **Popups e links de compra**
   - Testar os popups de lançamento, +18, plano e compra avulsa em celular e computador.
   - Confirmar que cada bloqueio mostra a oferta correta e que clientes com acesso não veem popup indevido.
   - Preservar os links de checkout atualmente definidos.

5. **Início e estabilidade dos vídeos**
   - Reduzir consultas e esperas duplicadas antes de abrir o player.
   - Carregar em paralelo os dados seguros necessários e preparar o vídeo antes do clique quando possível.
   - Melhorar estados de carregamento, tentativa de reprodução, buffering e mensagens de erro.
   - Corrigir salvamento de progresso que possa falhar ou atrasar a reprodução.
   - Validar URLs e resposta dos vídeos mais acessados, sem recodificar arquivos hospedados externamente.

6. **Validação final**
   - Executar testes direcionados dos webhooks sem criar liberações falsas.
   - Testar fluxos públicos e autenticados no site em desktop e celular.
   - Verificar compilação, erros de execução, rede e segurança.
   - Publicar as mudanças do site e confirmar o funcionamento da versão pública.

## Detalhes técnicos
- Centralizar validação de eventos, produto e transação dos webhooks para evitar regras diferentes entre funções.
- Manter a validação de acesso também no banco; o navegador não será a única barreira.
- Não alterar valores, duração ou composição dos planos.
- O trabalho reduz falhas controláveis pela aplicação, mas disponibilidade absoluta também depende da infraestrutura externa e da hospedagem dos vídeos.
