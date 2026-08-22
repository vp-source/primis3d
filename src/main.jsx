import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import livingRoomReconstruction from '../websitepictures/living room.png'
import officeReconstruction from '../websitepictures/office.png'
import warehouseReconstruction from '../websitepictures/warehouse.png'

const CONTACT_EMAIL = 'info@primis3d.com'
const FORM_API_URL = (import.meta.env.VITE_FORM_API_URL || 'https://primis-forms.primis3d-atlas-api.workers.dev').replace(/\/$/, '')
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAETuH7GYM34LZwWL'
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

async function submitForm(path, payload) {
  if (!FORM_API_URL) throw new Error('forms_unavailable')
  const response = await fetch(`${FORM_API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.error || 'submission_failed')
  return result
}

let turnstileLoader
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileLoader) return turnstileLoader
  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => reject(new Error('verification_unavailable'))
    document.head.appendChild(script)
  })
  return turnstileLoader
}

function Turnstile({ theme = 'light', onToken, onError, cycle = 0 }) {
  const containerId = `turnstile-${React.useId().replace(/:/g, '')}`

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined
    let widgetId
    let active = true
    loadTurnstile().then((turnstile) => {
      if (!active || !turnstile) return
      widgetId = turnstile.render(`#${containerId}`, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        callback: (token) => { onError?.(false); onToken(token) },
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); onError?.(true) },
        'timeout-callback': () => { onToken(''); onError?.(true) },
        'unsupported-callback': () => { onToken(''); onError?.(true) },
      })
    }).catch(() => { onToken(''); onError?.(true) })
    return () => {
      active = false
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [containerId, cycle, onError, onToken, theme])

  if (!TURNSTILE_SITE_KEY) return null
  return <div className="turnstile-wrap" id={containerId} />
}

const Arrow = ({ down = false }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    {down ? <path d="M10 4v11m0 0 4-4m-4 4-4-4" /> : <path d="M5 15 15 5m0 0H8m7 0v7" />}
  </svg>
)

const LogoMark = () => {
  const maskId = `primis-logo-mask-${React.useId().replace(/:/g, '')}`
  return (
    <svg className="logo-mark" viewBox="0 0 1280 1280" aria-hidden="true">
      <defs>
        <mask id={maskId} maskType="luminance">
          <image href="/assets/primis-logo-exact.png" width="1280" height="1280" />
        </mask>
      </defs>
      <rect width="1280" height="1280" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  )
}

function Header() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const lightHeader = path.startsWith('/research/') || [
    '/contact',
    '/privacy',
    '/datenschutz',
    '/datenschutz.html',
    '/impressum',
    '/impressum.html',
  ].includes(path)

  return (
    <header className={`site-header${lightHeader ? ' site-header-light' : ''}`}>
      <a className="brand" href="/" aria-label="Primis home">
        <LogoMark />
        <span>Primis</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/worlds">Worlds</a>
        <a href="/about">About</a>
        <a className="nav-cta" href="/studio">Try Atlas <Arrow /></a>
      </nav>
    </header>
  )
}

function WorldPlaceholder() {
  return (
    <div className="world-wrap">
      <div className="world-glow" />
      <svg className="hero-filter-def" aria-hidden="true">
        <filter id="spatial-field-alpha" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .333 .333 .333 0 0" />
          <feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent=".85" offset="0" /></feComponentTransfer>
        </filter>
      </svg>
      <img className="hero-world-image" src="/assets/atlas-digital-twin-workshop.png" alt="A workshop scene transitioning from textured reality into structured geometric reconstruction" />
    </div>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-content">
        <div className="hero-copy">
          <h1><span>From one photo</span><br /><em>to a 3D world.</em></h1>
          <h2>Editable. Measurable. Ready to simulate.</h2>
          <p>Atlas is being built to turn a single photograph into an editable 3D scene, with estimated scale, object structure, and outputs for robotics, simulation, and 3D workflows.</p>
        </div>
        <WorldPlaceholder />
      </div>
    </section>
  )
}

function LiveDemoPreview() {
  const reduceMotion = prefersReducedMotion()

  return (
    <section className="home-live-demo" id="live-demo">
      <div className="home-live-demo-heading">
        <h2>See a photo<br />become a world.</h2>
        <p>This development capture shows the current Atlas Studio workflow rebuilding a single image as structured 3D geometry, object labels, and an editable scene. Outputs remain under development and vary with the source image.</p>
      </div>
      <figure className="home-live-demo-frame">
        <video
          className="home-demo-video"
          autoPlay={!reduceMotion}
          muted
          playsInline
          controls
          preload="metadata"
          aria-label="Atlas Studio development reconstruction demonstration"
        >
          <source src="/assets/primis-demo.webm" type="video/webm" />
        </video>
        <figcaption className="sr-only">A development capture of Atlas Studio reconstructing a photograph into a structured 3D scene.</figcaption>
      </figure>
    </section>
  )
}

function Vision() {
  return (
    <section className="vision" id="about">
      <div className="vision-grid">
        <div className="visual-card" id="demo">
          <img className="section-art" src="/assets/primis-world-model-v4.png" alt="A minimal office represented as a structured spatial world model" />
        </div>
        <article className="statement-card" id="research-simulation">
          <div className="statement-copy">
            <h3>The foundation everything<br /><em>else is built on.</em></h3>
            <p>Spatial intelligence and simulation are only as capable as the worlds they run in.</p>
            <p>We are building that foundation: autonomous, labeled world generation designed to turn raw capture into metric, simulation-ready scenes with objects named, placed, and editable.</p>
          </div>
          <div className="statement-bottom">
            <a className="button button-coral" href="/worlds">Explore worlds <Arrow /></a>
          </div>
        </article>
      </div>
    </section>
  )
}

