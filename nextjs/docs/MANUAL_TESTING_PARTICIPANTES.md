# Guia de Testes Manuais - Sistema de Gerenciamento de Participantes

Este documento contém todos os casos de teste que devem ser executados manualmente para validar o sistema de gerenciamento de participantes.

## Pré-requisitos

- Aplicação rodando localmente (`pnpm dev`)
- Usuário com perfil de organizador cadastrado
- Eventos criados com participantes inscritos
- Alguns participantes já com check-in realizado

## 🧪 Casos de Teste

---

### CT-01: Carregamento Inicial (Organizador com Múltiplos Eventos)

**Objetivo:** Verificar se a página carrega corretamente para organizador com múltiplos eventos

**Passos:**
1. Faça login como organizador que possui múltiplos eventos
2. Navegue para `/admin/participantes`
3. Aguarde o carregamento completo

**Resultado Esperado:**
- ✅ Loading state exibido durante carregamento (spinner + texto)
- ✅ Cards de métricas carregam com valores corretos:
  - Total de Participantes
  - Check-in Realizados
  - Pendentes
  - Taxa de Check-in (%)
- ✅ Tabela exibe participantes de TODOS os eventos do organizador
- ✅ Paginação funcional (se houver mais de 25 participantes)
- ✅ Filtros disponíveis mostram todos os eventos do organizador

**Critérios de Performance:**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- Tabela deve renderizar em menos de 500ms após resposta da API

---

### CT-02: Busca por Nome com Debounce

**Objetivo:** Validar funcionamento do debounce na busca

**Passos:**
1. No campo de busca, digite "João" caractere por caractere rapidamente
2. Observe o comportamento da busca
3. Aguarde 300ms após parar de digitar
4. Digite "Maria" e imediatamente clique em um filtro

**Resultado Esperado:**
- ✅ Busca NÃO dispara imediatamente a cada caractere
- ✅ Busca dispara apenas 300ms após parar de digitar
- ✅ Mostra "X" para limpar busca quando há texto
- ✅ Badge "Busca: João" aparece nos filtros ativos
- ✅ Busca funciona para:
  - Nome do participante
  - Email
  - Telefone
  - Documento
  - Código do ingresso
- ✅ Resultados filtrados corretamente
- ✅ Paginação reseta para página 1

**Teste de Acessibilidade:**
- Tab até o campo de busca e digite usando teclado
- Screen reader deve anunciar "Buscar participantes"
- Botão "X" deve ser focusável e ativável com Enter/Space

---

### CT-03: Check-in Bem-sucedido

**Objetivo:** Realizar check-in de um participante sem check-in prévio

**Passos:**
1. Identifique um participante SEM check-in na tabela
2. Clique no botão "Fazer Check-in"
3. Verifique as informações no dialog
4. Clique em "Confirmar Check-in"
5. Aguarde a confirmação

**Resultado Esperado:**
- ✅ Dialog abre com informações corretas:
  - Nome do participante
  - Email
  - Código do ingresso
- ✅ Não exibe warning de check-in já realizado
- ✅ Botão "Confirmar Check-in" está habilitado
- ✅ Toast de sucesso aparece: "Check-in realizado! ✓"
- ✅ Dialog fecha automaticamente
- ✅ Tabela atualiza mostrando:
  - ✓ ícone verde
  - Data/hora do check-in
- ✅ Métricas atualizam:
  - Check-in Realizados +1
  - Pendentes -1
  - Taxa de Check-in recalculada

**Teste Mobile:**
- Repita no card mobile (< 640px)
- Dialog deve ser responsivo

---

### CT-04: Check-in Duplicado (Validação)

**Objetivo:** Validar que não é possível fazer check-in duplicado

**Passos:**
1. Identifique um participante QUE JÁ TEM check-in
2. Clique no menu dropdown (três pontos)
3. Clique em "Fazer check-in"
4. Observe o dialog
5. Tente confirmar

**Resultado Esperado:**
- ✅ Dialog abre mostrando warning amarelo:
  - "Check-in já realizado"
  - Data e hora do check-in anterior
