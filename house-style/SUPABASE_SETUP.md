# Configuração do login House Style

## O que esta configuração protege

O login e a sessão usam o Supabase Auth. O cadastro público sempre cria um perfil `customer`; o formulário não recebe nem aceita uma função privilegiada. A tabela `profiles` tem RLS: cada pessoa lê o próprio perfil, e a função e o vínculo de barbeiro não podem ser alterados pelo próprio usuário. Atribuições de administrador ou barbeiro devem ser feitas por uma pessoa administradora no SQL Editor do Supabase.

**Limitação importante do projeto atual:** agenda, atendimentos, serviços, despesas e relatórios continuam guardados no `localStorage` deste navegador. Não há tabelas de negócio, identificadores de cliente autenticado ou políticas RLS para esses dados. As permissões da interface e o filtro de barbeiro são uma barreira de navegação para este protótipo, não substituem autorização no servidor: alguém com acesso ao navegador pode inspecionar os dados locais, e navegadores/dispositivos diferentes não compartilham a agenda. Não use esses dados para informações reais ou sensíveis até migrar as tabelas de negócio para o Supabase e aplicar RLS por barbearia, barbeiro e cliente.

O cliente não recebe uma lista de agendamentos neste protótipo, pois os agendamentos existentes não têm vínculo com uma conta. A tela explica essa limitação em vez de exibir dados de outras pessoas ou criar agendamentos falsamente seguros.

## Preparar o Supabase

1. Crie ou selecione um projeto Supabase.
2. Copie a URL do projeto e a chave pública **anon/publishable** em **Project Settings → API**. Não use a chave `service_role` no frontend.
3. Na pasta `house-style`, copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Não publique esse arquivo.
4. No SQL Editor do Supabase, execute nesta ordem:
   - `supabase/migrations/20261021015500_create_profiles.sql`
   - `supabase/migrations/20261021020000_barber_licenses.sql`
5. Em **Authentication → URL Configuration**, configure a URL local (por exemplo `http://localhost:5173`) para recuperação de senha. Ajuste também os modelos de e-mail e a confirmação de endereço conforme o ambiente.
6. Reinicie o servidor Vite após criar ou alterar `.env.local`.

Se as migrations não foram aplicadas, a aplicação bloqueia o acesso de barbeiro e informa que não conseguiu validar o perfil/licença. Não existe login de demonstração ou fallback em `localStorage`.

## Como funciona a licença

- É necessário autenticar-se primeiro pela conta individual do Supabase. O código **não** é uma senha nem substitui a conta.
- Um administrador escolhe uma conta de usuário existente e a ficha local do barbeiro na nova aba **Gerenciar Barbeiros / Licenças**. Essa ação define o perfil `barber` no Supabase e gera um código exclusivo com 128 bits aleatórios.
- O banco guarda somente o hash SHA-256 e os últimos quatro caracteres; o código completo aparece apenas uma vez após a geração. Se for perdido, cancele a licença e gere outro código.
- O código gerado fica reservado para aquela conta e ficha. O barbeiro autentica-se com a própria conta, informa o código e a validade de 30 dias começa nesse momento, segundo o relógio do servidor PostgreSQL.
- O app confere o status ao abrir a sessão, a cada 30 segundos, quando a aba volta a ficar visível, ao navegar e antes das ações do barbeiro. Se a licença expirar, bloquear ou não puder ser validada, as telas de trabalho ficam fechadas. Renovação e ações administrativas são verificadas no banco.
- Uma licença ativa pode ser renovada por 30 dias a partir da maior entre a expiração atual e a hora do servidor. Uma licença bloqueada só volta a ficar ativa se um administrador escolher explicitamente “Renovar +30 dias e reativar”; desbloquear uma licença expirada não é permitido. Licenças canceladas são finais e exigem geração de um novo código.
- A lista mostra somente o sufixo do código. Não existe recurso para revelar um código completo já emitido; essa é uma escolha deliberada para não armazenar segredos recuperáveis.
- O perfil `admin` autenticado tem acesso permanente e não precisa de licença de barbeiro. O código fixo `ADMIN123` **não** concede privilégios e não é aceito como login: um código compartilhável não pode transformar uma conta em administradora. Crie/promova a conta administrativa pelo procedimento seguro abaixo.

## Criar e vincular contas de teste

1. Cadastre `admin@barbearia.com` e `barbeiro@barbearia.com` pela tela de cadastro com senhas fortes temporárias e confirme os e-mails, se solicitado. As contas não são criadas pelo código. Não use a senha `123`: além de fraca, ela não atende à validação da tela.
2. No SQL Editor do Supabase, promova somente a conta de teste para administradora:

   ```sql
   update public.profiles as p
   set role = 'admin', barber_id = null
   from auth.users as u
   where p.user_id = u.id
     and lower(u.email) = lower('admin@barbearia.com');
   ```

   Depois da alteração, saia e entre novamente para atualizar o perfil carregado na sessão.