const researchArticles = [
  {
    slug: 'spatial-intelligence', number: '01', category: 'SPATIAL INTELLIGENCE', title: 'Teaching machines to understand physical space',
    deck: 'How Primis investigates world models that preserve scale, objects, relationships, visibility, and possible action.',
    hero: { type: 'image', src: '/assets/primis-world-model-v4.png', fit: 'contain' }, indexImage: '/assets/primis-world-model-v4.png',
    overview: [
      'A useful spatial model must describe more than appearance. It needs to represent where surfaces begin and end, how large objects are, what contains what, which regions are visible, and where an agent can move.',
      'Primis treats reconstruction as the first layer of spatial intelligence. Atlas is being designed to convert visual capture into an editable environment whose geometry, semantics, and relationships can be inspected by people and reasoned over by machines.'
    ],
    sections: [
      { title: 'From pixels to a world model', paragraphs: ['An image records projected light. A world model must recover structure: metric geometry, object boundaries, support relationships, free space, occlusion, and scene-level organization. Atlas is designed to keep those elements connected rather than producing an isolated visual asset.'] },
      { title: 'Representing relationships', paragraphs: ['Objects become more useful when their relationships are explicit. A table supports a tool. A cabinet contains a component. A doorway connects two traversable regions. These relations allow a model to answer spatial questions and predict how a change in one part of the scene affects another.'], points: ['Metric distance and relative scale', 'Containment, support, and adjacency', 'Visibility and occlusion', 'Traversability and reachable space'] },
      { title: 'Toward spatial reasoning', paragraphs: ['The research direction is to make reconstructed worlds usable as persistent reasoning environments. A system should be able to locate an object, compare alternatives, plan a route, test an action, and update its understanding when the scene changes.'] }
    ],
    secondary: { type: 'video', src: '/assets/cap-reconstruct.mp4', caption: 'A visual input becoming structured geometry and scene elements.' },
    quote: 'The goal is not to make a 3D picture. It is to construct a world a machine can understand and use.'
  },
  {
    slug: 'robot-generalization', number: '02', category: 'ROBOT LEARNING', title: 'Generalizing robot behavior across every scene',
    deck: 'Digital twins can let robots practice one capability across many layouts, objects, viewpoints, and operating conditions instead of memorizing one setup.',
    hero: { type: 'video', src: '/assets/cap-simulate.mp4' }, indexImage: '/assets/cap-simulate.jpg',
    overview: [
      'Robots are often trained and validated in a narrow environment. A policy that succeeds in one carefully arranged room may fail when the same objects move, the path changes, or the camera sees the task from another angle.',
      'Primis explores a different foundation: reconstruct a real scene, preserve its physical structure, and generate controlled variations in which a robot can repeatedly perceive, plan, move, and interact.'
    ],
    sections: [
      { title: 'Breaking the fixed-scene barrier', paragraphs: ['Generalization requires experience across meaningful variation. The task should stay recognizable while distances, object placement, visibility, clutter, and routes change. The goal for structured Atlas worlds is to make those factors editable instead of forcing researchers to rebuild each environment by hand.'] },
      { title: 'One capability, many worlds', paragraphs: ['A manipulation or navigation policy can be tested against multiple reconstructions of offices, workshops, homes, and industrial spaces. Failures can be traced back to geometry, perception, or planning rather than being hidden inside an opaque video dataset.'], points: ['Manipulation across changing object arrangements', 'Locomotion across unfamiliar floor plans', 'Perception under occlusion and viewpoint shifts', 'Planning with altered obstacles and reachable regions'] },
      { title: 'From rehearsal to transfer', paragraphs: ['The long-term aim is to let robots reason and generalize inside digital twins before acting in the physical world. Instead of learning one motion for one scene, a robot learns the spatial conditions under which an action remains valid.'] }
    ],
    secondary: { type: 'image', src: '/assets/robotics-g1b.jpg', caption: 'A simulated robot evaluated inside a structured workshop scene.' },
    quote: 'A robot should learn why an action works—not only where it worked once.'
  },
  {
    slug: 'simulation-digital-twins', number: '03', category: 'SIMULATION', title: 'Turning captured places into simulation systems',
    deck: 'Metric reconstruction can turn an existing room, facility, or site into a repeatable environment for planning, testing, and operational study.',
    hero: { type: 'image', src: '/assets/research-locomotion.jpg' }, indexImage: '/assets/research-locomotion.jpg',
    overview: [
      'Simulation becomes more valuable when it corresponds to a place that actually exists. A reconstructed digital twin preserves the constraints that matter: dimensions, obstacles, lines of sight, access routes, and the placement of equipment.',
      'Atlas is intended to reduce the manual work between visual capture and a scene that can be edited, instrumented, and loaded into a simulation pipeline.'
    ],
    sections: [
      { title: 'A measurable environment', paragraphs: ['Real-world scale allows a simulator to reason about clearance, reach, collision, travel time, and sensor coverage. Objects remain separate so that researchers can remove, replace, reposition, or instrument them.'] },
      { title: 'Repeatable operational questions', paragraphs: ['The same scene can support many experiments without changing the physical site. Teams can compare layouts, rehearse routes, study failure conditions, and evaluate proposed interventions under controlled conditions.'], points: ['Robot and vehicle navigation', 'Industrial process planning', 'Safety and accessibility studies', 'Sensor and camera placement'] },
      { title: 'A living digital twin', paragraphs: ['A useful twin should evolve with the physical environment. Future work includes aligning repeated captures, tracking structural changes, and preserving the relationship between reconstructed geometry and operational data.'] }
    ],
    secondary: { type: 'video', src: '/assets/cap-simulate.mp4', caption: 'A reconstructed environment prepared as a repeatable simulation space.' },
    quote: 'The physical site becomes a testable system rather than a static scan.'
  },
  {
    slug: 'designed-worlds', number: '04', category: 'GAMES & ARCHITECTURE', title: 'Using reconstruction as a design substrate',
    deck: 'A captured place can become the measurable starting point for game environments, architectural studies, virtual production, and spatial composition.',
    hero: { type: 'image', src: '/assets/games-desert.jpg' }, indexImage: '/assets/games-desert.jpg',
    overview: [
      'Design work often begins by recreating context that already exists. Reference photographs, site visits, and measured drawings are translated into an initial model before creative work can begin.',
      'Atlas aims to compress that setup step by producing editable geometry, scale, and scene organization directly from visual capture.'
    ],
    sections: [
      { title: 'A world ready to change', paragraphs: ['Reconstruction should not be the final artifact. It should be a spatial substrate that designers can block out, extend, relight, recompose, and populate while retaining a coherent relationship to the source environment.'] },
      { title: 'Across creative disciplines', paragraphs: ['The same structured scene can support different outputs depending on the downstream tool and level of fidelity required.'], points: ['Level blocking and environment composition', 'Architectural documentation and layout studies', 'Previsualization and digital set construction', 'Camera planning and scene extension'] },
      { title: 'Keeping context intact', paragraphs: ['Metric scale and object separation make a reconstruction more useful than a flattened visual reference. Designers can preserve the parts that matter, replace the parts that do not, and trace decisions back to the captured site.'] }
    ],
    secondary: { type: 'video', src: '/assets/cap-reconstruct.mp4', caption: 'A captured reference entering an editable 3D production workflow.' },
    quote: 'Reconstruction is most powerful when it becomes the beginning of design, not the end.'
  },
  {
    slug: 'spatial-datasets', number: '05', category: 'SPATIAL AI DATA', title: 'Generating structured data from reconstructed worlds',
    deck: 'One aligned environment can produce geometry, depth, segmentation, trajectories, relationships, and controlled variations for training and evaluation.',
    hero: { type: 'video', src: '/assets/cap-synthetic.mp4' }, indexImage: '/assets/cap-synthetic.jpg',
    overview: [
      'Spatial AI requires data that remains consistent across representations. An RGB frame, depth map, segmentation mask, camera pose, object graph, and 3D surface are most useful when they describe the same underlying world.',
      'Atlas worlds are intended to provide a shared scene from which those channels can be rendered, modified, and evaluated together.'
    ],
    sections: [
      { title: 'Aligned by construction', paragraphs: ['Because outputs originate from one scene model, geometry and labels remain spatially registered. This supports evaluation across perception, reconstruction, scene understanding, and action planning tasks.'] },
      { title: 'Controlled variation', paragraphs: ['Objects, lighting, viewpoints, layouts, and trajectories can change while the experiment preserves explicit control over what changed and what remained constant.'], points: ['RGB, depth, normals, and segmentation', 'Camera poses and movement trajectories', 'Object labels and relationship graphs', 'Scene and layout variations'] },
      { title: 'Data with a purpose', paragraphs: ['The objective is not unlimited synthetic imagery. It is targeted spatial evidence: datasets organized around the conditions a system needs to perceive, reason about, or act within.'] }
    ],
    secondary: { type: 'image', src: '/assets/research-spatial-data.jpg', caption: 'Structured scene channels generated from one spatial environment.' },
    quote: 'A world model can become a dataset without losing the relationships that make the data meaningful.'
  }
]

