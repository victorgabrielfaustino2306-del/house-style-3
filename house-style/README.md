# House Style — gestão de barbearia

## Primeira vez (faça uma vez só)
1. Instale o Node.js (versão LTS) em https://nodejs.org e reinicie o computador.
2. Abra esta pasta no VS Code (Arquivo > Abrir Pasta).
3. Abra o terminal do VS Code (menu Terminal > Novo Terminal).
4. Copie e cole, e aperte Enter:
   `npm install`
5. Depois:
   `npm run dev`
6. Abra no navegador o endereço que aparecer (normalmente http://localhost:5173).

## Nos outros dias
Só rode `npm run dev` de novo.

## Testes dos cálculos
`npm test`

## Publicar na internet (Vercel)
1. Envie a pasta para um repositório no GitHub.
2. Em vercel.com, clique em Add New > Project, escolha o repositório e clique em Deploy (Vercel detecta Vite sozinha).

## Importante sobre os dados
Os dados ficam salvos no navegador do aparelho usado. Não são compartilhados entre celular e computador, nem entre pessoas, e se os dados do navegador forem apagados eles somem. Use Configurações > Exportar backup com frequência. Não há login nesta versão: para uso por vários barbeiros, o próximo passo é um banco remoto (Supabase) com autenticação.
