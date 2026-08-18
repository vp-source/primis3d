import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

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

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2c.4 5.9 4.1 9.6 10 10-5.9.4-9.6 4.1-10 10-.4-5.9-4.1-9.6-10-10 5.9-.4 9.6-4.1 10-10Z" />
  </svg>
)

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
        <a href="/research">Research &amp; Simulation</a>
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
          <feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent="1.35" offset="0" /></feComponentTransfer>
        </filter>
      </svg>
      <img className="hero-world-image" src="/assets/atlas-spatial-field.png" alt="A luminous spatial field represented as a flowing three-dimensional grid" />
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
      { title: 'A measurable environment', paragraphs: ['Real-world scale allows a simulator to reason about clearance, reach, collision, travel time, and sensor coverage. Objects remain separate so that researchers can remove, replace, articulate, or instrument them.'] },
      { title: 'Repeatable operational questions', paragraphs: ['The same scene can support many experiments without changing the physical site. Teams can compare layouts, rehearse routes, study failure conditions, and evaluate proposed interventions under controlled conditions.'], points: ['Robot and vehicle navigation', 'Industrial process planning', 'Safety and accessibility studies', 'Sensor and camera placement'] },
      { title: 'A living digital twin', paragraphs: ['A useful twin should evolve with the physical environment. Future work includes aligning repeated captures, tracking structural changes, and preserving the relationship between reconstructed geometry and operational data.'] }
    ],
    secondary: { type: 'video', src: '/assets/cap-simulate.mp4', caption: 'A reconstructed environment prepared as a repeatable simulation space.' },
    quote: 'The physical site becomes a testable system rather than a static scan.'
  },
  {
    slug: 'articulated-models', number: '04', category: 'CAD & ARTICULATION', title: 'Reconstructing assemblies that can move',
    deck: 'Multicomponent models, mechanical relationships, and joint articulation turn captured objects into editable functional systems.',
    hero: { type: 'image', src: '/assets/research-manipulation.jpg' }, indexImage: '/assets/research-manipulation.jpg',
    overview: [
      'Many objects are not single rigid meshes. Doors rotate around hinges, drawers translate along rails, tools contain moving components, and industrial assemblies expose constrained degrees of freedom.',
      'Primis explores how reconstruction can identify components and preserve the relationships required for CAD remodeling, simulation, and interaction.'
    ],
    sections: [
      { title: 'From one mesh to an assembly', paragraphs: ['Separating a captured object into meaningful components makes it possible to edit, replace, measure, and simulate each part independently. The resulting hierarchy can serve as a reference for parametric remodeling or as a directly manipulable scene asset.'] },
      { title: 'Joint-aware reconstruction', paragraphs: ['A useful articulated model specifies how components may move. Hinges, sliders, pivots, limits, and parent-child relationships encode the kinematic structure behind visible geometry.'], points: ['Component segmentation and hierarchy', 'Joint type and axis estimation', 'Motion limits and collision constraints', 'Export into CAD and simulation workflows'] },
      { title: 'Learning through interaction', paragraphs: ['Articulated environments expand the actions a robot can rehearse. Opening, closing, rotating, inserting, and removing become scene-level capabilities rather than manually scripted exceptions.'] }
    ],
    secondary: { type: 'image', src: '/assets/primis-world-model-v4.png', fit: 'contain', caption: 'Objects represented as bounded components inside a larger spatial system.' },
    quote: 'Geometry describes shape. Articulation describes what the object can do.'
  },
  {
    slug: 'designed-worlds', number: '05', category: 'GAMES & ARCHITECTURE', title: 'Using reconstruction as a design substrate',
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
    slug: 'spatial-datasets', number: '06', category: 'SPATIAL AI DATA', title: 'Generating structured data from reconstructed worlds',
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
        <p>Primis research explores the systems built on reconstructed worlds: spatial reasoning, robot learning, simulation, articulated objects, design workflows, and structured AI data.</p>
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
          <a href="/research">Research &amp; Simulation</a>
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
    { href: '/research/designed-worlds', image: '/assets/games-desert.jpg', area: 'GAME ENVIRONMENT DESIGN', title: 'Build an editable world from a visual reference', text: 'Use reconstructed geometry as a starting point for level composition, asset placement, and world design.' },
    { href: '/research/robot-generalization', image: '/assets/cap-simulate.jpg', area: 'ROBOTICS & SIMULATION', title: 'Test physical tasks before touching hardware', text: 'Robots can rehearse navigation and manipulation inside a reconstruction of the real environment.' },
    { href: '/research/spatial-datasets', image: '/assets/cap-synthetic.jpg', area: 'SYNTHETIC DATA', title: 'Turn one environment into controlled variations', text: 'Generate aligned layouts and labeled scenes for spatial model training and evaluation.' }
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
          <a className="research-story" href={story.href} key={story.title}>
            <div className="research-story-copy"><span>{story.area}</span><h3>{story.title}</h3><p>{story.text}</p></div>
            <img src={story.image} alt="" />
          </a>
        ))}
      </div>
      <a className="button button-light overview-button" href="/research">Explore Research &amp; Simulation <Arrow /></a>
    </section>
  )
}