function InnerPageHero({ label, title, accent, copy }) {
  return (
    <section className="inner-hero">
      <div className="inner-hero-kicker">{label}</div>
      <div className="inner-hero-layout">
        <h1>{title}<br /><em>{accent}</em></h1>
        <div className="inner-hero-copy">
          <span className="mini-rule" />
          <p>{copy}</p>
        </div>
      </div>
    </section>
  )
}

function AboutPage() {
  return (
    <main className="inner-page">
      <Header />
      <InnerPageHero
        label="ABOUT PRIMIS"
        title="We turn images into"
        accent="working 3D worlds."
        copy="Primis is the company behind Atlas: software that reconstructs a photograph as a measurable, editable 3D environment for machines and people to use."
      />

      <section className="about-mission">
        <div className="about-visual">
          <img className="section-art" src="/assets/primis-foundation.jpg" alt="Illustrated workshop transforming into spatial structure" />
        </div>
        <article className="about-copy-card">
          <span className="card-index">THE MISSION</span>
          <h2>Spatial intelligence<br />that carries into<br /><em>the real world.</em></h2>
          <p>Most robots learn a narrow behavior in a fixed setup. Primis is building editable digital twins where robots can reason about objects, geometry, affordances, and consequences; practice actions across many variations; and transfer what they learn to unfamiliar spaces. The goal is to move robotics beyond task-by-task programming toward machines that can generalize.</p>
        </article>
      </section>

      <section className="founder-section">
        <div className="founder-heading">
          <span className="section-index">FOUNDER</span>
          <h2>Built by a maker,<br />for people who build.</h2>
        </div>
        <div className="founder-grid">
          <div className="founder-monogram founder-portrait"><img src="/assets/founder.jpg" alt="Vladislav Praznik with a robotics project" /><small>GERMANY / 2026</small></div>
          <div className="founder-story">
            <h3>Vladislav Praznik</h3>
            <p>Primis is built by a robotics builder and multimodal AI researcher from Germany. The company grew from work close to search-and-rescue robotics, industrial technology and the people who need spatial systems to work outside the lab.</p>
            <p>The conviction is simple: while everyone races to build intelligence on top, the foundational layer that lets machines understand and act in the physical world is still missing.</p>
            <a className="button button-ghost" href={`mailto:${CONTACT_EMAIL}`}>Talk to Primis <Arrow /></a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

function ResearchPage() {
  return (
    <main className="inner-page research-index-page">
      <Header />
      <section className="research-index-hero">
        <div className="research-index-title">
          <span>RESEARCH &amp; SIMULATION</span>
          <h1>Ideas for machines<br /><em>that understand space.</em></h1>
        </div>
        <p>Primis research explores the systems built on reconstructed worlds: spatial reasoning, robot learning, simulation, game and architecture workflows, and structured AI data.</p>
      </section>
      <section className="research-publications" aria-label="Primis research directions">
        {researchArticles.map(article => (
          <a className="research-publication" href={`/research/${article.slug}`} key={article.slug}>
            <div className="research-publication-media"><img src={article.indexImage} alt="" loading="lazy" /></div>
            <div className="research-publication-meta"><span>{article.number}</span><span>{article.category}</span></div>
            <h2>{article.title}</h2>
            <p>{article.deck}</p>
            <span className="research-publication-link">Read direction <Arrow /></span>
          </a>
        ))}
      </section>
      <SiteFooter />
    </main>
  )
}

function ResearchMedia({ media, className = '' }) {
  if (!media) return null
  const reduceMotion = prefersReducedMotion()
  return (
    <figure className={`research-story-media ${media.fit === 'contain' ? 'media-contain' : ''} ${className}`}>
      {media.type === 'video'
        ? <video autoPlay={!reduceMotion} muted loop playsInline controls preload="metadata" aria-label={media.caption || 'Primis research development media'}><source src={media.src} type="video/mp4" /></video>
        : <img src={media.src} alt="" />}
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  )
}

function ResearchArticlePage({ article }) {
  const related = researchArticles.filter(item => item.slug !== article.slug).slice(0, 3)

  useEffect(() => {
    document.title = `${article.title} · Primis`
    return () => { document.title = 'Primis' }
  }, [article.title])

  return (
    <main className="inner-page research-story-page">
      <Header />
      <article className="research-story">
        <ResearchMedia media={article.hero} className="research-story-hero-media" />
        <header className="research-story-heading">
          <div><span>PRIMIS RESEARCH DIRECTION / 2026</span><span>{article.category}</span></div>
          <p>{article.deck}</p>
          <h1>{article.title}</h1>
        </header>

        <div className="research-story-body">
          <section>
            <h2>Overview</h2>
            {article.overview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>

          {article.sections.map((section, index) => (
            <React.Fragment key={section.title}>
              {index === 1 && <ResearchMedia media={article.secondary} className="research-story-inline-media" />}
              <section>
                <h2>{section.title}</h2>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.points && <ul>{section.points.map(point => <li key={point}>{point}</li>)}</ul>}
              </section>
            </React.Fragment>
          ))}

          <blockquote>{article.quote}</blockquote>
        </div>

        <section className="research-related" aria-labelledby="related-research-title">
          <h2 id="related-research-title">Continue reading.</h2>
          <div>
            {related.map(item => <a href={`/research/${item.slug}`} key={item.slug}><img src={item.indexImage} alt="" loading="lazy" /><span>{item.category}</span><h3>{item.title}</h3></a>)}
          </div>
        </section>
      </article>
      <SiteFooter />
    </main>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="footer-world-panel">
        <div className="footer-heading">
          <h2>Bring your world<br /><em>into Atlas.</em></h2>
          <a className="button footer-cta" href="/studio">Try Atlas Studio <Arrow /></a>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="/worlds">Worlds</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/studio">Try Atlas</a>
        </nav>
          <img className="footer-landscape-image" src="/assets/primis-footer-world-v3.jpg" alt="" aria-hidden="true" />
      </div>
      <div className="footer-bottom">
        <a className="brand" href="/"><LogoMark /><span>Primis</span></a>
        <p>© 2026 PRIMIS INTELLIGENCE<br />BUILDING THE FOUNDATION FOR SPATIAL INTELLIGENCE.</p>
        <div><a href={`mailto:${CONTACT_EMAIL}`}>EMAIL</a><a href="/impressum">IMPRINT</a><a href="/privacy">PRIVACY</a><a href="/THIRD_PARTY_NOTICES.txt">LICENSES</a></div>
      </div>
    </footer>
  )
}

function AtlasOverview() {
  const researchStories = [
    { image: '/assets/games-desert.jpg', area: 'GAME ENVIRONMENT DESIGN', title: 'Build an editable world from a visual reference', text: 'Use reconstructed geometry as a starting point for level composition, asset placement, and world design.' },
    { image: '/assets/cap-simulate.jpg', area: 'ROBOTICS & SIMULATION', title: 'Test physical tasks before touching hardware', text: 'Robots can rehearse navigation and manipulation inside a reconstruction of the real environment.' },
    { image: '/assets/cap-synthetic.jpg', area: 'SYNTHETIC DATA', title: 'Turn one environment into controlled variations', text: 'Generate aligned layouts and labeled scenes for spatial model training and evaluation.' }
  ]
  return (
    <section className="primis-overview" id="primis">
      <div className="overview-intro">
        <span className="section-index">ATLAS</span>
        <h2>One image.<br />Many working worlds.</h2>
        <p>Atlas is being designed to produce editable geometry, estimated real-world scale, labeled objects, and scenes for simulation or standard 3D workflows.</p>
      </div>
      <div className="overview-cards">
        {researchStories.map(story => (
          <article className="research-story overview-story-static" key={story.title}>
            <div className="research-story-copy"><span>{story.area}</span><h3>{story.title}</h3><p>{story.text}</p></div>
            <img src={story.image} alt="" />
          </article>
        ))}
      </div>
    </section>
  )
}

function WaitlistPage() {
  return (
    <main className="waitlist-page pilot-only-page">
      <Header />
      <section className="pilot-only-hero" aria-labelledby="pilot-title">
        <span>ATLAS / PILOT PROGRAM</span>
        <h1 id="pilot-title">Atlas is open<br /><em>for pilots.</em></h1>
        <p>Atlas is currently available through selected pilot projects. If your team is working in robotics, simulation, spatial AI, architecture, or 3D production, tell us what you want to reconstruct and what the resulting world needs to do.</p>
        <div className="pilot-only-actions">
          <a className="button pilot-request-button" href="/contact">Request a pilot <Arrow /></a>
          <a className="pilot-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </section>
      <footer className="waitlist-legal-footer">
        <span>© 2026 Primis</span>
        <nav aria-label="Legal navigation"><a href="/impressum">Impressum</a><a href="/privacy">Datenschutz</a><a href="/THIRD_PARTY_NOTICES.txt">Licenses</a><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></nav>
      </footer>
    </main>
  )
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', useCase: '' })
  const [turnstileToken, setTurnstileToken] = useState('')
  const [verificationError, setVerificationError] = useState(false)
  const [turnstileCycle, setTurnstileCycle] = useState(0)
  const [status, setStatus] = useState('idle')
  const updateField = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submitContact = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    const data = new FormData(event.currentTarget)
    try {
      await submitForm('/api/contact', {
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        message: form.useCase.trim(),
        website: data.get('website') || '',
        turnstileToken,
      })
      setForm({ name: '', company: '', email: '', useCase: '' })
      setStatus('sent')
    } catch (error) {
      setStatus(error.message === 'rate_limited' ? 'rate_limited' : 'error')
    } finally {
      setTurnstileToken('')
      setTurnstileCycle(current => current + 1)
    }
  }

  return (
    <main className="inner-page contact-page">
      <Header />
      <section className="contact-form-section">
        <form className="contact-form" onSubmit={submitContact}>
          <div className="contact-form-heading"><h2>Start a conversation.</h2></div>
          <div className="contact-fields">
            <div><label><span className="field-label">Name <small>optional</small></span><input name="name" autoComplete="name" maxLength="100" value={form.name} onChange={updateField} placeholder="Your name" /></label><label><span className="field-label">Company <small>optional</small></span><input name="company" autoComplete="organization" maxLength="120" value={form.company} onChange={updateField} placeholder="Company" /></label></div>
            <label>Reply email<input name="email" type="email" autoComplete="email" maxLength="254" value={form.email} onChange={updateField} placeholder="you@company.com" required /></label>
            <label>How can Atlas help?<textarea name="useCase" minLength="2" maxLength="1600" value={form.useCase} onChange={updateField} placeholder="Tell us about your scene, workflow, or research goal" rows="5" required /></label>
            <input className="form-honeypot" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            <Turnstile onToken={setTurnstileToken} onError={setVerificationError} cycle={turnstileCycle} />
            <p className="form-privacy-note form-privacy-note-light">Primis uses your details only to deliver and answer this enquiry. <a href="/privacy">Privacy details</a>.</p>
            {verificationError && <p className="mail-draft-status mail-draft-status-light form-error" role="alert">Browser verification was blocked. Allow challenges.cloudflare.com or email us directly.</p>}
            <button type="submit" disabled={status === 'submitting' || !turnstileToken}>{status === 'submitting' ? 'Sending…' : 'Send enquiry'} <Arrow /></button>
            {status === 'sent' && <p className="mail-draft-status mail-draft-status-light" role="status">Your enquiry was delivered to Primis.</p>}
            {status === 'error' && <p className="mail-draft-status mail-draft-status-light form-error" role="alert">The enquiry could not be delivered. Please try again or email us directly.</p>}
            {status === 'rate_limited' && <p className="mail-draft-status mail-draft-status-light form-error" role="alert">Please wait before sending another enquiry.</p>}
          </div>
        </form>
        <div className="contact-direct"><span>OR EMAIL US DIRECTLY</span><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
      </section>
      <SiteFooter />
    </main>
  )
}

function LegalPage({ type }) {
  const isPrivacy = type === 'privacy'

  useEffect(() => {
    document.title = `${isPrivacy ? 'Privacy Policy' : 'Impressum'} · Primis`
    return () => { document.title = 'Primis' }
  }, [isPrivacy])

  return (
    <main className="inner-page legal-page">
      <Header />
      <article className="legal-document">
        <a className="legal-back" href="/">← Back to Primis</a>
        {isPrivacy ? (
          <>
            <h1>Privacy Policy</h1>
            <p className="legal-subtitle">Datenschutzerklärung — last updated 19 August 2026</p>

            <h2>1. Controller</h2>
            <p>The controller responsible for data processing on this website (Art. 4(7) GDPR) is:</p>
            <address>
              Primis Intelligence UG (haftungsbeschränkt)<br />
              Am Karnweg 53<br />
              63322 Rödermark, Germany<br />
              Represented by the managing director: Vladislav Praznik<br />
              Phone: <a href="tel:+4917647152968">+49 176 47152968</a><br />
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </address>

            <h2>2. Hosting &amp; server logs</h2>
            <p>This site is hosted with IONOS Deploy Now by IONOS SE, Elgendorfer Straße 57, 56410 Montabaur, Germany. When the site is requested, the hosting infrastructure processes the IP address, access time, requested resource, referrer, browser and version, operating system, and device information so that it can deliver the site and detect technical or security problems.</p>
            <p>IONOS states that IP addresses used for its visitor statistics are anonymised immediately and that raw log data may be available for up to eight weeks. The legal basis is Art. 6(1)(f) GDPR; our legitimate interests are the secure, reliable, and abuse-resistant operation of this website. IONOS acts as our processor under Art. 28 GDPR.</p>

            <h2>3. Cookies, analytics &amp; tracking</h2>
            <p>This website sets no analytics or advertising cookies and uses no analytics pixels or third-party tag managers. Forms are protected against automated abuse with Cloudflare Turnstile. When a protected form is displayed or used, Cloudflare processes technical connection and device information to determine whether the request is legitimate. We use this strictly for website and form security on the basis of Art. 6(1)(f) GDPR; our legitimate interest is preventing spam and abuse. It is not used by Primis for advertising or visitor profiling.</p>

            <h2>4. Fonts &amp; media</h2>
            <p>Fonts, images, and videos are served from our own hosting. Loading a normal page does not request fonts or embedded media from Google, YouTube, or another third-party platform.</p>

            <h2>5. Previous Atlas launch notifications</h2>
            <p>The public launch-notification form is closed and Primis does not accept new waitlist registrations. If you previously requested the Atlas launch notification, we process your email address solely to send <strong>one email</strong> when Atlas first becomes publicly available. Unconfirmed legacy requests are deleted after seven days. We do not reuse the address for recurring product marketing.</p>
            <p>The legal basis is your consent under Art. 6(1)(a) GDPR. You may withdraw at any time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We delete a confirmed address after sending the one-time notice or after withdrawal. If Atlas has not launched within 24 months of confirmation, we delete it unless you renew your request. Limited retention may continue where necessary to establish or defend legal claims.</p>

            <h2>6. Contact and pilot enquiries</h2>
            <p>If you use the contact form, we process your reply address, message, and any optional name or company information solely to deliver and answer the enquiry, discuss a pilot, or take steps requested before a contract. The website form service transmits the enquiry as an email to Primis and does not store its content in the launch-notification database.</p>
            <p>The legal basis is Art. 6(1)(b) GDPR where your enquiry concerns pre-contractual or contractual steps, and otherwise Art. 6(1)(f) GDPR. Our legitimate interest is responding to relevant business and research enquiries. We normally delete enquiry data within six months after the final response unless a contract, statutory retention duty, or legal claim requires longer retention.</p>

            <h2>7. Recipients and international transfers</h2>
            <p>Website hosting, the Primis mailbox, and transactional email delivery are provided by IONOS SE. Form requests are processed by Cloudflare, Inc. through Cloudflare Workers and Turnstile; previously confirmed launch-notification addresses are stored in a Cloudflare D1 database restricted to the European Union. These providers act as processors for the stated purposes.</p>
            <p>Cloudflare operates a global network and some technical processing may occur outside the European Economic Area. Where a transfer to a country without an adequacy decision occurs, it is covered by the provider's data processing terms and applicable safeguards, including standard contractual clauses. We do not sell form data or stored launch-notification data.</p>

            <h2>8. Required information and automated decisions</h2>
            <p>Providing information is voluntary. Without a reply address we cannot answer a pilot or contact enquiry; optional fields may be left blank. We do not use this website data for automated decision-making or profiling.</p>

            <h2>9. Your rights</h2>
            <p>Under the GDPR you have the right to:</p>
            <ul>
              <li>access your personal data (Art. 15)</li>
              <li>rectification (Art. 16) and erasure (Art. 17)</li>
              <li>restriction of processing (Art. 18)</li>
              <li>data portability (Art. 20)</li>
              <li>object to processing based on legitimate interest (Art. 21)</li>
              <li>withdraw consent at any time, with effect for the future (Art. 7(3))</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

            <h2>10. Right to object</h2>
            <p><strong>If we process your data on the basis of legitimate interests, you may object at any time for reasons arising from your particular situation (Art. 21 GDPR). If data were ever processed for direct marketing, you could object to that processing at any time without giving reasons.</strong></p>

            <h2>11. Right to complain</h2>
            <p>You have the right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR). The authority competent for us (Hesse) is:</p>
            <address>
              Der Hessische Beauftragte für Datenschutz und Informationsfreiheit<br />
              Postfach 3163, 65021 Wiesbaden<br />
              <a href="https://datenschutz.hessen.de" target="_blank" rel="noreferrer">datenschutz.hessen.de</a>
            </address>

            <h2>12. Encryption</h2>
            <p>This site uses SSL/TLS encryption (HTTPS) to protect data transmitted between your browser and our server.</p>

            <h2>13. Changes</h2>
            <p>We may update this policy to reflect changes to the site or the law. The current version is always available on this page.</p>
          </>
        ) : (
          <>
            <h1>Impressum</h1>

            <h2>Angaben gemäß § 5 DDG</h2>
            <address>
              Primis Intelligence UG (haftungsbeschränkt)<br />
              Am Karnweg 53<br />
              63322 Rödermark<br />
              Deutschland
            </address>
            <p>
              Vertreten durch den Geschäftsführer: Vladislav Praznik<br />
              Registergericht: Amtsgericht Offenbach am Main<br />
              Handelsregisternummer: HRB 59072
            </p>

            <h2>Kontakt</h2>
            <p>
              Telefon: <a href="tel:+4917647152968">+49 176 47152968</a><br />
              E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>

            <h2>Umsatzsteuer-Identifikationsnummer</h2>
            <p>USt-IdNr. gemäß § 27a Umsatzsteuergesetz: DE464025288</p>

            <h2>Redaktionell verantwortlich (§ 18 Abs. 2 MStV)</h2>
            <address>Vladislav Praznik<br />Am Karnweg 53, 63322 Rödermark</address>

            <h2>Verbraucherstreitbeilegung</h2>
            <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

            <h2>Urheberrecht</h2>
            <p>Die von Primis erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Für verwendete Inhalte Dritter gelten die Rechte der jeweiligen Rechteinhaber.</p>
          </>
        )}
      </article>
      <footer className="legal-footer">
        <span>© 2026 Primis</span>
        <nav aria-label="Legal navigation"><a href="/impressum">Impressum</a><a href="/privacy">Datenschutz</a><a href="/THIRD_PARTY_NOTICES.txt">Licenses</a><a href="/">Home</a></nav>
      </footer>
    </main>
  )
}