- ✅ Se tentar fazer check-in novamente, API retorna erro:
  - Status 400
  - Mensagem: "Check-in já foi realizado para este participante"
- ✅ Toast de erro é exibido
- ✅ Dialog continua aberto para mostrar o erro

**Validação Server-Side:**
```bash
# Teste direto via API (use token válido)
curl -X POST http://localhost:3000/api/admin/participantes/[ID]/checkin \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# Fazer duas vezes seguidas - segunda deve retornar erro
```

---

### CT-05: Filtro por Evento

**Objetivo:** Filtrar participantes por evento específico

**Passos:**
1. Clique no botão "Filtros" (ícone de funil)
2. Selecione um ou mais eventos no filtro "Eventos"
3. Clique em "Aplicar Filtros"
4. Observe os resultados

**Resultado Esperado:**
- ✅ Sheet de filtros abre no mobile, popover no desktop
- ✅ Lista de eventos carrega com títulos corretos
- ✅ Múltiplos eventos podem ser selecionados
- ✅ Ao aplicar:
  - Tabela mostra APENAS participantes dos eventos selecionados
  - Badge aparece: "Evento: [Nome do Evento]"
  - Métricas atualizam para refletir apenas eventos filtrados
  - Paginação reseta para página 1
- ✅ Ao remover badge, filtro é removido
- ✅ Botão "Limpar todos os filtros" remove todos

**Combinação de Filtros:**
- Aplique filtro de evento + status de pagamento
- Ambos devem funcionar juntos (AND lógico)

---

### CT-06: Exportação CSV

**Objetivo:** Exportar dados filtrados para CSV

**Passos:**
1. Aplique alguns filtros (ex: evento específico, com check-in)
2. Clique no botão "Exportar CSV"
3. Aguarde o download
4. Abra o arquivo no Excel/Google Sheets
5. Verifique o conteúdo

**Resultado Esperado:**
- ✅ Botão mostra loading state: "Exportando..."
- ✅ Toast de sucesso: "X participantes exportados com sucesso"
- ✅ Arquivo baixa automaticamente com nome:
  - Formato: `participantes_YYYY-MM-DD_HH-mm-ss.csv`
- ✅ Arquivo abre corretamente no Excel (UTF-8 com BOM)
- ✅ Contém todas as 15 colunas:
  1. Nome
  2. Email
  3. Telefone
  4. Documento
  5. Código do Ingresso
  6. Evento
  7. Data do Evento
  8. Local
  9. Tipo de Ingresso
  10. Quantidade
  11. Valor Total
  12. Status de Pagamento
  13. Método de Pagamento
  14. Check-in (Sim/Não)
  15. Data do Check-in
- ✅ Dados correspondem aos filtros aplicados
- ✅ Acentuação correta (não aparece "JoÃ£o")
- ✅ Vírgulas em campos não quebram colunas (escape correto)

**Teste de Limite:**
- Se houver mais de 10.000 participantes, exportação limita a 10.000
- Toast deve indicar se houver limite

---

### CT-07: Navegação para Detalhes

**Objetivo:** Acessar página de detalhes do participante

**Passos:**
1. Na tabela, clique no nome de um participante (link)
2. Ou clique no menu dropdown > "Ver detalhes"
3. Observe a página de detalhes

**Resultado Esperado:**
- ✅ Navega para `/admin/participantes/[ID]`
- ✅ Breadcrumb correto: "Participantes > [Nome]"
- ✅ Todas as seções exibidas:
  - **Informações Pessoais**: Nome, Email, Telefone, Documento
  - **Detalhes da Inscrição**: Evento, Data, Local, Ingresso, Quantidade, Código
  - **Pagamento**: Valor unitário, Taxa de serviço, Total, Status, Método
  - **Informações Adicionais**: JSON formatado (se houver)
  - **Check-in** (sidebar): Status e data ou botão para fazer
  - **Ações** (sidebar): Reenviar email, Editar, Cancelar