const demoObjects = [
  { id: 'workbench', name: 'Workbench', type: 'Surface', confidence: '98%' },
  { id: 'robot', name: 'Robot arm', type: 'Articulated', confidence: '96%' },
  { id: 'crate', name: 'Storage crate', type: 'Container', confidence: '94%' },
  { id: 'floor', name: 'Workshop floor', type: 'Structure', confidence: '99%' }
]

function DemoStudio() {
  const [mode, setMode] = useState('Scene')
  const [selected, setSelected] = useState('robot')
  const [sourceImage, setSourceImage] = useState('')
  const [reconstructing, setReconstructing] = useState(false)
  const [complete, setComplete] = useState(false)
  const [layers, setLayers] = useState({ labels: true, geometry: true, path: true })
  const [question, setQuestion] = useState('Where is the robot arm?')
  const [answer, setAnswer] = useState('The robot arm is 1.2 m ahead, mounted beside the workbench.')

  const loadImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setSourceImage(reader.result); setComplete(false) }
    reader.readAsDataURL(file)
  }

  const reconstruct = () => {
    setReconstructing(true)
    setComplete(false)
    window.setTimeout(() => { setReconstructing(false); setComplete(true); setMode('Scene') }, 1500)
  }

  const askScene = (event) => {
    event.preventDefault()
    if (!question.trim()) return
    const normalized = question.toLowerCase()
    if (normalized.includes('crate')) setAnswer('The storage crate is beneath the workbench, 0.8 m to the right of the robot arm.')
    else if (normalized.includes('workbench')) setAnswer('The workbench spans the center of the scene and is identified as a primary support surface.')
    else setAnswer('The selected object is visible and spatially grounded in the reconstructed workshop scene.')
  }

  return (
    <section className="studio-section" id="studio" aria-label="Atlas Studio interactive demo">
      <div className="studio-shell">
        <div className="studio-toolbar">
          <div className="studio-brand"><LogoMark /><span>ATLAS STUDIO</span><i>BETA</i></div>
          <div className="mode-tabs">
            {['Scene', 'Objects', 'Simulate', 'Reason'].map(item => <button className={mode === item ? 'active' : ''} onClick={() => setMode(item)} key={item}>{item}</button>)}
          </div>
          <button className={`reconstruct-button ${reconstructing ? 'loading' : ''}`} onClick={reconstruct} disabled={reconstructing}>
            {reconstructing ? 'Reconstructing…' : complete ? 'Reconstructed ✓' : 'Reconstruct scene'}
          </button>
        </div>

        <div className="studio-body">
          <aside className="studio-sidebar source-panel">
            <div className="panel-title">SOURCE</div>
            <label className="image-upload">
              {sourceImage ? <img src={sourceImage} alt="Uploaded source" /> : <><SparkIcon /><strong>Load a source image</strong><small>JPG or PNG · single view</small></>}
              <input type="file" accept="image/png,image/jpeg" onChange={loadImage} />
            </label>
            <div className="source-meta"><span>Input</span><b>{sourceImage ? 'Custom image' : 'Workshop sample'}</b></div>
            <div className="source-meta"><span>Output</span><b>Metric 3D scene</b></div>
            <div className="layer-controls">
              <div className="panel-title">LAYERS</div>
              {Object.entries(layers).map(([key, value]) => (
                <label key={key}><span>{key}</span><input type="checkbox" checked={value} onChange={() => setLayers(current => ({ ...current, [key]: !current[key] }))} /><i /></label>
              ))}
            </div>
          </aside>

          <div className={`scene-viewport mode-${mode.toLowerCase()} ${complete ? 'is-complete' : ''}`}>
            {sourceImage && <div className="source-wash" style={{ backgroundImage: `url(${sourceImage})` }} />}
            <div className="viewport-grid" />
            <div className="demo-platform">
              <button className={`demo-mesh mesh-table ${selected === 'workbench' ? 'selected' : ''}`} onClick={() => setSelected('workbench')} aria-label="Select workbench" />
              <button className={`demo-mesh mesh-robot ${selected === 'robot' ? 'selected' : ''}`} onClick={() => setSelected('robot')} aria-label="Select robot arm"><i /><i /><i /></button>
              <button className={`demo-mesh mesh-crate ${selected === 'crate' ? 'selected' : ''}`} onClick={() => setSelected('crate')} aria-label="Select crate" />
              {layers.path && <div className="motion-path"><i /><i /><i /></div>}
              {layers.labels && <><span className="mesh-label robot-label">ROBOT_ARM_01</span><span className="mesh-label table-label">WORKBENCH_01</span></>}
            </div>
            <div className="viewport-top"><span><i /> {reconstructing ? 'PROCESSING SOURCE' : complete ? 'SCENE READY' : 'SAMPLE SCENE'}</span><span>METRIC / 1:1</span></div>
            <div className="axis-widget"><b>Y</b><i /><em>X</em><span>Z</span></div>
            {mode === 'Simulate' && <div className="simulation-notice"><span /> Motion planning active</div>}
            {mode === 'Reason' && <form className="reason-box" onSubmit={askScene}><label>ASK THE SCENE</label><div><input value={question} onChange={event => setQuestion(event.target.value)} /><button type="submit"><Arrow /></button></div><p>{answer}</p></form>}
          </div>

          <aside className="studio-sidebar objects-panel">
            <div className="panel-title">SCENE OBJECTS <b>{demoObjects.length}</b></div>
            <div className="object-list">
              {demoObjects.map(object => (
                <button className={selected === object.id ? 'active' : ''} key={object.id} onClick={() => setSelected(object.id)}>
                  <i /><span><strong>{object.name}</strong><small>{object.type}</small></span><em>{object.confidence}</em>
                </button>
              ))}
            </div>
            <div className="object-inspector">
              <div className="panel-title">SELECTION</div>
              <h3>{demoObjects.find(object => object.id === selected)?.name || 'Scene object'}</h3>
              <dl><div><dt>Position</dt><dd>1.24, 0.82, 2.10 m</dd></div><div><dt>Scale</dt><dd>Real world / metric</dd></div><div><dt>Mesh</dt><dd>Editable</dd></div></dl>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function StudioPage() {
  return <main className="atlas-studio-page"><DemoStudio /></main>
}

function WaitlistPage() {
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [verificationError, setVerificationError] = useState(false)
  const [turnstileCycle, setTurnstileCycle] = useState(0)
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get('waitlist') || 'idle')

  const submitAccess = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    const data = new FormData(event.currentTarget)
    try {
      const result = await submitForm('/api/waitlist', {
        email: waitlistEmail.trim(),
        website: data.get('website') || '',
        turnstileToken,
      })
      setWaitlistEmail('')
      setStatus(result.status === 'registered' ? 'registered' : 'confirmation_sent')
    } catch (error) {
      setStatus(error.message === 'rate_limited' ? 'rate_limited' : 'error')
    } finally {
      setTurnstileToken('')
      setTurnstileCycle(current => current + 1)
    }
  }

  return (
    <main className="waitlist-page">
      <Header />
      <section className="waitlist-hero">
        <div className="waitlist-intro">
          <h1>Join the Atlas<br /><em>waitlist.</em></h1>
          <p>Ask Primis to send you one email when the first public Atlas release is available. No recurring product marketing.</p>
          <form className="waitlist-signup" onSubmit={submitAccess}>
            <label className="sr-only" htmlFor="waitlist-email">Email address</label>
            <input id="waitlist-email" name="waitlistEmail" type="email" autoComplete="email" maxLength="254" value={waitlistEmail} onChange={(event) => setWaitlistEmail(event.target.value)} placeholder="Enter your email address" required />
            <input className="form-honeypot" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            <button type="submit" disabled={status === 'submitting' || !turnstileToken}>{status === 'submitting' ? 'Sending…' : 'Sign up'} <Arrow /></button>
          </form>
          <Turnstile theme="dark" onToken={setTurnstileToken} onError={setVerificationError} cycle={turnstileCycle} />
          <p className="form-privacy-note">We will email you a confirmation link. After confirmation, we use the address once for the Atlas launch notice and then delete it. <a href="/privacy">Privacy details</a>.</p>
          {verificationError && <p className="mail-draft-status form-error" role="alert">Browser verification was blocked. Allow challenges.cloudflare.com or email us directly.</p>}
          {status === 'registered' && <p className="mail-draft-status" role="status">This email is already registered.</p>}
          {status === 'confirmation_sent' && <p className="mail-draft-status" role="status">A confirmation email has been sent.</p>}
          {status === 'confirmed' && <p className="mail-draft-status" role="status">Your email has been confirmed.</p>}
          {status === 'expired' && <p className="mail-draft-status" role="status">That confirmation link expired. Enter your email again to receive a new one.</p>}
          {status === 'invalid' && <p className="mail-draft-status form-error" role="status">That confirmation link is invalid or has already been used.</p>}
          {status === 'error' && <p className="mail-draft-status form-error" role="alert">We could not process the request. Please try again shortly.</p>}
          {status === 'rate_limited' && <p className="mail-draft-status form-error" role="alert">Please wait before trying again.</p>}
        </div>

        <section className="pilot-request" aria-labelledby="pilot-title">
          <div className="access-or">or</div>
          <h2 id="pilot-title">Request a pilot.</h2>
          <p>Need to reconstruct a real environment for robotics, simulation, spatial AI, or 3D production? Tell us about the scene and the outcome you need.</p>
          <a className="button pilot-request-button" href="/contact">Request a pilot <Arrow /></a>
          <a className="pilot-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </section>
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
            <p className="legal-subtitle">Datenschutzerklärung — last updated 18 August 2026</p>

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

            <h2>5. Atlas launch notification</h2>
            <p>If you request the Atlas launch notification, we process your email address solely to send <strong>one email</strong> when Atlas first becomes publicly available. We first send a confirmation link to verify that the address belongs to the person making the request. Unconfirmed requests are deleted after seven days. We do not reuse the address for recurring product marketing.</p>
            <p>The legal basis is your consent under Art. 6(1)(a) GDPR. You may withdraw at any time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We delete a confirmed address after sending the one-time notice or after withdrawal. If Atlas has not launched within 24 months of confirmation, we delete it unless you renew your request. Limited retention may continue where necessary to establish or defend legal claims.</p>

            <h2>6. Contact and pilot enquiries</h2>
            <p>If you use the contact form, we process your reply address, message, and any optional name or company information solely to deliver and answer the enquiry, discuss a pilot, or take steps requested before a contract. The website form service does not retain the content in the waitlist database; it is transmitted as an email to Primis.</p>
            <p>The legal basis is Art. 6(1)(b) GDPR where your enquiry concerns pre-contractual or contractual steps, and otherwise Art. 6(1)(f) GDPR. Our legitimate interest is responding to relevant business and research enquiries. We normally delete enquiry data within six months after the final response unless a contract, statutory retention duty, or legal claim requires longer retention.</p>

            <h2>7. Recipients and international transfers</h2>
            <p>Website hosting, the Primis mailbox, and transactional email delivery are provided by IONOS SE. Form requests are processed by Cloudflare, Inc. through Cloudflare Workers and Turnstile; confirmed waitlist addresses are stored in a Cloudflare D1 database restricted to the European Union. These providers act as processors for the stated purposes.</p>
            <p>Cloudflare operates a global network and some technical processing may occur outside the European Economic Area. Where a transfer to a country without an adequacy decision occurs, it is covered by the provider's data processing terms and applicable safeguards, including standard contractual clauses. We do not sell form or waitlist data.</p>

            <h2>8. Required information and automated decisions</h2>
            <p>Providing information is voluntary. Without an email address we cannot send the launch notice or reply to an enquiry; optional fields may be left blank. We do not use this website data for automated decision-making or profiling.</p>

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
  { name: 'Frontier Basin', family: 'Connected terrain', prompt: 'A traversable world with layered terrain, connected waterways, open plains and elevated regions.' },
  { name: 'Granite Reach', family: 'Mountain corridor', prompt: 'A high-relief world organized around ridges, passes and sheltered valleys.' },
  { name: 'Delta Fields', family: 'River network', prompt: 'A broad landscape shaped by branching channels, islands and low-lying terrain.' },
  { name: 'Verdant Shelf', family: 'Forest plateau', prompt: 'A raised green shelf with dense boundaries, open clearings and connected paths.' },
  { name: 'North Passage', family: 'Coastal terrain', prompt: 'A continuous coastal world with cliffs, inlets and navigable interior regions.' },
  { name: 'Glasswater', family: 'Lake district', prompt: 'An open world structured around linked lakes, narrow crossings and rolling terrain.' },
  { name: 'Ember Caldera', family: 'Volcanic basin', prompt: 'A circular basin with steep walls, radial routes and a complex central depression.' },
  { name: 'Saffron Divide', family: 'Desert shelf', prompt: 'A dry layered world with terraces, channels and long-range lines of sight.' },
  { name: 'Hollow Ring', family: 'Circular terrain', prompt: 'A ring-shaped environment with interior paths, vertical transitions and enclosed space.' },
  { name: 'Meadow Run', family: 'Open watershed', prompt: 'A gently graded watershed with clear movement corridors and distant boundaries.' },
  { name: 'Slate Expanse', family: 'Structural study', prompt: 'A neutral world study focused on scale, topology and spatial continuity.' }
]

