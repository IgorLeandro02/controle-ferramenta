# Sistema de Controle de Ferramentas

Sistema web desenvolvido para auxiliar no controle, organização e consulta de ferramentas, equipamentos e itens de laboratório.

O projeto foi criado com foco em melhorar a rastreabilidade dos itens, facilitar o cadastro, controlar movimentações e reduzir perdas ou desorganização dentro do ambiente de trabalho.

---

## Objetivo do Projeto

O objetivo deste sistema é oferecer uma ferramenta simples e funcional para o controle de ferramentas e equipamentos, permitindo registrar informações importantes como nome do item, projeto ou área responsável, quantidade, localização, status e histórico de movimentações.

Esse projeto também foi desenvolvido como parte de uma atividade acadêmica e como forma de evolução prática em desenvolvimento web.

---

## Funcionalidades

- Cadastro de ferramentas e equipamentos
- Geração automática de tag por projeto ou área
- Consulta e busca de itens cadastrados
- Filtro por projeto/área
- Controle de status:
  - Disponível
  - Em uso
  - Manutenção
- Registro de retirada e devolução
- Histórico de movimentações
- Importação de dados via Excel
- Exportação dos dados em CSV/Excel
- Geração de QR Code para os itens
- Impressão de etiqueta com QR Code
- Armazenamento local dos dados no navegador

---

## Tecnologias Utilizadas

- React
- Vite
- JavaScript
- Tailwind CSS
- ExcelJS
- qrcode.react
- Git e GitHub

---

## Como Executar o Projeto (No terminal)

### 1. Clonar o repositório

```bash
git clone https://github.com/IgorLeandro02/controle-ferramenta.git
cd controle-ferramentas
npm install
npm run dev
``` 

### Depois é só abrir o endereço gerado no terminal para visualizar o sistema









# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