const worldCatalog = [
  { name: 'Robotics Warehouse', family: 'Industrial interior', category: 'Indoor', image: '/assets/worlds/indoor-robotics-warehouse.jpg', reconstruction: warehouseReconstruction, alt: 'Bright warehouse with storage racks, forklift, workbench, and robot arm', reconstructionAlt: 'Reconstructed warehouse scene with storage racks, forklift, workbench, and robot arm', prompt: 'A working warehouse reconstructed as separate racks, pallets, vehicle, robot cell, clear floor, and navigable aisles.' },
  { name: 'Living Room', family: 'Residential interior', category: 'Indoor', image: '/assets/worlds/indoor-living-room.jpg', reconstruction: livingRoomReconstruction, alt: 'Minimal living room with sofas, tables, television, lamps, and plants', reconstructionAlt: 'Reconstructed living room scene with separate furniture, television, lighting, and plants', prompt: 'A residential scene with furniture, electronics, openings, circulation space, and object-to-object relationships preserved.' },
  { name: 'Private Office', family: 'Workplace interior', category: 'Indoor', image: '/assets/worlds/indoor-private-office.jpg', reconstruction: officeReconstruction, alt: 'Private office with desk, seating, storage, computer, and plants', reconstructionAlt: 'Reconstructed private office scene with desk, seating, storage, computer, and plants', prompt: 'A compact workplace world with selectable furniture, equipment, storage, architectural boundaries, and real-world clearances.' },
  { name: 'Alpine Ruins', family: 'Mountain world', category: 'Outdoor', image: '/assets/worlds/outdoor-alpine-ruins.jpg', alt: 'Mountain landscape crossed by paths and monumental stone ruins', prompt: 'A mountain-scale world with connected trails, ruins, cliffs, vegetation, and long-range terrain relationships.' },
  { name: 'Enchanted Tower', family: 'Fantasy clearing', category: 'Outdoor', image: '/assets/worlds/outdoor-enchanted-tower.jpg', alt: 'Tall stone tower in a bright magical forest clearing', prompt: 'A contained forest world with a central tower, branching paths, trees, rocks, and individually addressable landmarks.' },
  { name: 'Clockwork Street', family: 'Urban corridor', category: 'Outdoor', image: '/assets/worlds/outdoor-clockwork-street.jpg', alt: 'Warm steampunk street lined with shops, pipes, clocks, and an airship', prompt: 'A street-scale reconstruction with connected facades, shop fronts, props, roadway geometry, and layered vertical detail.' },
  { name: 'Last Station', family: 'Roadside site', category: 'Outdoor', image: '/assets/worlds/outdoor-last-station.jpg', alt: 'Abandoned gas station and car in a dark foggy forest', prompt: 'A low-visibility roadside scene where the station, pumps, vehicle, road surface, and surrounding forest remain spatially distinct.' },
  { name: 'Desert Relay', family: 'Infrastructure site', category: 'Outdoor', image: '/assets/worlds/outdoor-desert-relay.jpg', alt: 'Fenced satellite and communications relay site in a desert valley', prompt: 'A bounded infrastructure world with a dish, mast, equipment building, generator, fence, and measurable terrain.' }
]

