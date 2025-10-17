# Geração de Imagens de Capa com IA

## Visão Geral

Este projeto implementa a funcionalidade de geração automática de imagens de capa para eventos usando a API da OpenAI (DALL-E 3). A funcionalidade está integrada ao formulário de criação de eventos no passo "Visual".

## Arquitetura

### Componentes Principais

1. **API Route**: `src/app/api/ai/generate-cover/route.ts`
   - Endpoint: `POST /api/ai/generate-cover`
   - Responsável por gerar a imagem usando DALL-E 3 e fazer upload para o Directus

2. **Componente UI**: `src/app/admin/eventos/novo/_components/steps/CoverImageStep.tsx`
   - Exibe o botão "Gerar imagem com IA"
   - Mostra feedback visual durante a geração

3. **Wizard Controller**: `src/app/admin/eventos/novo/_components/EventCreationWizard.tsx`
   - Contém a lógica `handleGenerateCover` que chama a API

## Fluxo de Funcionamento

### 1. Usuário Clica no Botão

No passo "Visual" do formulário, o usuário pode clicar no botão "Gerar imagem com IA".

### 2. Validação

- Verifica se o título do evento foi preenchido (obrigatório)
- Se não houver título, exibe mensagem de erro e não faz a requisição

### 3. Geração do Prompt Inteligente

A API gera automaticamente um prompt **sofisticado e contextual** baseado em:
- **Título do evento** (obrigatório)
- **Descrição curta** (`short_description`) - opcional
- **Descrição completa** (`description`) - opcional
- **Categoria do evento** - busca automaticamente do Directus quando informado

#### Sistema de Prompts Contextual

O sistema analisa a categoria e adapta o estilo automaticamente:

**Categorias Suportadas:**
- 🔧 **Tecnologia/Tech**: Gradientes azul/roxo, padrões de circuito, estética futurística
- 📚 **Workshop/Educação**: Cores quentes, elementos colaborativos, visual acessível
- 💼 **Conferência/Negócios**: Paleta navy/gold, ambiente corporativo, prestígio
- 🎵 **Música/Entretenimento**: Pink neon, roxo elétrico, energia vibrante
- ⚽ **Esportes**: Vermelho/preto, elementos dinâmicos, motivacional
- 🎨 **Arte/Cultura**: Magenta/turquoise, elementos artísticos, sofisticado
- 🍔 **Gastronomia**: Cores apetitosas, ambiente gastronômico, convidativo
- 💚 **Saúde/Wellness**: Verde/azul claro, símbolos médicos, tranquilizante

Exemplo de prompt gerado (versão resumida):
```
Create a professional, eye-catching event cover image in landscape format (1792x1024 pixels, 16:9 aspect ratio).

MAIN SUBJECT: Event titled "Workshop de React Avançado".
Short description: Aprenda hooks avançados e otimização de performance.

CATEGORY: Tecnologia.
STYLE GUIDELINES: Modern tech aesthetic with gradients of blue, purple, and cyan.
Include abstract circuit patterns, geometric shapes, or digital network visualizations.
High-tech, futuristic, professional corporate style.

--- COMPOSITION REQUIREMENTS ---
• Layout: Follow the rule of thirds, with the main focal point slightly off-center.
• Text space: Reserve the left third or top third of the image for text overlay.
• Depth: Use foreground, midground, and background elements to create visual depth.

--- VISUAL STYLE ---
• Photorealistic quality with professional photography aesthetic.
• High contrast and vibrant colors that stand out on social media feeds.
• Use dramatic lighting (rim lighting, cinematic lighting, or golden hour lighting).
• Apply depth of field (bokeh effect) to create professional separation.

--- RESTRICTIONS ---
• DO NOT include any text, letters, numbers, or typography in the image itself.
• DO NOT include recognizable faces or identifiable people.
• DO NOT include logos, brand names, or copyrighted symbols.

--- MOOD & ATMOSPHERE ---
• Overall tone: Educational, approachable, and empowering.
• Evoke emotions: Excitement, anticipation, professionalism, and trust.
```

### 4. Chamada à API da OpenAI

A API route faz uma chamada à DALL-E 3 com os seguintes parâmetros:

```typescript
{
  model: 'dall-e-3',
  prompt: prompt,
  n: 1,
  size: '1792x1024', // Próximo a 1200x630 (16:9)
  quality: 'standard',
  response_format: 'url'
}
```

### 5. Download e Upload

1. **Download**: A imagem gerada é baixada do URL retornado pela OpenAI
2. **Upload para Directus**: A imagem é enviada para o Directus na pasta "events"
3. **Retorno**: O `fileId` é retornado para o frontend

### 6. Atualização do Formulário

- O `fileId` retornado é automaticamente definido no campo `cover_image` do formulário
- A preview da imagem é exibida imediatamente
- Um toast de sucesso é mostrado ao usuário

## Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Directus tokens (já existentes)
DIRECTUS_FORM_TOKEN=your-form-token
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
```

### 2. Obter API Key da OpenAI

1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Copie a chave e adicione ao `.env`

### 3. Custos Estimados

- **DALL-E 3 Standard (1792x1024)**: ~$0.080 por imagem
- Estimativa: ~R$ 0.40 por imagem gerada (considerando câmbio)

## Tratamento de Erros

A implementação segue o padrão RFC 7807 Problem Details do projeto:

### Erros Tratados

1. **API Key não configurada** (503)
   ```json
   {
     "type": "https://api.example.com/errors/service-unavailable",
     "title": "Serviço Não Configurado",
     "detail": "A chave de API da OpenAI não está configurada...",
     "status": 503
   }
   ```

2. **Título não informado** (400)
   ```json
   {
     "type": "https://api.example.com/errors/validation-failed",
     "title": "Dados Inválidos",
     "detail": "O título do evento é obrigatório...",
     "status": 400,
     "extensions": {
       "field": "title",
       "code": "required"
     }
   }
   ```

3. **Falha no upload** (variável)
   - Erros de rede, limites excedidos, etc.
   - Mensagens traduzidas para português

### Feedback ao Usuário

- **Durante geração**: Botão mostra "Gerando..." e fica desabilitado
- **Sucesso**: Toast verde + preview da imagem
- **Erro**: Toast vermelho + mensagem de erro descritiva

## Customização do Sistema de Prompts

O sistema de geração de prompts é altamente customizável. Veja como personalizar:

### 1. Adicionar Novas Categorias

Edite o mapeamento em `getCategoryStyleGuidelines()`:

```typescript
// src/app/api/ai/generate-cover/route.ts (linha ~108)
const categoryStyles: Record<string, string> = {
  'sua-categoria': 'Seu estilo personalizado com cores específicas...',
  // ... outras categorias
};
```

### 2. Ajustar Detecção de Tom do Evento

Edite a função `getEventTone()` para reconhecer novos padrões:

```typescript
// src/app/api/ai/generate-cover/route.ts (linha ~231)
function getEventTone(title: string, description?: string): string {
  const combined = `${title} ${description || ''}`.toLowerCase();

  if (/\b(suas|palavras|chave)\b/.test(combined)) {
    return 'Seu tom personalizado';
  }
  // ...
}
```

### 3. Modificar Estrutura do Prompt

Para alterações mais profundas, edite a função `generateImagePrompt()`:

```typescript
// src/app/api/ai/generate-cover/route.ts (linha ~154)
function generateImagePrompt(data: GenerateCoverRequest, category?: CategoryData | null): string {
  const parts: string[] = [];

  // 1. Adicione suas seções customizadas
  parts.push('Sua instrução inicial...');

  // 2. Modifique composição, estilo, restrições, etc.

  return parts.join(' ');
}
```

## Melhorias Futuras

### Possíveis Adições

1. **Seleção de Estilo**
   - Permitir que o usuário escolha entre estilos predefinidos
   - Exemplo: "Corporativo", "Casual", "Tecnológico", "Artístico"

2. **Preview Antes de Aplicar**
   - Mostrar a imagem gerada antes de salvar no formulário
   - Permitir regenerar se o usuário não gostar

3. **Histórico de Gerações**
   - Salvar múltiplas versões geradas
   - Permitir escolher entre as geradas anteriormente

4. **Cache de Gerações**
   - Evitar gerar a mesma imagem múltiplas vezes
   - Usar hash do prompt como chave

5. **Variações de Imagem**
   - Usar a API de variações da OpenAI
   - Gerar 2-3 opções e deixar usuário escolher

6. **Edição de Prompt Manual**
   - Campo opcional para o usuário ajustar o prompt
   - Modo "Avançado" para usuários experientes

## Limitações Conhecidas

1. **Tamanho da Imagem**: DALL-E 3 não gera exatamente 1200x630px
   - Solução atual: Usa 1792x1024 (aspect ratio próximo)
   - Melhoria futura: Redimensionar automaticamente

2. **Tempo de Geração**: ~10-15 segundos por imagem
   - OpenAI processa a requisição
   - Sem opção de acelerar atualmente

3. **Idioma**: Prompts em inglês geram melhores resultados
   - DALL-E 3 é treinado principalmente em inglês
   - Descrições em português são incluídas, mas convertidas internamente

4. **Conteúdo Sensível**: OpenAI pode rejeitar certos prompts
   - Filtros de segurança ativos
   - Erros são tratados e mostrados ao usuário

## Debugging

### Logs Úteis

A API route registra logs úteis no console:

```typescript
console.log('Generated prompt:', prompt);  // Ver o prompt exato enviado
console.error('Directus upload error:', errorText);  // Erros de upload
```

### Testar Manualmente

Use `curl` para testar a API diretamente:

```bash
curl -X POST http://localhost:3000/api/ai/generate-cover \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Workshop de React",
    "description": "Aprenda React do zero"
  }'
```

Resposta esperada:
```json
{
  "fileId": "uuid-do-arquivo",
  "assetUrl": "http://localhost:8055/assets/uuid-do-arquivo",
  "generatedPrompt": "Create a vibrant..."
}
```

## Segurança

### Boas Práticas Implementadas

1. **Validação de Entrada**: Todos os campos são validados antes de processar
2. **Rate Limiting**: Considere adicionar limitação de taxa se necessário
3. **Autenticação**: Usa tokens do Directus para upload
4. **Error Handling**: Nunca expõe detalhes internos ao cliente

### Recomendações

1. **Monitoramento de Custos**: Configure alertas na OpenAI Platform
2. **Limites de Uso**: Implemente rate limiting por usuário/organizer
3. **Backup de Tokens**: Mantenha backup seguro das variáveis de ambiente

## Suporte

Para problemas ou dúvidas:

1. Verifique os logs do servidor Next.js
2. Confirme que a API key está configurada corretamente
3. Teste a conectividade com a OpenAI API
4. Verifique se o Directus está acessível e configurado

## Referências

- [OpenAI Image Generation API](https://platform.openai.com/docs/guides/images-vision)
- [DALL-E 3 API Reference](https://platform.openai.com/docs/api-reference/images/create)
- [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807)