function PlaceholderTerrain({ compact = false, variant = 0, channel = '' }) {
  return (
    <div className={`placeholder-terrain ${compact ? 'is-compact' : ''} ${channel}`} data-variant={variant % 5}>
      <div className="terrain-plane">
        <i className="terrain-ridge ridge-a" /><i className="terrain-ridge ridge-b" /><i className="terrain-ridge ridge-c" />
        <i className="terrain-river" />
        <div className="terrain-blocks">{Array.from({ length: 14 }, (_, index) => <b key={index} />)}</div>
      </div>
    </div>
  )
}

function WorldViewPlaceholder({ index, type }) {
  return (
    <div className={`world-view-placeholder ${type} view-${index}`}>
      <span>{String(index).padStart(2, '0')}</span>
      <div className="world-view-ground"><i /><i /><i /><i /><i /><i /></div>
    </div>
  )
}

function WorldsGallery() {
  const [activeWorld, setActiveWorld] = useState(0)
  const [viewMode, setViewMode] = useState('orbit')
  const featuredWorlds = worldCatalog.slice(0, 5)
  const world = featuredWorlds[activeWorld]
  const views = {
    orbit: { label: 'Orbit', description: 'Read the complete terrain, boundaries, and connected regions from above.' },
    walk: { label: 'Walk', description: 'Move through the world at ground level and inspect it at human scale.' },
    data: { label: 'Spatial data', description: 'Inspect the geometry, object structure, depth, and traversable areas beneath the render.' }
  }
  const channels = [
    { slug: 'surface', index: 0, eyebrow: '01 / GEOMETRY', title: 'Editable surface', text: 'Connected terrain and scene geometry form the physical structure of the world.' },
    { slug: 'semantic', index: 1, eyebrow: '02 / SEMANTICS', title: 'Named regions', text: 'Objects and areas remain individually addressable instead of being flattened into one image.' },
    { slug: 'depth', index: 2, eyebrow: '03 / SCALE', title: 'Metric depth', text: 'Estimated depth and scale are intended to preserve the distances required by simulation and physical reasoning.' },
    { slug: 'traversability', index: 3, eyebrow: '04 / ACTION', title: 'Traversable space', text: 'Open routes and boundaries reveal where an agent can move and act.' }
  ]

  return (
    <section className="world-exhibition">
      <header className="world-exhibition-intro">
        <div className="world-exhibition-title">
          <h1>Worlds built<br /><em>to be explored.</em></h1>
        </div>
        <p>Atlas is designed to generate connected 3D environments that can be viewed, edited, measured, and used as working spatial models.</p>
      </header>

      <div className="world-stage">
        <div className="world-stage-model" role="img" aria-label={`Placeholder 3D model for ${world.name}`}>
          <div className="world-stage-chip"><LogoMark /><span>PLACEHOLDER MODEL</span></div>
          <PlaceholderTerrain variant={activeWorld} />
          <div className="world-stage-axis" aria-hidden="true"><i /><b>X</b><em>Y</em><span>Z</span></div>
        </div>

        <aside className="world-stage-details">
          <div className="world-stage-meta"><span>{String(activeWorld + 1).padStart(2, '0')} / {String(featuredWorlds.length).padStart(2, '0')}</span><span>{world.family}</span></div>
          <h2>{world.name}</h2>
          <p className="world-stage-prompt">{world.prompt}</p>
          <div className="world-view-tabs" role="tablist" aria-label="World viewing mode">
            {Object.entries(views).map(([slug, view]) => <button id={`world-view-tab-${slug}`} aria-controls="world-view-panel" key={slug} role="tab" aria-selected={viewMode === slug} tabIndex={viewMode === slug ? 0 : -1} className={viewMode === slug ? 'active' : ''} onClick={() => setViewMode(slug)}>{view.label}</button>)}
          </div>
          <div id="world-view-panel" className={`world-selected-view mode-${viewMode}`} role="tabpanel" aria-labelledby={`world-view-tab-${viewMode}`}>
            {viewMode === 'data' ? <PlaceholderTerrain variant={activeWorld} channel="channel-semantic" /> : <WorldViewPlaceholder index={activeWorld % 3 + 1} type={viewMode} />}
          </div>
          <p className="world-view-description">{views[viewMode].description}</p>
        </aside>
      </div>

      <section className="world-library" aria-labelledby="world-library-title">
        <div className="world-library-heading"><h2 id="world-library-title">Choose an environment.</h2><p>Each placeholder represents a different spatial structure. Real generated models can replace these directly.</p></div>
        <div className="world-library-grid" role="group" aria-label="Select world">
          {featuredWorlds.map((item, index) => (
            <button className={activeWorld === index ? 'active' : ''} onClick={() => setActiveWorld(index)} key={item.name} aria-label={`Show ${item.name}`}>
              <div><PlaceholderTerrain compact variant={index} /></div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.name}</strong>
              <small>{item.family}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="world-data" aria-labelledby="world-data-title">
        <header><h2 id="world-data-title">More than a render.</h2><p>The same generated environment can expose the spatial information needed by editors, simulators, and intelligent agents.</p></header>
        <div className="world-data-grid">
          {channels.map(channel => (
            <article key={channel.slug}>
              <div className="world-data-visual"><PlaceholderTerrain variant={activeWorld + channel.index} channel={`channel-${channel.slug}`} /></div>
              <div className="world-data-copy"><span>{channel.eyebrow}</span><h3>{channel.title}</h3><p>{channel.text}</p></div>
            </article>
          ))}
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
  if (path === '/contact') return <ContactPage />
  if (path === '/impressum' || path === '/impressum.html') return <LegalPage type="impressum" />
  if (path === '/privacy' || path === '/datenschutz' || path === '/datenschutz.html') return <LegalPage type="privacy" />
  return <main><Header /><Hero /><LiveDemoPreview /><Vision /><AtlasOverview /><SiteFooter /></main>
}

createRoot(document.getElementById('root')).render(<App />)