const atlasCapabilities = [
  { title: 'Reconstruct', text: 'Drop in a single image and Primis rebuilds the entire scene in 3D. Every object is placed at real-world scale, one after another.', media: '/assets/cap-reconstruct.mp4', type: 'video', tag: 'Single image → 3D scene' },
  { title: 'Decompose', text: 'Every object separates into its own clean, engine-ready mesh, individually selectable and named down to its sub-parts. You set the fidelity, from a quick layout to full detail.', media: '/assets/cap-decompose.mp4', type: 'video', tag: 'Scene → editable objects' },
  { title: 'Simulate', text: 'Run robots and processes inside the world before you ever touch hardware. Grab a box off the shelf, place a tool inside it, and rehearse the whole task to scale.', media: '/assets/cap-simulate.jpg', type: 'image', tag: 'World → simulation' },
  { title: 'Reason', text: 'Every object in the scene is known, so you can ask about it in plain language. Pose a question like “where is the white helmet?” and get a grounded spatial answer.', media: '/assets/cap-reason.mp4', type: 'video', tag: 'Scene → spatial answer' }
]

function WorkingWorldsSection() {
  const [activeCapability, setActiveCapability] = useState(0)
  const capability = atlasCapabilities[activeCapability]

  return (
    <section className="world-capabilities home-world-capabilities" aria-labelledby="world-capabilities-title">
      <header className="world-capabilities-heading">
        <h2 id="world-capabilities-title"><span>One scene.</span><em>Put it to work.</em></h2>
        <p>One photograph in. A spatially consistent, fully decomposed 3D world out. Reconstruct it, take it apart object by object, simulate inside it, and reason about it in plain language.</p>
      </header>
      <div className="world-capabilities-grid">
        <div className="world-capability-list" role="tablist" aria-label="Atlas capabilities">
          {atlasCapabilities.map((item, index) => (
            <button id={`capability-tab-${index}`} type="button" role="tab" aria-selected={activeCapability === index} aria-controls="capability-panel" className={activeCapability === index ? 'active' : ''} onClick={() => setActiveCapability(index)} key={item.title}>
              <span>{item.title}</span>
              <p>{item.text}</p>
            </button>
          ))}
        </div>
        <div id="capability-panel" className="world-capability-media" role="tabpanel" aria-labelledby={`capability-tab-${activeCapability}`}>
          {capability.type === 'video'
            ? <video key={capability.media} autoPlay muted loop playsInline preload="metadata"><source src={capability.media} type="video/mp4" /></video>
            : <img src={capability.media} alt="Robot task simulation inside a reconstructed workshop" />}
          <span>{capability.tag}</span>
        </div>
      </div>
    </section>
  )
}