- ✅ Botão "Voltar" funciona
- ✅ Loading state durante carregamento
- ✅ Dark mode funcional

**Responsividade:**
- Desktop: 3 colunas (2 principais + sidebar)
- Mobile: Empilhado, sidebar vai para o final

---

### CT-08: Segurança - Organizador Não Autorizado (403)

**Objetivo:** Validar que organizador só vê seus próprios participantes

**Passos:**
1. Faça login como Organizador A
2. Abra DevTools > Network
3. Navegue para `/admin/participantes`
4. Identifique o ID de um participante do Organizador A
5. Faça logout e login como Organizador B
6. Tente acessar diretamente:
   - `/admin/participantes/[ID_DO_ORGANIZADOR_A]`
   - Ou via API: `GET /api/admin/participantes/[ID_DO_ORGANIZADOR_A]`

**Resultado Esperado:**
- ✅ Organizador B NÃO vê participante do Organizador A
- ✅ API retorna:
  - Status 404 ou 403
  - Mensagem: "Participante não encontrado ou não autorizado"
- ✅ Página mostra erro apropriado
- ✅ Logs não revelam informações sensíveis

**Validação de Token:**
```bash
# Sem token
curl http://localhost:3000/api/admin/participantes
# Deve retornar 401: "Não autenticado"

# Com token inválido
curl http://localhost:3000/api/admin/participantes \
  -H "Authorization: Bearer invalid_token"
# Deve retornar 401
```

**Validação de Organizador:**
- Usuário autenticado mas NÃO é organizador deve retornar 403
- Todas as APIs devem validar:
  1. Token válido
  2. Usuário existe
  3. Usuário é organizador
  4. Participante pertence ao organizador

---

### CT-09: Testes Mobile em Diferentes Dispositivos

**Objetivo:** Validar responsividade em diferentes tamanhos de tela

**Dispositivos para Testar:**
1. **iPhone SE (375px)** - Mobile pequeno
2. **iPhone 12/13 (390px)** - Mobile padrão
3. **iPad (768px)** - Tablet
4. **iPad Pro (1024px)** - Tablet grande
5. **Desktop (1440px)** - Desktop padrão

**Checklist por Dispositivo:**

#### Mobile (< 640px)
- ✅ Cards verticais em vez de tabela
- ✅ Métricas: 1 coluna
- ✅ Filtros: Sheet (modal bottom-up)
- ✅ Botões empilhados (Export + Filtros)
- ✅ Check-in via dropdown ou botão no card
- ✅ Animação fade-in dos cards
- ✅ Breadcrumb responsivo na página de detalhes

#### Tablet (640-1024px)
- ✅ Tabela com scroll horizontal
- ✅ Métricas: 2 colunas
- ✅ Filtros: Popover ou Sheet
- ✅ Todas as colunas visíveis (com scroll)

#### Desktop (> 1024px)
- ✅ Tabela completa sem scroll
- ✅ Métricas: 4 colunas
- ✅ Filtros: Popover
- ✅ Layout em grid (página de detalhes)

**Teste de Orientação:**
- Gire o dispositivo (portrait ↔ landscape)
- Layout deve se adaptar corretamente

---

### CT-10: Teste de Performance (LCP, FID)

**Objetivo:** Medir métricas de performance

**Ferramentas:**
- Chrome DevTools > Lighthouse
- Web Vitals Extension

**Passos:**
1. Abra a página em modo anônimo (sem cache)
2. Execute Lighthouse (Mobile + Desktop)
3. Registre as métricas

**Resultado Esperado:**
- ✅ **LCP** (Largest Contentful Paint) < 2.5s
  - Elemento principal: Tabela de participantes
- ✅ **FID** (First Input Delay) < 100ms
  - Teste clicando em botões logo após load
- ✅ **CLS** (Cumulative Layout Shift) < 0.1
  - Página não deve "pular" durante carregamento
- ✅ **TTI** (Time to Interactive) < 3.5s