3. Na aplicação, com a conta de administrador, cadastre uma ficha de barbeiro na aba **Barbeiros**. A ficha atual ainda é local ao navegador; anote o ID exibido na tela.
4. Promova/vincule a conta de barbeiro pelo painel **Gerenciar Barbeiros / Licenças**. Escolha a conta e a ficha cadastrada e clique **Vincular**. A alternativa manual é atualizar `profiles.role='barber'` e `profiles.barber_id` no SQL Editor (use o ID real da ficha). Depois, saia e entre na conta do barbeiro para atualizar o perfil da sessão.
5. **Somente para um Supabase local descartável**, o arquivo `supabase/dev_seed_barber_license.sql` prepara o código de teste `BARBEIRO30` para `barbeiro@barbearia.com`. Execute o seed por `psql` conectado ao banco local, numa mesma sessão:

   ```sql
   SET app.house_style_allow_test_seed = 'yes';
   \i supabase/dev_seed_barber_license.sql
   ```

   O script falha se essa configuração de sessão estiver ausente. Não execute essa configuração nem o seed em um projeto Supabase de produção: `BARBEIRO30` é previsível e serve apenas para desenvolvimento local. Para um projeto de teste remoto, gere um código aleatório pelo painel administrativo.
6. Entre como barbeiro com a conta de e-mail e senha cadastradas, informe `BARBEIRO30` e confira a validade. A primeira ativação inicia os 30 dias; o código não deve ser reutilizado em outra conta.
7. Teste validade e bloqueio pelo painel. Para testar expiração sem esperar, use exclusivamente banco local e ajuste `expires_at` via SQL de desenvolvimento; a tela não permite alterar a data e o servidor continua sendo a autoridade.

## Conferir os perfis na interface

- **Administrador:** pode abrir Dashboard, Agenda, Atendimentos, Barbeiros, Financeiro, Serviços, Configurações e a aba **Gerenciar Barbeiros / Licenças**, que permite vincular contas, gerar código, renovar, bloquear, desbloquear, cancelar e consultar o histórico.
- **Barbeiro:** enquanto não ativar uma licença válida, não abre a aplicação. Com licença ativa, vê somente as abas Agenda e Atendimentos, além de Minha conta. O campo `barber_id` deve coincidir com a ficha local nesse navegador.
- **Rendimentos:** o barbeiro também tem a aba **Meus rendimentos**, filtrada pelo identificador de barbeiro vinculado. Como as vendas ainda são locais, esse filtro é apenas de interface e não é uma proteção de dados no servidor.
- **Cliente:** vê Minha conta. Seus agendamentos ainda não estão disponíveis até que a agenda seja migrada para tabelas Supabase com RLS.
- Para confirmar que o cadastro não pode elevar privilégios, crie um novo usuário e verifique que `public.profiles.role` é `customer`. Alterar `role` ou `barber_id` como esse usuário deve falhar. As RPCs administrativas também recusam chamadas de cliente/barbeiro, mesmo que sejam invocadas manualmente fora da interface.

O Supabase Auth mantém a sessão oficial. A opção **Lembrar-me** grava o token de sessão no armazenamento persistente do navegador quando marcada; desmarcada, usa `sessionStorage`, encerrando a persistência ao fechar a aba/janela. A senha nunca é gravada pela aplicação.

## Limitação de segurança que continua pendente

Licenças, perfis e histórico são protegidos no Supabase por RLS, tabelas sem acesso direto e funções `SECURITY DEFINER` que conferem o perfil de administrador no banco. O frontend não contém chave `service_role`. **Porém, agenda, atendimentos, rendimentos, serviços, despesas e configurações continuam no `localStorage` compartilhado do protótipo, sem API ou políticas RLS.** As verificações por licença bloqueiam a navegação e as ações da interface, mas não podem proteger esses dados de alguém que manipule o navegador ou altere o próprio armazenamento. Não use dados reais/sensíveis nem trate o isolamento dos dados operacionais como segurança de produção até migrar esses registros para tabelas Supabase e criar RLS por barbearia, barbeiro e cliente.

## Comandos de verificação

Execute na raiz do repositório:

```powershell
npm --prefix .\house-style run build
npm --prefix .\house-style test
```

O build e os testes automatizados não substituem a aplicação das migrations e o teste dos RPCs em um projeto Supabase de desenvolvimento.
