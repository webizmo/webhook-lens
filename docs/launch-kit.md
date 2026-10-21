# Webhook Lens launch kit

This file contains reusable launch copy and a verification checklist. Copy here is not evidence that a release, discussion, social post, analytics configuration, or promotion has been published. The initial promotion scope is **GitHub only**. The optional social copy at the end is for a future decision and is unposted.

## Positioning

**One line:** Inspect webhook JSON, compare structural drift, and review changes with Claude through a local MCP server.

**For:** Developers maintaining API integrations, webhook handlers, and business automations.

**The concrete problem:** A provider changes a field's type, removes a property, or adds a nested structure, and the developer needs to understand the difference between two samples.

**The useful promise:** A clone-and-run CLI, synthetic examples, and focused MCP tools for local JSON inspection, comparison, and schema validation.

Avoid claims of unique functionality, guaranteed security, guaranteed compatibility, customer adoption, star growth, or measured traffic without supporting evidence. Live capture and replay are not included in this release.

## GitHub release draft

**Title:** `v0.1.0 — Inspect webhook payloads and review structural drift with Claude`

**Body:**

Webhook Lens is a local JSON toolkit for the moment an integration's input changes.

Use the CLI to inspect field paths and types, compare two samples, validate a payload against a local Draft-07 schema, or create a best-effort redacted copy. Connect the stdio MCP server to Claude for a guided review of structural changes.

The MCP tools return structural metadata rather than raw payload values. Field names and paths can still be sensitive, and the MCP client receives those results. Choose a dedicated fixture root and review its files.

Start with the included synthetic examples:

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci
node bin/webhook-lens.js demo
```

Node.js 22+ required. There is no build step and no hosted account requirement. This release does not capture live webhooks or replay requests.

- [Quick start and CLI](https://github.com/webizmo/webhook-lens#quick-start)
- [Connect Claude](https://github.com/webizmo/webhook-lens/blob/main/docs/claude.md)
- [Türkçe rehber](https://github.com/webizmo/webhook-lens/blob/main/README.tr.md)
- [Report a bug with synthetic data](https://github.com/webizmo/webhook-lens/issues/new/choose)

Built by [Webizmo](https://webizmo.tr/api-entegrasyon?utm_source=github&utm_medium=referral&utm_campaign=webhook_lens&utm_content=release). MIT licensed. If it helps you, a star and a small reproducible bug report are both appreciated.

## GitHub discussion announcement draft

**Title:** `What webhook shape change has broken your integration?`

We're releasing Webhook Lens to help inspect the JSON samples on either side of that moment: a field disappears, a number becomes a string, or an object becomes `null`.

It includes a Node.js CLI and MCP tools for Claude. You can inspect structure, compare two payloads, and validate a local schema. The MCP server returns metadata and requires a dedicated file root; it does not provide a raw-value reader.

Try `node bin/webhook-lens.js demo` after installing the repository. Then tell us which structural changes are hardest to review in your integration work. A small **synthetic** before/after example is the most useful starting point. Please keep production data and credentials out of this thread.

Docs: https://github.com/webizmo/webhook-lens

## Organization profile featured block

Preserve the existing organization profile and add a small feature block where appropriate:

```markdown
### Open source: Webhook Lens

Inspect webhook JSON, compare structural drift, and review changes with Claude through MCP.