**Otimizações Verificadas:**
- ✅ Debounce na busca (300ms)
- ✅ Paginação (25 itens/página)
- ✅ React.memo em MetricsCards
- ✅ useMemo nas colunas
- ✅ useCallback nos handlers
- ✅ Cleanup de requests com `cancelled` flag

**Teste de Carga:**
- Simule 100+ participantes
- Exportação deve limitar a 10.000 registros

---

### CT-11: Verificar Acessibilidade (Navegação por Teclado, ARIA)

**Objetivo:** Garantir que a interface é acessível

**Ferramentas:**
- axe DevTools
- Screen reader (NVDA no Windows, VoiceOver no Mac)
- Apenas teclado (sem mouse)

#### Navegação por Teclado

**Passos:**
1. Abra a página
2. Use apenas teclado (Tab, Shift+Tab, Enter, Space, Esc)
3. Percorra todos os elementos interativos

**Checklist:**
- ✅ Tab navega por todos os elementos focusáveis na ordem correta:
  1. Botão "Voltar"
  2. Campo de busca
  3. Botão "Limpar busca" (se houver texto)
  4. Botão "Exportar CSV"
  5. Botão "Filtros"
  6. Checkboxes da tabela
  7. Botões de ação (Check-in, Menu)
  8. Links de nome dos participantes
  9. Botões de paginação
- ✅ Enter/Space ativa botões e links
- ✅ Esc fecha dialogs e popovers
- ✅ Foco visível (outline azul)
- ✅ Trap de foco em dialogs (Tab não sai do dialog)

#### ARIA Labels e Semântica

**Checklist:**
- ✅ Checkboxes têm aria-label:
  - Header: "Selecionar todos os participantes"
  - Row: "Selecionar [Nome]"
- ✅ Campo de busca tem aria-label: "Buscar participantes"
- ✅ Botão de limpar busca: aria-label "Limpar busca"
- ✅ Ícones decorativos: aria-hidden="true"
- ✅ Botão de menu: sr-only "Abrir menu"
- ✅ Dialogs têm:
  - DialogTitle (lido pelo screen reader)
  - DialogDescription
  - role="dialog"
  - aria-modal="true"
- ✅ Badges de status têm contraste adequado (WCAG AA)
- ✅ Links têm texto descritivo (não "clique aqui")

#### Screen Reader

**Teste com NVDA/VoiceOver:**
1. Ative o screen reader
2. Navegue pela página
3. Acione ações principais

**Resultado Esperado:**
- ✅ Título da página anunciado: "Gerenciar Participantes"
- ✅ Cards de métricas anunciados com valores
- ✅ Campo de busca anunciado com label
- ✅ Status de check-in anunciado ("Check-in realizado", "Pendente")
- ✅ Dialog de check-in lido corretamente:
  - Título: "Confirmar Check-in"
  - Descrição: "Confirme a presença..."
  - Nome do participante
  - Botões: "Cancelar", "Confirmar Check-in"
- ✅ Loading states anunciados

**Contraste de Cores:**
- Use axe DevTools para verificar contraste
- Todas as cores devem passar WCAG AA (4.5:1 para texto normal)

---

### CT-12: Dark Mode

**Objetivo:** Verificar suporte a dark mode em todos os componentes

**Passos:**
1. Ative dark mode no sistema operacional
2. Recarregue a página
3. Navegue por todas as telas
4. Alterne entre light/dark mode

**Componentes a Verificar:**
- ✅ ParticipantsTable
- ✅ ParticipantCard (mobile)
- ✅ MetricsCards
- ✅ SearchBar
- ✅ ParticipantFilters (Sheet/Popover)
- ✅ ActiveFilterBadges
- ✅ ExportButton
- ✅ CheckInDialog
- ✅ Página de detalhes

**Checklist:**
- ✅ Backgrounds escuros: `dark:bg-gray-800`, `dark:bg-gray-900`
- ✅ Borders visíveis: `dark:border-gray-700`
- ✅ Texto legível: `dark:text-white`, `dark:text-gray-400`
- ✅ Hover states funcionam: `dark:hover:bg-gray-800/40`
- ✅ Ícones visíveis com cores adaptadas
- ✅ Badges mantêm contraste adequado
- ✅ Loading spinner visível: `dark:text-blue-400`
- ✅ Sem flashes brancos ao navegar

