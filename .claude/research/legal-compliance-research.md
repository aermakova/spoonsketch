# Legal & App Store Compliance Research — Spoon & Sketch

**Source:** AI-generated research output (2026-04-25). Used the prompt at `.claude/prompts/legal-compliance-research.md` (see commit history for the prompt).

**Disclaimer:** AI is not a lawyer. Verify every citation before acting. Engage a qualified privacy/consumer-law attorney in each jurisdiction before launch. Use this document as a starting checklist, not as legal advice.

**How this maps to PLAN.md:**

- The actionable priority checklist (P0/P1/P2/P3) is mirrored in `PLAN.md` §"Compliance & legal — pre-launch" with the engineering surfaces tracked there.
- This file is the full research output kept verbatim for reference and citation lookups.

---

## 1. Ukrainian Law

### REQUIRED (launch blockers)

**1. Register as a data controller with the Ukrainian DPA (Ombudsman's Office) if you process sensitive data or high-risk data.**
Why: There is an obligation to notify the DPA within 30 working days of the processing of personal data that constitutes a considerable risk for rights and freedoms of data subjects, and any amendments must be notified within 10 working days. Recipe photos and user-uploaded images may qualify as high-risk data depending on their content.
Implementation hint: Fill out the Ombudsman notification form at ombudsman.gov.ua. If the new Draft Law 8153 passes into law before your launch, this notification mechanism will change — monitor it.

**2. Obtain valid, specific, prior consent for each processing purpose before collecting data.**
Why: The Law of Ukraine No. 2297-VI on Personal Data Protection (Art. 6) requires that consent be: (a) freely given, (b) specific to the purpose, (c) informed, and (d) given prior to processing. Consent should be proportional to the purposes of personal data processing; personal data should be collected only in the scope necessary for fulfillment of the designated purposes.
Implementation hint: At account creation, present a consent form that separately covers: (a) account management, (b) print order processing (including shipping address), (c) AI processing of recipe content. Use an unchecked checkbox for each. Do not bundle consent with Terms of Service acceptance.

**3. Obtain explicit consent before sending any commercial electronic messages (marketing emails, push notifications).**
Why: Under the general rule provided by the Law of Ukraine on Electronic Commerce, commercial electronic communication may be sent to a recipient only if that recipient provided consent. Aggressive spam and advertising that ignores a person's objection is considered a violation of e-commerce legislation.
Implementation hint: Use a separate opt-in checkbox for marketing communications at registration. Provide a clear unsubscribe mechanism in every marketing email. Do not auto-opt users in.

**4. Honor data subject rights: access, correction, and deletion within the timelines prescribed by law.**
Why: Owners or managers of personal data are obliged to make changes to personal data based on a reasoned written request of the data subject. The law also provides for destruction of data when the retention period expires or legal relations terminate.
Implementation hint: Build an in-app account deletion flow (also required by Apple Guideline 5.1.1(v)) and a data export/access request contact path (e.g., a privacy@yourapp.com address). Respond to requests within the statutory period.

**5. No data localization requirement — but cross-border transfers require adequate protection.**
Why: The PDP does not require personal data to be stored in Ukraine or to have a local copy. However, personal data transfer to foreign entities may be performed exclusively if the relevant state ensures an appropriate level of personal data protection. Supabase (US), Anthropic (US), OpenAI (US) all receive Ukrainian user data — ensure your DPA/privacy policy discloses this.
Implementation hint: Reference in your Privacy Policy that data is transferred to processors in the US and EU, and that adequate protection is ensured via contractual safeguards (DPAs with each vendor). Since Ukraine is an EU candidate country aligned with GDPR norms, relying on GDPR-equivalent SCCs with your vendors is the practical standard.

**6. Notify data subjects within 10 business days of any amendment, deletion, or destruction of their personal data.**
Why: The PDP Law requires that data subjects be informed about any amendment, deletion, or destruction of their personal data within ten business days. Note: Ukraine does not currently require formal breach notification to the DPA (unlike GDPR), but data subjects must be notified.
Implementation hint: Build a triggered email/notification system for account deletion confirmations and any data changes made at the regulator's or court's request.

**7. Use Ukrainian as the default or prominently available language for Ukrainian users.**
Why: While there is no strict law mandating your app UI to be in Ukrainian for a non-Ukrainian company, Ukraine's language law (Law No. 2704-VIII on Ensuring the Functioning of the Ukrainian Language as the State Language) requires that consumer-facing information — including Terms, Privacy Policy, and support — be made available in Ukrainian for services offered in Ukraine.
Implementation hint: At minimum, publish a Ukrainian-language Privacy Policy and Terms of Service before accepting Ukrainian users. Your planned Ukrainian UI translation is the right call; prioritize it for launch or block Ukrainian users until it's ready.

### NICE TO HAVE (best practice)

**1. Monitor Draft Law No. 8153** (the GDPR-harmonizing bill) — adopted as a basis by the Ukrainian Parliament in November 2024 and pending a second reading. The draft law is aimed at harmonizing Ukrainian data protection legislation with the standards enshrined by the GDPR and Convention 108+. If it passes before your launch, you'll need to appoint a local representative for non-resident data controllers and comply with GDPR-equivalent obligations.

**2. Add a Ukrainian-language support channel** (email or Telegram) for data subject requests.

---

## 2. American Law

### REQUIRED (launch blockers)

**1. Publish a Privacy Policy that satisfies CCPA/CPRA minimum disclosures before any California user can register.**
Why: California Civil Code §§ 1798.100 et seq. (CCPA, as amended by CPRA) requires businesses that collect personal information from California residents to disclose: categories of personal information collected, purposes, third parties to whom it is disclosed, and the consumer's rights (access, deletion, correction, opt-out of sale/sharing, limit use of sensitive PI). Recipe photos, names, emails, shipping addresses likely meets the CCPA threshold (100,000+ consumers/year).
Implementation hint: Include a "California Privacy Rights" section listing all PI categories (identifiers, photos, commercial info from orders, geolocation from shipping address), and a "Do Not Sell or Share My Personal Information" mechanism — even if you don't sell, state it.

**2. Honor CCPA/CPRA consumer rights requests within 45 days.**
Why: Right to know, right to delete, right to correct, right to opt-out of sale/sharing, right to limit sensitive PI use.
Implementation hint: privacy@yourapp.com + webform. 45-day response window; one 45-day extension permitted with notice.

**3. Auto-renewal disclosure that meets California's Automatic Renewal Law (ARL, Bus. & Prof. Code §§ 17600–17606) immediately before the subscribe button.**
Why: Federal FTC Click-to-Cancel Rule was struck down July 2025, but state laws (California's updated ARL via AB 2863) tightly monitor auto-renewal. Requires clear disclosure of: subscription price, renewal interval, how to cancel, that cancellation stops future charges.
Implementation hint: Immediately before the "Subscribe" button: "You will be charged [price] every [period]. Your subscription renews automatically until cancelled. Cancel anytime in Settings > Subscription." Separate affirmative consent checkbox for auto-renewal.

**4. Implement a simple in-app cancellation mechanism.**
Why: FTC continues enforcement under ROSCA + Section 5 FTC Act targeting hard-to-cancel companies. California ARL independently requires this.
Implementation hint: Settings → Subscription → "Cancel Subscription" — one tap, no hoops. Also link to Apple's subscription management page.

**5. COPPA: add an age gate at registration.**
Why: COPPA (15 U.S.C. §§ 6501–6506) prohibits collecting PII from children under 13 without verifiable parental consent.
Implementation hint: Date-of-birth field or age confirmation gate ("I am 13 or older"). Apple App Store age rating 4+ or 9+ (recipe content). Privacy Policy: "We do not knowingly collect data from children under 13."

**6. App Tracking Transparency (ATT) — determine if you need it.**
Why: Apple's ATT (Guideline 5.1.2) requires permission prompt before tracking across apps/websites owned by other parties. PostHog uses device identifiers for analytics. If first-party only, ATT not required.
Implementation hint: Review PostHog integration. If no advertising SDKs, no cross-app tracking, set `NSUserTrackingUsageDescription` but don't call `requestTrackingAuthorization`. Default safe path: implement ATT prompt.

**7. Sales tax on printed books: register for nexus states and collect tax.**
Why: South Dakota v. Wayfair (2018) — economic nexus once you exceed state thresholds (typically $100K revenue or 200 transactions). Books are taxable in most states.
Implementation hint: Stripe Tax on checkout, or TaxJar/Avalara integrated. Lulu xPress may handle some — confirm with them.

**8. Virginia (VCDPA), Connecticut (CTDPA), and other state privacy laws.**
Why: VCDPA (Va. Code §§ 59.1-575) + CTDPA (Public Act 22-15) — GDPR-lite laws with access/deletion/correction/opt-out. Apply to controllers with 100K+ residents/year or 25K+ with >50% data-sale revenue.
Implementation hint: A comprehensive Privacy Policy satisfying CCPA covers VCDPA/CTDPA. Add "State Privacy Rights" section. Use IAPP State Privacy Law tracker.

### NICE TO HAVE

**1. FTC Negative Option compliance posture** — design subscription flow as if Click-to-Cancel were in force. Match.com / Chegg / Cleo AI / Amazon enforcement establishes de facto standards.

**2. Biometric privacy** — for OpenAI image effects on user faces, check Illinois BIPA (740 ILCS 14), Texas CUBI, Washington's My Health My Data Act. Separate consent + private right of action.

---

## 3. European Law (GDPR + Related)

### REQUIRED (launch blockers)

**1. Establish a lawful basis for each category of data (GDPR Art. 6).**
- Account data: **Contract performance** (Art. 6(1)(b))
- Print order data: **Contract performance**
- PostHog analytics: **Legitimate interests** (Art. 6(1)(f)) with LIA, OR **consent**
- Sentry crash reports: **Legitimate interests**
- AI processing: **Contract** + **consent**
- Marketing emails: **Consent** (Art. 6(1)(a))

Implementation hint: Internal Records of Processing Activities (RoPA, Art. 30) documenting each.

**2. Publish full Article 13 privacy disclosures at the point of collection.**
Why: GDPR Art. 13 — your identity, DPO if applicable, purposes + legal basis per activity, recipients, retention, data subject rights, right to withdraw consent, right to lodge a complaint, statutory/contractual basis, automated decision-making.
Implementation hint: Privacy Policy must cover all of the above; link from App Store listing, registration screen, every collection form. Plain language per Art. 7(2).

**3. Implement all eight GDPR data subject rights (Arts. 15–22).**
Access, rectification, erasure, restriction, portability, objection, no-automated-decision. Respond within 30 days (extendable to 3 months).
Implementation hint:
- Access + Portability: "Download my data" export in Settings (JSON).
- Erasure: in-app account deletion + send deletion requests to Anthropic/OpenAI.
- Rectification: users edit profile/recipes (already).
- Objection to legitimate interests: email/form.
- Automated decision-making: AI is a tool, results user-reviewed → Art. 22 doesn't strictly apply, but document.

**4. ePrivacy cookie/tracker consent banner for EU users (Dir. 2002/58/EC).**
Why: PostHog cookies/localStorage, Sentry identifiers — non-essential trackers require prior informed consent. CJEU Planet49 + national DPA guidance: reject button must be as prominent as accept; no pre-ticked boxes.
Implementation hint: First-launch CMP banner. Accept analytics / Reject with equal prominence. Gate PostHog initialization on consent. Sentry as legitimate-interests (security) is documented.

**5. 72-hour breach notification to lead supervisory authority (GDPR Art. 33).**
Implementation hint: Designate a lead DPA country (Germany or Ireland). Incident response runbook + Supabase access logging + Sentry alerts.

**6. EU Representative appointment (GDPR Art. 27).**
Why: No EU establishment but processing EU residents' data → must appoint an EU representative.
Implementation hint: DataRep (datarep.com) or VeraSafe ~€500–€2,000/year. Contact details in Privacy Policy.

**7. Data transfer mechanisms (GDPR Art. 46).**
Anthropic DPA + SCCs auto-incorporated via Commercial ToS. OpenAI DPA via API account. Supabase DPA in dashboard. Stripe DPA at stripe.com/legal/dpa. PostHog DPA at posthog.com/dpa (use EU region). Sentry DPA at sentry.io/legal/dpa (EU hosting available). Lulu — request directly. RevenueCat at revenuecat.com/dpa. Railway — check; if unavailable, switch host. Telegram (UAE) — Art. 49(1)(b) contractual necessity since user initiates.

**8. Records of Processing Activities (Art. 30 RoPA).**
Internal spreadsheet/doc: activity, purpose, legal basis, data categories, data subjects, recipients, retention, international transfers, security. Update on every new feature/vendor.

**9. DSA compliance — notice-and-action (DSA Art. 16).**
Spoon & Sketch hosts user-uploaded photos + recipe text → hosting service. Micro-enterprise exemption: <10 employees AND <€2M turnover. If above: Report Content button + timely action + uploader notification.
Implementation hint: At minimum, "Report this content" button (private recipes are low-risk at launch). Single-point-of-contact for legal removal in ToS.

**10. EU Consumer Rights Directive — 14-day withdrawal right (Dir. 2011/83/EU, Art. 16).**
Art. 16(c) exempts "goods made to consumer's specifications or clearly personalized." Custom printed cookbook = personalized → exemption applies.
Implementation hint: ToS for EU users: "Your printed cookbook is a custom, personalized product made to your specifications. In accordance with Art. 16(c) of EU Directive 2011/83, the 14-day right of withdrawal does not apply to this order. Defective or incorrectly printed items will be replaced free of charge."

**11. EU Accessibility Act (EAA, Dir. 2019/882) — e-commerce services.**
Effective June 28, 2025. Service providers: comply, publish accessibility notice, ensure procedures for continuing conformity. Small business exemption: <10 employees AND <€2M turnover.
If above threshold: WCAG 2.1 Level AA (EN 301 549) + Accessibility Statement.
Implementation hint: Document micro-enterprise status if applicable. As you grow: VoiceOver/TalkBack support, 4.5:1 color contrast, text scaling, accessible labels. Publish accessibility statement.

### NICE TO HAVE

**1. DPO appointment** — only required for "large scale" systematic monitoring or special categories of data at scale (Art. 37). Not at launch. Designate a privacy contact.

**2. Transfer Impact Assessment (TIA)** for Anthropic + OpenAI. Documents surveillance risks (US FISA 702) + mitigations (SCCs, minimal data, pseudonymization).

**3. Digital Markets Act (DMA)**: Not applicable (gatekeeper threshold = 45M+ EU users).

---

## 4. Apple App Store

### REQUIRED (launch blockers)

**1. Sign in with Apple** — required because you offer third-party login (Guideline 4.8). Use `expo-apple-authentication` + Supabase Apple OAuth. Must appear as prominently as other login options.

**2. Restore Purchases button** — required for subscription (Guideline 3.1.1). On paywall AND in Settings. Use RevenueCat `restorePurchases()`.

**3. In-app account deletion** (Guideline 5.1.1(v)). Settings → Account → Delete Account → confirmation → cascade delete. Send deletion to Anthropic/OpenAI per DPA. Full deletion, not deactivation.

**4. Privacy Nutrition Labels** matching actual collection. Mismatches = rejection trigger.
- Data Used to Track You: only if IDFA — likely none
- Contact Info: email, name, physical address
- User Content: photos, recipes, drawings
- Identifiers: User ID, RevenueCat customer ID
- Usage Data: PostHog events
- Diagnostics: Sentry crash data
- Purchases: RevenueCat tier/status

**5. Privacy Policy URL on App Store listing.** Stable URL (e.g., spoonandsketch.com/privacy). Required by App Store Connect.

**6. Subscription disclosure copy near subscribe button (Guideline 3.1.2(a)).**
"[$X.XX]/[month|year], auto-renews until cancelled. Manage or cancel in iPhone Settings > Subscriptions." Not buried in footnotes, not smaller than the price.

**7. Print orders via Stripe — NOT required to use IAP (Guideline 3.1.1).**
Physical goods don't need Apple IAP. Confirm in App Review Notes that print orders are physical products shipped to user.

**8. Age rating questionnaire — fill out accurately.**
UGC = Yes (photos, recipes) → minimum 12+. Don't claim no UGC.

**9. UGC moderation requirements (Guideline 1.2).**
"Report" action + ability to block/flag. CSAM detection on photos. Even if private per-user.
Implementation hint: "Report a problem" button on recipe detail. CSAM detection on uploads (Amazon Rekognition / Google SafeSearch / Apple NeuralHash). Document moderation in App Review Notes.

**10. Push notification consent — no marketing-only without opt-in (Guideline 4.5.4).**
Request only when contextually relevant. Marketing pushes need separate opt-in.

**11. App Store Connect metadata.**
6.5" iPhone screenshots, 12.9" iPad if supported, optional preview video (15-30s on-device), description (4000 chars), keywords (100), promotional text (170, changeable), support URL, privacy URL, marketing URL.

### NICE TO HAVE

**1. Free trial disclosure**: trial duration, end behavior, kicker price near subscribe button. RevenueCat templates handle this.

**2. Subscription price increase flow**: StoreKit 2's `Product.SubscriptionInfo.RenewalInfo` to handle correctly.

**3. External payment link (US only)**: Apple permits but charges 27% within 7 days. For small apps, IAP is simpler.

---

## 5. Cross-cutting

### Vendor DPAs

| Vendor | DPA | Where |
|---|---|---|
| Supabase | Yes | Dashboard → Organization → Legal → DPA |
| Anthropic | Yes | Auto-incorporated in Commercial ToS — anthropic.com/legal/data-processing-addendum |
| OpenAI | Yes | openai.com/policies/data-processing-addendum |
| RevenueCat | Yes | revenuecat.com/dpa |
| Stripe | Yes | stripe.com/legal/dpa |
| Lulu xPress | Yes | Contact legal@lulu.com |
| PostHog | Yes | posthog.com/dpa (use EU region) |
| Sentry | Yes | sentry.io/legal/dpa (EU hosting) |
| Railway | Check | railway.app/legal — if missing, use EU region or migrate to Fly.io/Render |
| Telegram | No DPA | UAE-based; rely on Art. 49(1)(b); disclose in Privacy Policy |

### Privacy Policy + ToS content checklist

**Privacy Policy must include:**
- Controller identity + EU Representative address
- Per processing activity: purpose, legal basis, data categories, retention
- Categories of recipients (name every vendor)
- Cross-border transfer mechanisms (SCCs)
- All GDPR data subject rights + how to exercise (privacy@)
- Right to withdraw consent and how
- Right to lodge complaint (name your lead EU DPA)
- CCPA "California Privacy Rights" section
- COPPA: "We do not knowingly collect data from children under 13"
- Ukraine: cross-border transfers + consent-based approach
- Cookies/analytics + opt-out
- AI processing disclosure (Anthropic, OpenAI, no training)
- Retention periods per category
- Last updated + version

**Terms of Service must include:**
- EU 14-day withdrawal waiver for personalized printed products (Art. 16(c) Dir. 2011/83)
- Subscription auto-renewal (Apple Guideline 3.1.2(a) + California ARL)
- UGC license (process/print user recipes + photos)
- Prohibited content policy
- AI feature disclaimer
- Governing law + dispute resolution
- Support + legal contact

### Content Moderation / CSAM

**CSAM detection (all markets):**
Apple Guideline 1.2 requires "method for filtering objectionable material." For photo uploads minimum: NeuralHash / Amazon Rekognition Moderation Labels / Google Cloud Vision SafeSearch on every upload BEFORE storage. Non-negotiable.
Implementation: Edge Function on upload. Auto-delete CSAM/explicit. Log flagged. NCMEC report (18 U.S.C. § 2258A) if CSAM discovered.

**DSA notice-and-action**: Even if exempt as micro-enterprise, implement in-app "Report content" as best practice.

**Ukraine**: No specific NCMEC equivalent but illegal content covered by criminal law. Same scanning approach.

---

## Pre-TestFlight Submission Checklist (Priority Order)

### P0 — Without these, TestFlight/App Store submission will fail or app removed

1. **Sign in with Apple** alongside any other login (Guideline 4.8)
2. **In-app account deletion** — full data delete from Supabase (Guideline 5.1.1(v))
3. **Restore Purchases button** on paywall + Settings (Guideline 3.1.1)
4. **Privacy Policy** at stable URL; in App Store Connect listing + in-app Settings
5. **App Store Connect Privacy Nutrition Labels** accurate
6. **Subscription disclosure copy** adjacent to subscribe button (Guideline 3.1.2(a))
7. **Age rating questionnaire** — UGC=Yes
8. **Demo account credentials** for App Review Notes
9. **Print orders confirmed as physical goods** in App Review Notes (Stripe, not IAP)

### P1 — Legal requirements; enforcement risk if missing at launch

10. **GDPR: EU Representative** appointed + contact in Privacy Policy
11. **GDPR: Cookie/analytics consent banner** for EU users — reject-all parity
12. **GDPR: Data subject rights portal** — privacy@ + in-app export + deletion
13. **DPAs signed** with all vendors (table above)
14. **California ARL disclosure** — auto-renewal terms before subscribe button
15. **COPPA age gate** at registration
16. **CSAM photo scanning** on every upload via Rekognition / Google SafeSearch / NeuralHash
17. **Terms of Service** published — EU 14-day waiver, auto-renewal, UGC license
18. **Ukraine: Privacy Policy in Ukrainian** + separate consent checkboxes per purpose
19. **Records of Processing Activities (RoPA)** internal document

### P2 — Required before significant scale

20. **ATT prompt** decision — audit PostHog SDK
21. **Stripe Tax** for US sales tax on print orders
22. **In-app "Report content"** button (Apple 1.2 + DSA readiness)
23. **EU Accessibility Act** assessment — confirm micro-enterprise; begin WCAG 2.1 AA audit
24. **Ukrainian DPA notification** (Ombudsman) if processing high-risk data
25. **Incident response runbook** for 72-hour GDPR breach notification

### P3 — Best practice / growth-stage

26. Monitor Ukrainian Draft Law No. 8153
27. Transfer Impact Assessments (Anthropic, OpenAI)
28. State privacy law monitoring (VCDPA, CTDPA, IAPP tracker)
29. Subscription price increase flow tested in StoreKit 2 sandbox
30. Biometric privacy assessment (BIPA, CUBI) before face/photo image effects for US