[Explore Webhook Lens](https://github.com/webizmo/webhook-lens) · [Türkçe rehber](https://github.com/webizmo/webhook-lens/blob/main/README.tr.md)

Built by [Webizmo](https://webizmo.tr/api-entegrasyon?utm_source=github&utm_medium=referral&utm_campaign=webhook_lens&utm_content=org_profile).
```

## Launch verification checklist

Mark items complete only after checking them. This checklist is intentionally not a publication record.

- [ ] Public repository opens without authentication.
- [ ] Fresh clone, `npm ci`, `npm test`, `npm run check`, and demo succeed on Node.js 22+.
- [ ] English and Turkish README links resolve.
- [ ] MCP stdio connection and all three tools are exercised against synthetic fixtures.
- [ ] Root escape, non-JSON file, remote reference, and sensitive-value boundaries have relevant tests.
- [ ] GitHub description, homepage link, and relevant topics match the actual functionality.
- [ ] MIT license, contribution guidance, and issue forms are visible.
- [ ] Release tag and release notes point at the verified commit.
- [ ] GitHub-only announcement and organization profile feature are published if the relevant capabilities are available.
- [ ] The Webizmo destination page opens and accurately explains the service.
- [ ] A dated baseline is recorded before interpreting later growth.

Suggested topics: `webhooks`, `mcp`, `mcp-server`, `claude`, `claude-code`, `json`, `json-schema`, `developer-tools`, `api-integration`, `nodejs`.

## Attribution and measurement

Campaign links use:

```text
utm_source=github
utm_medium=referral
utm_campaign=webhook_lens
```

The `utm_content` value identifies the placement: `readme`, `readme_tr`, `release`, or `org_profile`. These parameters make attribution possible if the destination's analytics captures them; they do not prove that tracking is configured or that a visit has occurred.

Record a dated baseline and compare subsequent periods:

| Metric | Evidence source | Interpretation |
| --- | --- | --- |
| Stars, forks, contributors | Public GitHub repository data | Interest and participation, not qualified leads. |
| Unique visitors and clones | Repository owner's GitHub traffic view, when available | Discovery and trial signals; preserve observations before the available history expires. |
| Referring sites | GitHub traffic view, when available | Which discovery sources bring repository visitors. |
| Campaign sessions on Webizmo | Verified website analytics capturing the UTM fields | Visits from the repository's distinct placements. |
| Contact or project enquiries | Verified form/CRM attribution | Business intent; count only actual enquiries. |
| Qualified opportunities and won work | CRM records with a documented attribution method | Commercial outcome; do not infer this from stars. |

No values are asserted in this kit. Establish the baseline after publication and validate the tracking path before reporting conversions.

## Optional future social copy — unposted

The initial scope is GitHub only. These drafts are prepared for possible later use and have not been sent to any social service.

### English LinkedIn

A webhook can keep delivering valid JSON and still break your integration.

A number becomes a string. A field disappears. A nested object becomes null.

We built Webhook Lens to make those changes easier to review: inspect a JSON sample, compare two payload structures, or validate a local schema. It includes a CLI and a local MCP server for Claude.

The MCP tools return structural metadata, not raw payload values. Field names can still be sensitive, so choose and review the fixture directory you expose.

Open source, MIT licensed, Node.js 22+. Try the included synthetic demo:
https://github.com/webizmo/webhook-lens

What payload change has surprised your integration recently?

### Türkçe LinkedIn

Webhook geçerli JSON göndermeye devam ederken entegrasyonunuz bozulabilir.

Bir sayı metne dönüşür. Bir alan kaybolur. İç içe bir nesne null gelir.

Webizmo olarak bu farkları daha kolay incelemek için Webhook Lens'i hazırladık. JSON yapısını inceleyebilir, iki örneği karşılaştırabilir ve yerel şemayla doğrulayabilirsiniz. CLI yanında Claude ile kullanılabilen bir MCP sunucusu da var.

MCP araçları ham değerler yerine yapısal bilgi döndürür. Alan adları yine de hassas olabilir; açtığınız örnek dizinini inceleyerek seçin.

MIT lisanslı, Node.js 22+ ile çalışıyor. Depodaki yapay örneklerle deneyebilirsiniz:
https://github.com/webizmo/webhook-lens

Sizin entegrasyonunuzu en son hangi payload değişikliği zorladı?

### English X

Webhook JSON changed? Webhook Lens inspects structure, compares field/type drift, and validates local schemas. CLI + MCP tools for Claude. MIT, Node 22+.

Try the synthetic demo: https://github.com/webizmo/webhook-lens

### Türkçe X

Webhook JSON'u değişti mi? Webhook Lens alan ve tip farklarını gösterir, yerel şemayla doğrular. CLI + Claude için MCP araçları. MIT, Node 22+.

Yapay örneklerle deneyin: https://github.com/webizmo/webhook-lens

### English dev.to draft

**Title:** Review webhook structure changes with a small CLI and Claude MCP tools

When a provider changes a webhook payload, the first question is often simple: what changed between the working sample and this one?

Webhook Lens is a Node.js 22+ toolkit for inspecting local JSON, comparing structural changes, and validating Draft-07 schemas. It runs directly from a clone, without a build step.

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci
node bin/webhook-lens.js demo
```

The included fixtures show the workflow. Run `inspect` to see paths and types, `compare` to find added, removed, and type-changed fields, and `validate` to check the contract your handler expects. Add `--fail-on-drift` to comparison when a script should fail on a structural change.

For a guided review, connect the local MCP server to Claude. It exposes three tools: `inspect_payload`, `compare_payloads`, and `validate_payload`. Its file access is restricted to a chosen root, and results describe structure rather than raw payload values.

That boundary has limits: field names can contain sensitive information, the MCP client receives the results, and unchanged types do not prove unchanged behavior. Review the fixtures you expose and use your normal integration tests for acceptance.

This first release works on files you already have. It does not capture or replay live webhooks. Feedback with a small synthetic before/after example would help us identify useful next steps.

[Read the source and try the demo](https://github.com/webizmo/webhook-lens). Built by Webizmo, released under MIT.

### Türkçe dev.to taslağı

**Başlık:** Webhook yapı değişikliklerini CLI ve Claude MCP araçlarıyla incelemek

Bir sağlayıcı webhook içeriğini değiştirdiğinde ilk sorumuz genellikle aynı: çalışan örnekle yeni örnek arasında ne değişti?

Webhook Lens; yerel JSON dosyalarının yapısını inceleyen, iki örnek arasındaki alan ve tip farklarını gösteren ve Draft-07 JSON Schema ile doğrulama yapan bir Node.js 22+ aracı. Depoyu klonlayıp `npm ci` sonrasında doğrudan çalıştırabilirsiniz.

```sh
git clone https://github.com/webizmo/webhook-lens.git
cd webhook-lens
npm ci
node bin/webhook-lens.js demo
```

`inspect` alan yollarını ve tiplerini gösterir. `compare` eklenen, kaldırılan ve tipi değişen alanları bulur. `validate` ise beklediğiniz şemayı kontrol eder. Bir betiğin yapısal değişiklikte başarısız olması gerekiyorsa karşılaştırmaya `--fail-on-drift` ekleyebilirsiniz.

Claude ile değerlendirmek için yerel MCP sunucusu üç araç sunar: `inspect_payload`, `compare_payloads` ve `validate_payload`. Dosya erişimi belirlediğiniz kök dizinle sınırlıdır; sonuçlarda ham değerler yerine yapısal bilgi bulunur.

Yine de alan adları hassas olabilir ve MCP istemcisi sonuçları alır. Tiplerin aynı kalması davranışın değişmediğini kanıtlamaz. Açtığınız örnekleri inceleyin; gerçek kabul için entegrasyon testlerinizi kullanın.

Bu ilk sürüm elinizdeki dosyalarla çalışır; canlı webhook toplama veya yeniden gönderme özelliği yoktur. Küçük, yapay bir önce/sonra örneğiyle hazırlanan geri bildirimler geliştirmeyi yönlendirebilir.

[Kaynak kodu ve örnekler](https://github.com/webizmo/webhook-lens). Webizmo tarafından MIT lisansıyla yayımlandı.