---

## 📋 Checklist de Validação Final

Antes de marcar a feature como completa, todos os itens devem estar ✅:

### Funcionalidade
- [ ] CT-01: Carregamento inicial funciona
- [ ] CT-02: Debounce de busca funciona (300ms)
- [ ] CT-03: Check-in bem-sucedido
- [ ] CT-04: Check-in duplicado é bloqueado
- [ ] CT-05: Filtros funcionam corretamente
- [ ] CT-06: Exportação CSV completa
- [ ] CT-07: Navegação para detalhes
- [ ] CT-08: Segurança validada (403/404)

### UX/UI
- [ ] CT-09: Responsividade em todos os tamanhos
- [ ] CT-12: Dark mode em todos os componentes
- [ ] Loading states polidos
- [ ] Empty states com mensagens úteis
- [ ] Animações suaves

### Performance
- [ ] CT-10: LCP < 2.5s
- [ ] CT-10: FID < 100ms
- [ ] Paginação funcional
- [ ] Debounce implementado
- [ ] Memoização adequada

### Acessibilidade
- [ ] CT-11: Navegação por teclado completa
- [ ] CT-11: ARIA labels em todos os elementos interativos
- [ ] CT-11: Screen reader funcional
- [ ] CT-11: Contraste de cores adequado (WCAG AA)
- [ ] CT-11: Foco visível

### Segurança
- [ ] Autenticação validada em todas as APIs
- [ ] Autorização por organizador
- [ ] Validações server-side
- [ ] Erros não revelam informações sensíveis

---

## 🐛 Relatório de Bugs

Use este template para reportar bugs encontrados:

```markdown
### Bug: [Título curto]

**Severidade:** 🔴 Crítico / 🟡 Médio / 🟢 Baixo

**Caso de Teste:** CT-XX

**Passos para Reproduzir:**
1. ...
2. ...

**Resultado Esperado:**
...

**Resultado Atual:**
...

**Ambiente:**
- Browser: Chrome 120
- Dispositivo: Desktop
- Viewport: 1440x900
- Dark Mode: Sim/Não

**Screenshots/Videos:**
[anexar aqui]

**Console Errors:**
```
[colar erros do console]
```

**Network Errors:**
```
[colar erros de rede]
```
```

---

## 🎯 Critérios de Aceitação

A feature está pronta para produção quando:

1. ✅ Todos os 12 casos de teste passam
2. ✅ Checklist de validação 100% completa
3. ✅ Nenhum bug crítico (🔴) pendente
4. ✅ Performance dentro dos limites (LCP < 2.5s, FID < 100ms)
5. ✅ Acessibilidade validada (axe DevTools sem erros críticos)
6. ✅ Responsividade testada em pelo menos 3 dispositivos
7. ✅ Dark mode funcionando em todos os componentes
8. ✅ Segurança validada (403/404 para acessos não autorizados)

---

## 📝 Notas Adicionais

### Bugs Conhecidos Corrigidos
- ✅ Check-in duplicado agora é bloqueado server-side (queries.ts:272)
- ✅ Checkboxes agora têm aria-label (columns.tsx:41, 50)
- ✅ SearchBar tem aria-label e ícones decorativos com aria-hidden (SearchBar.tsx)
- ✅ MetricsCards otimizado com React.memo

### Melhorias Implementadas
- Validação server-side de check-in duplicado
- ARIA labels em elementos interativos
- React.memo em MetricsCards para performance
- Debounce de 300ms na busca
- UTF-8 com BOM na exportação CSV

### Próximos Passos (Fora do Escopo)
- Implementar edição de participante
- Implementar reenvio de email
- Implementar cancelamento de inscrição
- Adicionar filtro de data range para check-in
- Adicionar ordenação por coluna na tabela