function WorldsGallery() {
  const [activeWorld, setActiveWorld] = useState(0)
  const [stageMode, setStageMode] = useState('transitioning')
  const [transitionRun, setTransitionRun] = useState(0)
  const featuredWorlds = worldCatalog
  const world = featuredWorlds[activeWorld]
  const hasReconstruction = Boolean(world.reconstruction)
  const worldGroups = ['Indoor', 'Outdoor'].map(category => ({ category, worlds: featuredWorlds.map((item, index) => ({ item, index })).filter(entry => entry.item.category === category) }))

  useEffect(() => {
    if (stageMode !== 'transitioning') return undefined
    const timer = window.setTimeout(() => setStageMode('reconstruction'), prefersReducedMotion() ? 180 : 1350)
    return () => window.clearTimeout(timer)
  }, [stageMode, transitionRun])

  const openWorld = index => {
    setActiveWorld(index)
    setStageMode(featuredWorlds[index].reconstruction ? 'transitioning' : 'source')
    setTransitionRun(run => run + 1)
    window.requestAnimationFrame(() => document.querySelector('.world-stage')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' }))
  }

  const showReconstruction = () => {
    setStageMode('transitioning')
    setTransitionRun(run => run + 1)
  }

  return (
    <section className="world-exhibition">
      <header className="world-exhibition-intro">
        <div className="world-exhibition-title">
          <h1>Worlds built<br /><em>to be explored.</em></h1>
        </div>
        <p>Five outdoor source worlds and three reconstructed interior scenes. Select an interior to move from the original capture into its current Atlas reconstruction.</p>
      </header>

      <div className="world-stage">
        <div className={`world-stage-model is-${stageMode}`} aria-label={stageMode === 'source' || !hasReconstruction ? `Source photograph for ${world.name}` : `Atlas reconstruction of ${world.name}`}>
          <div className="world-stage-chip"><LogoMark /><span>{stageMode === 'source' || !hasReconstruction ? 'SOURCE PHOTOGRAPH' : 'ATLAS RECONSTRUCTION'}</span></div>
          {hasReconstruction && <div className="world-stage-switch" role="group" aria-label="Choose source photograph or Atlas reconstruction">
            <button type="button" className={stageMode === 'source' ? 'active' : ''} aria-pressed={stageMode === 'source'} onClick={() => setStageMode('source')}>Source</button>
            <button type="button" className={stageMode !== 'source' ? 'active' : ''} aria-pressed={stageMode !== 'source'} onClick={showReconstruction}>Reconstruction</button>
          </div>}
          <img key={`source-${world.image}-${transitionRun}`} className="world-stage-source" src={world.image} alt={world.alt} />
          {hasReconstruction && <img key={`reconstruction-${world.reconstruction}-${transitionRun}`} className="world-stage-reconstruction" src={world.reconstruction} alt={world.reconstructionAlt} />}
        </div>

        <aside className="world-stage-details">
          <div className="world-stage-meta"><span>{String(activeWorld + 1).padStart(2, '0')} / {String(featuredWorlds.length).padStart(2, '0')}</span><span>{world.family}</span></div>
          <h2>{world.name}</h2>
          <p className="world-stage-prompt">{world.prompt}</p>
          {hasReconstruction && <p className="world-stage-note">The source image and reconstructed view share the same scene. Use the switch above to compare the original capture with the current Atlas result.</p>}
        </aside>
      </div>

      <section className="world-library" aria-labelledby="world-library-title">
        <div className="world-library-heading"><h2 id="world-library-title">Eight source scenes.<br />Three reconstructed.</h2><p>The indoor examples blend into their current reconstructed results. Outdoor scenes remain as source imagery for now.</p></div>
        <div className="world-library-groups">
          {worldGroups.map(group => <section className="world-library-group" key={group.category}>
            <header><h3>{group.category}</h3><span>{String(group.worlds.length).padStart(2, '0')} scenes</span></header>
            <div className="world-library-grid" style={{ '--world-columns': group.worlds.length }} role="group" aria-label={`Select an ${group.category.toLowerCase()} scene`}>
              {group.worlds.map(({ item, index }) => (
                <button className={activeWorld === index ? 'active' : ''} onClick={() => openWorld(index)} key={item.name} aria-label={item.reconstruction ? `Compare the source and reconstruction for ${item.name}` : `View the source photograph for ${item.name}`}>
                  <div className={`world-library-image${item.reconstruction ? ' has-reconstruction' : ''}`}>
                    <img className="world-library-source" src={item.image} alt="" loading="lazy" />
                    {item.reconstruction && <img className="world-library-result" src={item.reconstruction} alt="" loading="lazy" />}
                    <span>{item.reconstruction ? 'Open reconstruction' : 'Open source'}</span>
                  </div>
                  <span>SCENE / {String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.name}</strong>
                  <small>{item.family}</small>
                </button>
              ))}
            </div>
          </section>)}
        </div>
      </section>

    </section>
  )
}

function WorldsPage() {
  return (
    <main className="inner-page worlds-page">
      <Header />
      <WorldsGallery />
      <SiteFooter />
    </main>
  )
}

function ConfirmWaitlistPage() {
  const [message, setMessage] = useState('Confirming your email…')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') || ''
    if (!token) {
      setMessage('This confirmation link is invalid.')
      return
    }

    let active = true
    fetch(`${FORM_API_URL}/api/waitlist/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}))
        if (!active) return
        if (response.ok && result.status === 'confirmed') {
          window.location.replace('/studio?waitlist=confirmed')
          return
        }
        window.location.replace(`/studio?waitlist=${result.status === 'expired' ? 'expired' : 'invalid'}`)
      })
      .catch(() => {
        if (active) setMessage('We could not confirm this email right now. Please try the link again shortly.')
      })

    return () => { active = false }
  }, [])

  return (
    <main className="waitlist-page confirmation-gateway">
      <Header />
      <section className="confirmation-gateway-content" aria-live="polite">
        <LogoMark />
        <p>{message}</p>
      </section>
    </main>
  )
}

function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const researchArticle = path.startsWith('/research/') ? researchArticles.find(article => article.slug === path.slice('/research/'.length)) : null
  useEffect(() => {
    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        try {
          document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
        } catch {
          // Ignore malformed URL fragments instead of interrupting the page.
        }
      })
    }
  }, [path])
  if (path === '/about') return <AboutPage />
  if (researchArticle) return <ResearchArticlePage article={researchArticle} />
  if (path === '/research') return <ResearchPage />
  if (path === '/worlds') return <WorldsPage />
  if (path === '/studio') return <WaitlistPage />
  if (path === '/confirm') return <ConfirmWaitlistPage />
  if (path === '/contact') return <ContactPage />
  if (path === '/impressum' || path === '/impressum.html') return <LegalPage type="impressum" />
  if (path === '/privacy' || path === '/datenschutz' || path === '/datenschutz.html') return <LegalPage type="privacy" />
  return <main><Header /><Hero /><LiveDemoPreview /><WorkingWorldsSection /><Vision /><AtlasOverview /><SiteFooter /></main>
}

createRoot(document.getElementById('root')).render(<App />)
