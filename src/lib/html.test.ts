import { describe, it, expect } from 'vitest'
import { buildRichTextHtml, stripHtml } from './html'

describe('buildRichTextHtml', () => {
  it('remove placeholders de vídeo sem deixar lixo', () => {
    const html = buildRichTextHtml('Antes ![video-tag-abc123] depois [video-tag-def] fim')

    expect(html).not.toMatch(/video-tag/i)
    expect(html).not.toMatch(/!\[/)
    expect(html).not.toContain('!')
    expect(html).toContain('Antes')
    expect(html).toContain('depois')
    expect(html).toContain('fim')
  })

  it('remove tags de embed cruas', () => {
    const html = buildRichTextHtml('Texto <iframe src="https://youtu.be/x"></iframe> final')

    expect(html).not.toMatch(/iframe/i)
    expect(html).toContain('Texto')
    expect(html).toContain('final')
  })

  it('converte tabela Markdown em tabela HTML', () => {
    const html = buildRichTextHtml('| Critério | Valor |\n| --- | --- |\n| PA | 120/80 |')

    expect(html).toContain('<table>')
    expect(html).toContain('<th>Critério</th>')
    expect(html).toContain('<td>120/80</td>')
  })

  it('desescapa HTML que veio com entidades', () => {
    const html = buildRichTextHtml('&lt;p&gt;Olá &lt;strong&gt;mundo&lt;/strong&gt;&lt;/p&gt;')

    expect(html).toContain('<p>Olá <strong>mundo</strong></p>')
    expect(html).not.toContain('&lt;')
  })

  it('mantém imagens reais e remove thumbnails de vídeo', () => {
    const html = buildRichTextHtml(
      '![fluxo](https://exemplo.test/fluxo.png) ![video](https://youtu.be/abc)'
    )

    expect(html).toContain('<img src="https://exemplo.test/fluxo.png" alt="fluxo" />')
    expect(html).not.toContain('youtu.be')
  })

  it('separa parágrafos de referência', () => {
    const html = buildRichTextHtml(
      'Discussão do caso.\n\nReferências: Silva, 2020.\n\n[1] Outra referência.'
    )

    expect(html).toContain('<p class="ref-line">Referências: Silva, 2020.</p>')
    expect(html).toContain('<p class="ref-line">[1] Outra referência.</p>')
  })

  it('retorna vazio para entrada nula', () => {
    expect(buildRichTextHtml(null)).toBe('')
    expect(buildRichTextHtml('   ')).toBe('')
  })
})

describe('stripHtml', () => {
  it('remove tags e entidades básicas', () => {
    expect(stripHtml('&lt;p&gt;Olá&lt;/p&gt;')).toBe('Olá')
    expect(stripHtml('<strong>Texto</strong> &amp; mais')).toBe('Texto & mais')
  })
})
