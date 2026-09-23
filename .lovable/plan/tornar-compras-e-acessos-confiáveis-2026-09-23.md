# Tornar compras e acessos confiáveis

## Objetivo
Substituir os webhooks duplicados por um único fluxo seguro do GGCheckout, corrigir os dados históricos e validar login, acesso e reprodução sem alterar os dois episódios com PNG.

## Implementação
- Criar um cadastro central de produtos do checkout, relacionando cada ID externo a um plano, acesso +18, VIP ou série específica.
- Criar um webhook único que:
  - aceite somente notificações autenticadas pelo segredo configurado no GGCheckout;
  - valide formato, evento, pagamento, comprador, transação e produtos;
  - processe produto principal e adicionais da mesma compra;
  - conceda apenas o benefício cadastrado para cada produto;
  - reconheça contas existentes e deixe compras pendentes para cadastros futuros;
  - trate reenvios como a mesma compra, sem duplicar ou estender acesso indevidamente.
- Manter os endereços antigos temporariamente como compatibilidade, direcionando-os à mesma lógica segura, até a troca no GGCheckout.
- Atualizar a área administrativa para mostrar o webhook único e permitir conferir os produtos reconhecidos e os eventos processados.

## Correção dos dados atuais
- Consolidar registros repetidos por transação e produto, preservando o registro processado mais completo e todos os acessos já concedidos.
- Criar proteção permanente contra novas duplicidades.
- Corrigir assinaturas vencidas que ainda aparecem como ativas.
- Reconciliar compras aprovadas ainda não processadas e vincular registros processados às contas corretas quando possível.
- Não remover acesso legítimo nem modificar os dois episódios com PNG.

## Segurança
- Impedir que campos livres da notificação concedam VIP, +18 ou plano; esses benefícios virão somente do cadastro interno de produtos.
- Remover exposição desnecessária das rotinas internas e preservar somente as permissões necessárias para login, catálogo e reprodução.
- Usar criação segura de conta e manter a definição de senha no fluxo normal do usuário.
- Revisar dependências vulneráveis sem trocar preços, planos ou capacidade da nuvem.

## Validação final
- Testar notificações aprovada, pendente, recusada, repetida, produto desconhecido, produto principal com adicional e comprador com/sem conta.
- Testar cadastro aberto, login, atualização de acesso após compra, plano mensal, anual, VIP, +18 e compra avulsa restrita à série comprada.
- Rodar verificações de segurança, integridade do banco e compilação; corrigir qualquer falha encontrada.
- Publicar a versão final e confirmar a URL do webhook único para configuração no GGCheckout.

## Configuração necessária no final
Após o novo endereço existir, será necessário cadastrar o mesmo segredo forte no GGCheckout e no formulário seguro do projeto. Sem isso, o webhook rejeitará notificações para impedir compras falsas.
