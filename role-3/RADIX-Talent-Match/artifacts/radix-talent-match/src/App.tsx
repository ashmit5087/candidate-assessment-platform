import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardList,
  CloudUpload, FileSearch, FileText, HeartHandshake, LayoutDashboard, LockKeyhole, Menu, Moon, Plus, Search,
  Settings, ShieldCheck, Sun, Target, Trash2, UserRound, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { jdAnalyticsClient, type JDAnalysis, type Skill } from './services/jdAnalyticsClient';
import { profileBuilderClient, type Profile } from './services/profileBuilderClient';
import { resumeParsingClient } from './services/resumeParsingClient';
import { talentCheckClient } from './services/talentCheckClient';
import { skillMatchingClient, type ImprovementAction, type MatchRequest, type MatchResult, type MatchSkill } from './services/skillMatchingClient';

const queryClient = new QueryClient();
const demoEnabled = import.meta.env.VITE_DEMO_MODE === 'true' && import.meta.env.MODE !== 'production';
const primaryNav = [
  { label: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { label: 'My Profile', href: '/app/profile', icon: UserRound },
  { label: 'Resume', href: '/app/resume', icon: FileText },
  { label: 'JD Analytics', href: '/app/jds', icon: FileSearch },
  { label: 'Talent Check', href: '/app/talent-check', icon: Target },
  { label: 'Skill Matching', href: '/app/skill-matching', icon: HeartHandshake },
];

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} data-testid="link-radix-home"><span className="brand-mark" aria-hidden="true">R</span><span>RADIX<span style={{ fontWeight: 500, opacity: .72 }}> talent match</span></span></Link>;
}

function AppShell({ children, title, theme, toggleTheme }: { children: ReactNode; title: string; theme: string; toggleTheme: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-frame">
    <aside className="sidebar" aria-label="Main navigation">
      <Brand light />
      <div className="nav-caption">Workspace</div>
      {primaryNav.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${location === href || (href === '/app/jds' && location.startsWith('/app/jds/')) || (href === '/app/skill-matching' && location.startsWith('/app/skill-matching/')) ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon aria-hidden="true" />{label}</Link>)}
      <div className="nav-caption" style={{ marginTop: 15 }}>Preferences</div>
      <Link href="/app/settings" className={`nav-link ${location === '/app/settings' ? 'active' : ''}`} data-testid="link-nav-settings"><Settings aria-hidden="true" />Settings</Link>
      <div className="sidebar-note"><strong style={{ color: 'white' }}>A workspace for your next step.</strong><br />Keep your profile yours. Insights support your decisions; they do not make hiring decisions.</div>
    </aside>
    {mobileOpen && <div className="mobile-drawer" role="dialog" aria-label="Navigation menu">
      <div className="mobile-drawer-head"><Brand light /><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-menu"><X /></button></div>
      {primaryNav.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="nav-link" data-testid={`mobile-link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon />{label}</Link>)}
      <Link href="/app/settings" onClick={() => setMobileOpen(false)} className="nav-link" data-testid="mobile-link-settings"><Settings />Settings</Link>
    </div>}
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left"><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div>
        <div className="top-actions">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation" data-testid="button-open-menu"><Menu /></button>
          <button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} data-testid="button-theme-toggle">{theme === 'light' ? <Moon /> : <Sun />}</button>
          <span className="status-pill teal"><span aria-hidden="true" className="status-dot" />Local workspace</span>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{copy && <p className="subhead">{copy}</p>}</div>{action}</div>;
}

function Notice({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'warning' | 'error' }) {
  return <div className={`callout ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><CircleHelp aria-hidden="true" /> <div>{children}</div></div>;
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof FileText; title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

function LandingPage() {
  return <div className="landing">
    <nav className="landing-nav"><Brand /><div className="landing-links"><a href="#approach" data-testid="link-how-it-works">How it works</a><Link href="/login" data-testid="link-login">Log in</Link><Link href="/signup" className="button button-primary" data-testid="link-get-started">Get started <ArrowRight size={15} /></Link></div></nav>
    <section className="hero">
      <div><div className="eyebrow">A clearer view of your next move</div><h1 className="hero-title">Your experience,<br />made <span>visible.</span></h1><p className="hero-copy">Build a profile that reflects your work. Explore what a role asks for. See where your skills align—and what you might strengthen next.</p><div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}><Link href="/signup" className="button button-primary" data-testid="link-create-profile">Create your profile <ArrowRight /></Link><Link href="/login" className="button button-outline" data-testid="link-landing-login">Log in</Link></div><p style={{ marginTop: 16, color: '#8791a0', fontSize: 10 }}>Your career decisions stay yours. RADIX offers context, not hiring verdicts.</p></div>
      <div className="hero-visual" aria-label="Illustration of a profile and role requirements">
        <div className="hero-sheet"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div className="empty-icon" style={{ margin: 0, width: 36, height: 36 }}><UserRound size={17} /></div><div><div style={{ height: 8, width: 104, background: '#cdd5dc', borderRadius: 8 }} /><div style={{ height: 6, width: 70, background: '#e4e8eb', borderRadius: 8, marginTop: 7 }} /></div></div><div className="hero-line" style={{ marginTop: 22 }} /><div className="hero-line short" /><div style={{ borderTop: '1px solid #edf0f2', marginTop: 20, paddingTop: 12 }}><div style={{ fontSize: 9, fontWeight: 700, color: '#526378', marginBottom: 5 }}>SKILLS & EVIDENCE</div><span className="hero-skill">Python</span><span className="hero-skill">Research</span><span className="hero-skill">Communication</span></div></div>
        <div className="hero-sheet" style={{ width: 200 }}><div className="eyebrow" style={{ fontSize: 8 }}>Role overview</div><div className="hero-line" /><div className="hero-line short" /><div style={{ marginTop: 18, background: '#eef4f4', borderRadius: 8, padding: 11, fontSize: 9, color: '#4c7773' }}>Requirements are easier to understand when they are explicit.</div></div>
      </div>
    </section>
    <section className="section-wrap" style={{ paddingTop: 30 }}><div className="section-heading"><div><div className="eyebrow">A thoughtful toolkit</div><h2>Make the next step more legible.</h2></div><span style={{ color: '#7b8592', fontSize: 11 }}>Four connected ways to explore</span></div><div className="grid grid-four grid-three">
      {[{ icon: UserRound, title: 'Build your profile', copy: 'Create an editable record of your education, work, skills and projects.' }, { icon: FileSearch, title: 'Read a role closely', copy: 'Explore skills and evidence extracted from a job description.' }, { icon: Target, title: 'Explore company readiness', copy: 'Review skill categories and next steps when the service is available.' }, { icon: HeartHandshake, title: 'Compare skills', copy: 'See an estimate of alignment with a role, with gaps and context.' }].map(({ icon: Icon, title, copy }) => <article className="feature-card" key={title}><div className="empty-icon"><Icon /></div><h3>{title}</h3><p>{copy}</p></article>)}
    </div></section>
    <section className="how-strip" id="approach"><div className="section-wrap"><div className="section-heading"><div><div className="eyebrow" style={{ color: '#9bcac4' }}>A simple rhythm</div><h2>From information to a clearer plan.</h2></div><p style={{ color: '#b5c1cf', fontSize: 12, maxWidth: 320, lineHeight: 1.65 }}>Start wherever it is useful. You can build a profile without uploading a resume or analyzing a job.</p></div><div className="grid grid-three">{[{ n: '01 / BRING IN', title: 'Gather what you have', desc: 'Start manually, or keep resume parsing separate while its browser connection is pending.' }, { n: '02 / REVIEW', title: 'Make it your own', desc: 'Your details remain editable. Confirm what is accurate and leave out what is not.' }, { n: '03 / EXPLORE', title: 'Understand the fit', desc: 'Compare your skills with a role and use the returned context to guide your next step.' }].map(item => <div className="how-step" key={item.n}><b>{item.n}</b><strong>{item.title}</strong><span>{item.desc}</span></div>)}</div></div></section>
    <footer style={{ maxWidth: 1240, margin: 'auto', padding: '25px 28px 35px', display: 'flex', justifyContent: 'space-between', color: '#828c99', fontSize: 10 }}><span>RADIX Talent Match</span><span>Career context, not hiring decisions.</span></footer>
  </div>;
}

function AuthPage({ kind }: { kind: 'login' | 'signup' | 'forgot' }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const title = kind === 'login' ? 'Welcome back' : kind === 'signup' ? 'Create your workspace' : 'Reset your password';
  const submitLabel = kind === 'login' ? 'Continue' : kind === 'signup' ? 'Create account' : 'Send reset instructions';
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setMessage('Authentication is not connected yet. Your information has not been submitted.'); window.setTimeout(() => setBusy(false), 300); }
  return <div className="auth-wrap"><aside className="auth-side"><Brand light /><div><div className="eyebrow" style={{ color: '#9bcac4' }}>A workspace for your working life</div><h2>Build a profile that moves with you.</h2><p>From first portfolio to your next chapter, keep your experience clear, editable and entirely yours.</p></div><div style={{ position: 'relative', zIndex: 1, color: '#9fabb9', fontSize: 10 }}>Provider-neutral authentication preview · Not connected</div></aside>
    <main className="auth-main"><form className="auth-form" onSubmit={submit}><Link href="/" className="button button-quiet" data-testid="link-auth-home"><ArrowLeft size={15} /> Back to RADIX</Link><div className="eyebrow" style={{ marginTop: 24 }}>Candidate workspace</div><h1>{title}</h1><p className="subhead" style={{ marginBottom: 24 }}>{kind === 'forgot' ? 'Enter your email and we’ll show where recovery will connect.' : 'Authentication is being prepared. This screen is a visual preview only.'}</p>
      {kind === 'signup' && <div className="field" style={{ marginBottom: 15 }}><label htmlFor="auth-name">Name</label><input id="auth-name" autoComplete="name" placeholder="Your name" data-testid="input-auth-name" required /></div>}
      <div className="field" style={{ marginBottom: 15 }}><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" data-testid="input-auth-email" required /></div>
      {kind !== 'forgot' && <div className="field" style={{ marginBottom: 20 }}><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={kind === 'login' ? 'current-password' : 'new-password'} placeholder="Enter password" data-testid="input-auth-password" required minLength={8} /></div>}
      {message && <div className="callout" style={{ marginBottom: 15 }} role="status">{message}</div>}
      <button className="button button-primary" style={{ width: '100%' }} disabled={busy} data-testid="button-auth-submit">{busy ? 'Please wait…' : submitLabel}<ArrowRight /></button>
      {kind === 'login' && <p style={{ textAlign: 'right', marginTop: 12, fontSize: 11 }}><Link href="/forgot-password" data-testid="link-forgot-password">Forgot password?</Link></p>}
      <div className="auth-footer"><Notice>Provider-neutral preview. No password is sent or stored; login, account creation and recovery are not connected.</Notice><p style={{ marginTop: 17 }}>{kind === 'signup' ? 'Already have an account?' : 'New to RADIX?'} <Link href={kind === 'signup' ? '/login' : '/signup'} style={{ color: 'hsl(var(--primary))', fontWeight: 700 }} data-testid="link-auth-switch">{kind === 'signup' ? 'Log in' : 'Create an account'}</Link></p></div>
    </form></main></div>;
}

function Dashboard() {
  return <><PageHeading eyebrow="Your workspace" title="Good work starts with a clear picture." copy="Build your profile at your own pace, then explore roles and career context when you’re ready." />
    <div className="dashboard-grid">
      <div>
        <section className="card card-pad" style={{ background: 'linear-gradient(118deg,#eaf1f1 0%,hsl(var(--card)) 70%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><div><div className="eyebrow">A good place to begin</div><h2 className="card-title" style={{ fontSize: 21 }}>Create your professional profile</h2><p className="card-copy" style={{ maxWidth: 490 }}>Add the experience you want to carry forward. You can build it by hand; resume parsing is not connected yet.</p></div><div className="empty-icon" style={{ flex: '0 0 auto' }}><UserRound /></div></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 17 }}><Link href="/app/profile/new" className="button button-primary" data-testid="link-dashboard-new-profile">Start a profile <ArrowRight /></Link><Link href="/app/resume" className="button button-outline" data-testid="link-dashboard-resume">Resume options</Link></div>
        </section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', margin: '30px 0 13px' }}><div><div className="eyebrow">Explore independently</div><h2 className="card-title" style={{ fontSize: 19, marginBottom: 0 }}>Choose what you need today</h2></div></div>
        <div className="grid grid-two">
          {[{ title: 'Analyze a job description', text: 'Upload a PDF or DOCX and review extracted role skills.', icon: FileSearch, href: '/app/jds/new', test: 'link-dashboard-jd' }, { title: 'Talent Check', text: 'Company readiness interface; API contract is pending.', icon: Target, href: '/app/talent-check', test: 'link-dashboard-talent' }, { title: 'Skill matching', text: 'Compare a saved profile with a saved job description.', icon: HeartHandshake, href: '/app/skill-matching', test: 'link-dashboard-matching' }, { title: 'Resume parsing', text: 'Role 2 currently has no browser upload endpoint.', icon: CloudUpload, href: '/app/resume', test: 'link-dashboard-upload-resume' }].map(({ title, text, icon: Icon, href, test }) => <Link href={href} className="card card-pad" key={title} data-testid={test} style={{ display: 'block', transition: 'transform .15s' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="empty-icon"><Icon /></div><ArrowUpRight size={16} color="#8995a4" /></div><h3 className="card-title" style={{ marginTop: 15 }}>{title}</h3><p className="card-copy" style={{ marginBottom: 0 }}>{text}</p></Link>)}
        </div>
      </div>
      <aside>
        <section className="card card-pad"><div className="eyebrow">Profile completeness</div><div className="metric-value" style={{ color: 'hsl(var(--muted-foreground))' }}>—</div><div className="progress-track" style={{ margin: '14px 0' }}><span style={{ width: 0 }} /></div><p className="card-copy" style={{ marginBottom: 0 }}>No profile data yet. A completeness value appears only when returned by the Profile Builder service.</p></section>
        <section className="card card-pad" style={{ marginTop: 16 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}><Activity size={17} color="#548d87" /><h3 className="card-title" style={{ margin: 0 }}>Recent activity</h3></div><EmptyState icon={ClipboardList} title="Nothing here yet" copy="Saved profiles, analyzed jobs and matching results will appear here when connected services return them." /></section>
      </aside>
    </div>
    <div style={{ marginTop: 18 }}><Notice>Live service data is not connected in this workspace. No profile, activity or scores are being assumed.</Notice></div>
  </>;
}

const wizardSteps = ['Personal details', 'Education', 'Skills', 'Projects & experience', 'Certifications & roles', 'Review'];
const skillCategories = ['COD', 'DSA', 'OOD', 'APTI', 'COMM', 'AI', 'CLOUD', 'SQL', 'SWE', 'SYSD', 'NETW', 'OS', 'OTHER'];
function ProfileWizard({ edit = false }: { edit?: boolean }) {
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [skills, setSkills] = useState([{ name: '', category: 'COD', evidence: '', confidence: 'medium' }]);
  function addSkill() { setSkills([...skills, { name: '', category: 'COD', evidence: '', confidence: 'medium' }]); }
  function updateSkill(i: number, key: string, value: string) { setSkills(skills.map((skill, index) => index === i ? { ...skill, [key]: value } : skill)); }
  return <><PageHeading eyebrow={edit ? 'Profile editor' : 'Profile builder'} title={edit ? 'Edit your profile' : 'Build a profile that feels like you.'} copy="A guided, editable workspace for your professional story. Save is disabled until the Profile Builder data contract is confirmed." />
    <Notice>Draft changes live only in this browser session. No information is saved or sent. Profile mutations are paused until the backend model is confirmed.</Notice>
    <div style={{ height: 18 }} />
    <div className="stepper" role="list" aria-label="Profile creation steps">{wizardSteps.map((label, index) => <div className={`step ${step === index ? 'active' : ''} ${index < step ? 'done' : ''}`} key={label} role="listitem" aria-current={step === index ? 'step' : undefined}><span className="step-num">{index < step ? <Check size={14} /> : index + 1}</span><span>{label}</span></div>)}</div>
    <section className="card card-pad">
      {step === 0 && <><h2 className="card-title">Personal details</h2><p className="card-copy" style={{ marginBottom: 20 }}>Share the contact and introduction you want included in your profile.</p><div className="form-grid"><Field label="Display name" placeholder="How should we refer to you?" test="input-profile-display-name" /><Field label="Email" placeholder="you@example.com" type="email" test="input-profile-email" /><Field label="Location" placeholder="City, country" test="input-profile-location" /><Field label="LinkedIn or portfolio" placeholder="https://" test="input-profile-link" /><Field label="Professional summary" placeholder="A short introduction to your experience and interests" textarea full test="input-profile-summary" /><div className="field"><label htmlFor="career-stage">Career stage</label><select id="career-stage" data-testid="select-career-stage"><option>Choose a stage</option><option>Student</option><option>Early career</option><option>Experienced professional</option><option>Career change</option></select></div></div></>}
      {step === 1 && <><h2 className="card-title">Education</h2><p className="card-copy" style={{ marginBottom: 20 }}>Add formal study, training or coursework that matters to your goals. This section is optional.</p><div className="form-grid"><Field label="Institution" placeholder="University or school" test="input-education-institution" /><Field label="Degree or program" placeholder="Degree, diploma, or course" test="input-education-degree" /><Field label="Field of study" placeholder="e.g. Computer Science" test="input-education-field" /><Field label="Graduation year" placeholder="Year or expected year" test="input-education-year" /><Field label="Additional context" placeholder="Relevant coursework, honors, or focus" textarea full test="input-education-context" /></div><div style={{ marginTop: 16 }}><button className="button button-outline" type="button" onClick={() => setNotice('Education section ready for another entry.')} data-testid="button-add-education"><Plus /> Add another education entry</button></div></>}
      {step === 2 && <><h2 className="card-title">Skills & evidence</h2><p className="card-copy" style={{ marginBottom: 20 }}>Confidence reflects how certain a skill is represented—not your proficiency level.</p>{skills.map((skill, i) => <div className="skill-edit-row" key={i}><div className="form-grid"><Field label="Skill name" placeholder="e.g. Python" value={skill.name} onChange={v => updateSkill(i, 'name', v)} test={`input-skill-name-${i}`} /><div className="field"><label htmlFor={`skill-category-${i}`}>Category</label><select id={`skill-category-${i}`} value={skill.category} onChange={e => updateSkill(i, 'category', e.target.value)} data-testid={`select-skill-category-${i}`}>{skillCategories.map(cat => <option key={cat}>{cat}</option>)}</select></div><Field label="Evidence" placeholder="A project, result, or example" value={skill.evidence} onChange={v => updateSkill(i, 'evidence', v)} textarea full test={`input-skill-evidence-${i}`} /><div className="field"><label htmlFor={`skill-confidence-${i}`}>Confidence in this evidence</label><select id={`skill-confidence-${i}`} value={skill.confidence} onChange={e => updateSkill(i, 'confidence', e.target.value)} data-testid={`select-skill-confidence-${i}`}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div>{skills.length > 1 && <button className="button button-quiet" onClick={() => setSkills(skills.filter((_, index) => index !== i))} data-testid={`button-remove-skill-${i}`}><Trash2 size={14} /> Remove skill</button>}</div>)}<button className="button button-outline" onClick={addSkill} data-testid="button-add-skill"><Plus /> Add a skill</button></>}
      {step === 3 && <><h2 className="card-title">Projects & experience</h2><p className="card-copy" style={{ marginBottom: 20 }}>Projects, employment, internships and hackathons are optional. Add what best demonstrates your work.</p><div className="form-grid"><Field label="Project or role title" placeholder="Title" test="input-work-title" /><Field label="Type" select options={['Project', 'Employment', 'Internship', 'Hackathon', 'Volunteer work']} test="select-work-type" /><Field label="Organization" placeholder="Organization or client" test="input-work-organization" /><Field label="Dates" placeholder="e.g. 2023 – 2024" test="input-work-dates" /><Field label="What did you do?" placeholder="Describe your contribution and outcome" textarea full test="input-work-description" /><Field label="Tools or skills used" placeholder="Separate items with commas" full test="input-work-skills" /></div><div style={{ marginTop: 17 }}><button className="button button-outline" onClick={() => setNotice('A new repeatable experience entry can be added in the live profile contract.')} data-testid="button-add-experience"><Plus /> Add another experience</button></div></>}
      {step === 4 && <><h2 className="card-title">Certifications & preferred roles</h2><p className="card-copy" style={{ marginBottom: 20 }}>Both sections are optional. Include only details that are relevant to your goals.</p><div className="form-grid"><Field label="Certification" placeholder="Certification name" test="input-certification" /><Field label="Issuing organization" placeholder="Organization" test="input-certification-org" /><Field label="Issue date" placeholder="Month and year" test="input-certification-date" /><Field label="Credential link" placeholder="https://" test="input-certification-link" /><Field label="Preferred roles" placeholder="e.g. Product analyst, Data engineer" textarea full test="input-preferred-roles" /><Field label="Preferred locations or work style" placeholder="Remote, hybrid, locations…" full test="input-preferences" /></div></>}
      {step === 5 && <><h2 className="card-title">Review your profile draft</h2><p className="card-copy">A final check before the Profile Builder API is ready to accept profile data.</p><div className="divider" /><div className="list-row"><div><div className="row-title">Personal details</div><div className="row-caption">Name, contact and summary</div></div><button className="button button-quiet" onClick={() => setStep(0)} data-testid="button-review-personal">Edit <ArrowRight size={13} /></button></div><div className="list-row"><div><div className="row-title">Education and experience</div><div className="row-caption">Optional sections remain editable</div></div><button className="button button-quiet" onClick={() => setStep(1)} data-testid="button-review-education">Edit <ArrowRight size={13} /></button></div><div className="list-row"><div><div className="row-title">Skills</div><div className="row-caption">{skills.filter(s => s.name.trim()).length} skill entries in this local draft</div></div><button className="button button-quiet" onClick={() => setStep(2)} data-testid="button-review-skills">Edit <ArrowRight size={13} /></button></div><div className="divider" /><Notice>Save is unavailable. We will not claim this profile was stored until the documented Role 3 request and response models are confirmed.</Notice><button className="button button-primary" style={{ marginTop: 17 }} disabled data-testid="button-save-profile"><LockKeyhole /> Save profile · contract pending</button></>}
      {notice && <p role="status" className="card-copy" style={{ marginTop: 14 }}>{notice}</p>}
      <div className="wizard-footer"><button className="button button-outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="button-wizard-back"><ArrowLeft /> Back</button>{step < 5 && <button className="button button-primary" onClick={() => setStep(Math.min(5, step + 1))} data-testid="button-wizard-next">Continue <ArrowRight /></button>}</div>
    </section>
  </>;
}

function Field({ label, placeholder, type = 'text', textarea = false, full = false, test, value, onChange, select = false, options }: { label: string; placeholder?: string; type?: string; textarea?: boolean; full?: boolean; test: string; value?: string; onChange?: (value: string) => void; select?: boolean; options?: string[] }) {
  const [local, setLocal] = useState('');
  const val = value ?? local;
  const change = (next: string) => { if (onChange) onChange(next); else setLocal(next); };
  return <div className={`field ${full ? 'full' : ''}`}><label htmlFor={test}>{label}</label>{textarea ? <textarea id={test} value={val} onChange={e => change(e.target.value)} placeholder={placeholder} data-testid={test} /> : select ? <select id={test} value={val} onChange={e => change(e.target.value)} data-testid={test}><option value="">Choose one</option>{options?.map(option => <option key={option}>{option}</option>)}</select> : <input id={test} type={type} value={val} onChange={e => change(e.target.value)} placeholder={placeholder} data-testid={test} />}</div>;
}

function ProfileOverview() {
  return <><PageHeading eyebrow="My profile" title="Your professional story, in one place." copy="Review and update the information you choose to share. Profile details and completeness appear only after a confirmed service response." action={<Link href="/app/profile/new" className="button button-primary" data-testid="link-profile-create"><Plus /> Create profile</Link>} />
    <Notice>Profile Builder is not connected. We do not have a saved profile to display.</Notice><div style={{ height: 20 }} />
    <div className="grid grid-two"><section className="card"><EmptyState icon={UserRound} title="No profile loaded" copy="Create a local draft or connect a profile service. Nothing here is fabricated." action={<Link className="button button-primary" href="/app/profile/new" data-testid="link-profile-start">Start profile draft <ArrowRight /></Link>} /></section><section className="card card-pad"><div className="eyebrow">Completeness</div><div className="metric-value">—</div><p className="card-copy">The Profile Builder completeness endpoint supplies this value. RADIX does not calculate a substitute.</p><div className="divider" /><Link href="/app/profile/edit" className="button button-outline" data-testid="link-profile-edit"><UserRound /> Edit profile</Link></section></div>
  </>;
}

function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  return <><PageHeading eyebrow="Resume" title="Bring a resume into your workflow." copy="Role 2 currently runs as a command-line file workflow. The browser parser is not connected, so selecting a file here does not upload or parse it." />
    <Notice>{resumeParsingClient.message}</Notice><div style={{ height: 20 }} />
    <section className="card card-pad"><div className="dropzone"><div className="empty-icon"><CloudUpload /></div><h2 className="card-title">Choose a resume to review locally</h2><p className="card-copy">This selection stays in your browser. PDF or DOCX preview only; no upload or parsing occurs.</p><label className="button button-outline" htmlFor="resume-file" style={{ cursor: 'pointer' }} data-testid="button-resume-select"><Plus /> Choose file</label><input id="resume-file" type="file" accept=".pdf,.docx" onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} data-testid="input-resume-file" /></div>
      {error && <div className="callout error" style={{ marginTop: 14 }} role="alert">{error}</div>}
      {file && <div className="list-row" style={{ marginTop: 14 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><FileText color="#5b8581" /><div><div className="row-title">{file.name}</div><div className="row-caption">{(file.size / 1024 / 1024).toFixed(2)} MB · selected locally only</div></div></div><button className="icon-button" aria-label="Remove selected resume" onClick={() => setFile(null)} data-testid="button-resume-remove"><X /></button></div>}
      <div className="divider" /><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button className="button button-primary" disabled data-testid="button-resume-parse"><LockKeyhole /> Parser API not connected</button><Link href="/app/profile/new" className="button button-outline" data-testid="link-resume-manual-profile">Continue with manual profile <ArrowRight /></Link></div>
      <div className="divider" /><h3 className="card-title">What happens next</h3><p className="card-copy">When the parser API and ResumeExtract schema are supplied, extracted fields can be reviewed and mapped into your editable profile. Missing fields will remain blank rather than being inferred.</p>
    </section>
  </>;
}

function JDLibrary() {
  const [jds, setJds] = useState<JDAnalysis[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'offline'>('idle');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
  async function load() { setState('loading'); try { const response = await jdAnalyticsClient.list(); setJds(response.data); setState('idle'); setError(''); } catch (e) { setState('error'); setError(e instanceof Error ? e.message : 'Unable to load job descriptions.'); } }
  useEffect(() => { if (import.meta.env.VITE_JD_API_BASE_URL) void load(); }, []);
  async function search(e: FormEvent) { e.preventDefault(); if (!query.trim()) return; setSearching(true); setSearchMessage(''); setSearchResults(null); try { const response = await jdAnalyticsClient.search(query.trim()); if (!Array.isArray(response.data)) throw new Error('Role 1 returned an unexpected search result.'); setSearchResults(response.data); setSearchMessage(response.data.length ? `${response.data.length} semantic search result${response.data.length === 1 ? '' : 's'} returned by Role 1.` : 'No saved job descriptions matched that search.'); } catch (e) { setSearchMessage(e instanceof Error ? e.message : 'Search unavailable.'); } finally { setSearching(false); } }
  return <><PageHeading eyebrow="JD analytics" title="Job descriptions, without the guesswork." copy="Keep role analyses together and review the skills extracted from each document." action={<Link href="/app/jds/new" className="button button-primary" data-testid="link-jd-new"><Plus /> Analyze a JD</Link>} />
    {!import.meta.env.VITE_JD_API_BASE_URL && <Notice>JD Analytics is not connected. Set VITE_JD_API_BASE_URL to enable the documented Role 1 service.</Notice>}
    {import.meta.env.VITE_JD_API_BASE_URL && <><form onSubmit={search} className="search-row"><label className="search-field"><Search size={16} /><input aria-label="Search saved job descriptions" placeholder="Search saved job descriptions" value={query} onChange={e => setQuery(e.target.value)} data-testid="input-jd-search" /></label><button className="button button-outline" disabled={searching} data-testid="button-jd-search">{searching ? 'Searching…' : 'Search'}</button>{searchMessage && <span role="status" className="card-copy">{searchMessage}</span>}</form>{searchResults && searchResults.length > 0 && <section className="card card-pad" style={{ marginTop: 12 }} aria-label="Semantic search results"><div className="eyebrow">Semantic search results · not new analyses</div>{searchResults.map((item, index) => { const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}; const title = typeof row.role === 'string' ? row.role : typeof row.source_file === 'string' ? row.source_file : 'Search result'; const company = typeof row.company === 'string' ? row.company : ''; const id = typeof row.jd_id === 'string' ? row.jd_id : ''; return <div className="list-row" key={`${id || 'result'}-${index}`}><div><div className="row-title">{title}{company ? ` · ${company}` : ''}</div><div className="row-caption">{id || renderServiceValue(item)}</div></div>{id && <Link href={`/app/jds/${encodeURIComponent(id)}`} className="button button-quiet" data-testid={`link-search-jd-${index}`}>Open saved analysis <ArrowRight /></Link>}</div>; })}</section>}</>}
    <section className="card" style={{ marginTop: 18 }}>{state === 'loading' ? <div className="card-pad" aria-label="Loading job descriptions"><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line short" /></div> : state === 'error' ? <div className="card-pad"><Notice kind="error">{error}</Notice><button className="button button-outline" onClick={() => void load()} style={{ marginTop: 14 }} data-testid="button-jds-retry">Retry</button></div> : jds.length ? <div className="card-pad">{jds.map(jd => <div className="list-row" key={jd.jd_id}><div><div className="row-title">{jd.role || 'Untitled role'} · {jd.company || 'Company not specified'}</div><div className="row-caption">{jd.source_file} · {jd.jd_id}</div></div><Link href={`/app/jds/${encodeURIComponent(jd.jd_id)}`} className="button button-quiet" data-testid={`link-jd-${jd.jd_id}`}>View analysis <ArrowRight /></Link></div>)}</div> : <EmptyState icon={FileSearch} title="No analyzed roles yet" copy={import.meta.env.VITE_JD_API_BASE_URL ? 'Analyze a job description to see saved results here.' : 'When Role 1 is connected, your saved analyses will appear here. You can still explore the upload flow.'} action={<Link href="/app/jds/new" className="button button-primary" data-testid="link-jd-empty-upload">Analyze a JD <ArrowRight /></Link>} />}</section>
  </>;
}

function JDUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState<JDAnalysis | null>(null);
  function selectFile(f?: File) { setErr(''); setStatus(''); setSaved(null); if (!f) { setFile(null); return; } const ext = f.name.toLowerCase().split('.').pop(); if (!['pdf', 'docx'].includes(ext || '')) { setErr('Unsupported file type. Choose a PDF or DOCX file.'); setFile(null); return; } if (f.size > 10 * 1024 * 1024) { setErr('This file exceeds the documented 10 MB limit. Choose a smaller file.'); setFile(null); return; } setFile(f); }
  async function analyze() { if (!file) return; setBusy(true); setErr(''); setStatus('Uploading to JD Analytics…'); try { const result = await jdAnalyticsClient.analyze(file); setSaved(result.data); const indexed = result.headers.get('X-Indexing-Status'); setStatus(indexed && indexed.toLowerCase() !== 'success' ? 'Analysis saved; semantic search unavailable.' : 'Analysis saved by the Role 1 service.'); } catch (e) { setErr(e instanceof Error ? e.message : 'Analysis could not be completed.'); setStatus(''); } finally { setBusy(false); } }
  return <><PageHeading eyebrow="JD analytics / New analysis" title="Analyze a job description." copy="Upload a PDF or DOCX. Role 1 extracts role information and skills; scanned image-only PDFs are not supported." />
    {!import.meta.env.VITE_JD_API_BASE_URL && <Notice>JD Analytics is offline in this workspace. A file will not be uploaded until VITE_JD_API_BASE_URL is configured.</Notice>}
    <div style={{ height: 18 }} /><section className="card card-pad"><div className="dropzone"><div className="empty-icon"><FileSearch /></div><h2 className="card-title">Drop a role description here</h2><p className="card-copy">PDF or DOCX · up to 10 MB · no OCR for scanned PDFs</p><label htmlFor="jd-file" className="button button-outline" style={{ cursor: 'pointer' }} data-testid="button-jd-select">Choose document</label><input id="jd-file" type="file" accept=".pdf,.docx" onChange={e => selectFile(e.target.files?.[0])} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} data-testid="input-jd-file" /></div>
      {file && <div className="list-row" style={{ marginTop: 15 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><FileText color="#548d87" /><div><div className="row-title">{file.name}</div><div className="row-caption">{(file.size / 1024 / 1024).toFixed(2)} MB</div></div></div><button className="button button-quiet" onClick={() => setFile(null)} data-testid="button-jd-remove"><X /> Remove</button></div>}
      {err && <div className="callout error" role="alert" style={{ marginTop: 14 }}>{err}<button className="button button-quiet" onClick={() => void analyze()} data-testid="button-jd-retry">Retry</button></div>}
      {status && <div className="callout" style={{ marginTop: 14 }} role="status">{status}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 22 }}><Link href="/app/jds" className="button button-outline" data-testid="link-jd-cancel"><ArrowLeft /> Back to library</Link><button className="button button-primary" onClick={() => void analyze()} disabled={!file || busy || !import.meta.env.VITE_JD_API_BASE_URL} data-testid="button-jd-analyze">{busy ? 'Analyzing…' : 'Analyze document'} <ArrowRight /></button></div>
      {saved && <div className="callout" style={{ marginTop: 18 }}><CheckCircle2 /><div>Saved analysis for <strong>{saved.role || 'role'}</strong>{saved.company ? ` at ${saved.company}` : ''}. <Link href={`/app/jds/${saved.jd_id}`} style={{ textDecoration: 'underline', fontWeight: 700 }} data-testid="link-jd-saved-result">Review analysis</Link></div></div>}
    </section>
  </>;
}

function JDDetail({ id }: { id?: string }) {
  const [, setLocation] = useLocation();
  const [jd, setJd] = useState<JDAnalysis | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (!id || !import.meta.env.VITE_JD_API_BASE_URL) { setState('error'); setError('JD Analytics is not connected or the analysis ID is missing.'); return; } setState('loading'); Promise.all([jdAnalyticsClient.get(id), jdAnalyticsClient.skills(id)]).then(([data, list]) => { setJd(data.data); setSkills(list.data); setState('ready'); }).catch(e => { setState('error'); setError(e instanceof Error ? e.message : 'Analysis could not be loaded.'); }); }, [id]);
  async function saveSkills() { if (!id) return; setSaved('Saving corrections…'); try { await jdAnalyticsClient.updateSkills(id, skills); setSaved('Skill corrections saved by Role 1.'); } catch (e) { setSaved(e instanceof Error ? e.message : 'Changes were not saved.'); } }
  async function deleteAnalysis() { if (!id || !window.confirm('Delete this saved job analysis and its indexed content? This cannot be undone.')) return; setDeleting(true); setDeleteError(''); try { await jdAnalyticsClient.remove(id); setLocation('/app/jds'); } catch (e) { setDeleteError(e instanceof Error ? e.message : 'The job analysis was not deleted.'); } finally { setDeleting(false); } }
  function editSkill(i: number, key: keyof Skill, value: string) { setSkills(skills.map((s, n) => n === i ? { ...s, [key]: value } : s)); }
  return <><PageHeading eyebrow="JD analytics / Analysis" title={jd?.role || 'Role analysis'} copy={jd ? `${jd.company || 'Company not specified'} · ${jd.source_file} · ${jd.jd_id}` : 'Review role requirements extracted by the JD Analytics service.'} action={<div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}><Link href="/app/skill-matching" className="button button-primary" data-testid="link-jd-match">Use in skill matching <ArrowRight /></Link>{state === 'ready' && <button className="button button-outline" onClick={() => void deleteAnalysis()} disabled={deleting} data-testid="button-jd-delete"><Trash2 /> {deleting ? 'Deleting…' : 'Delete analysis'}</button>}</div>} />
    {state === 'loading' && <section className="card card-pad" aria-label="Loading analysis"><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line short" /></section>}
    {state === 'error' && <section className="card card-pad"><Notice kind="error">{error}</Notice><Link href="/app/jds" className="button button-outline" style={{ marginTop: 14 }} data-testid="link-jd-detail-back">Back to library</Link></section>}
    {deleteError && <div className="callout error" role="alert" style={{ marginBottom: 14 }} data-testid="status-jd-delete-error">{deleteError}</div>}
    {state === 'ready' && <section className="card card-pad"><div className="eyebrow">Extracted skills · editable review</div><p className="card-copy">Review the service-provided skill names, category, evidence and confidence. Confidence is not proficiency.</p>{skills.map((s, i) => <div className="form-grid skill-edit-row" key={`${s.skill_name}-${i}`}><Field label="Skill name" value={s.skill_name} onChange={v => editSkill(i, 'skill_name', v)} test={`input-jd-skill-name-${i}`} /><div className="field"><label htmlFor={`jd-category-${i}`}>Category</label><select id={`jd-category-${i}`} value={s.category_code} onChange={e => editSkill(i, 'category_code', e.target.value)} data-testid={`select-jd-category-${i}`}>{skillCategories.map(c => <option key={c}>{c}</option>)}</select></div><Field label="Evidence" value={s.evidence || ''} onChange={v => editSkill(i, 'evidence', v)} test={`input-jd-skill-evidence-${i}`} /><div className="field"><label htmlFor={`jd-confidence-${i}`}>Confidence</label><select id={`jd-confidence-${i}`} value={s.confidence} onChange={e => editSkill(i, 'confidence', e.target.value)} data-testid={`select-jd-confidence-${i}`}><option>high</option><option>medium</option><option>low</option></select></div></div>)}<div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}><button className="button button-outline" onClick={() => setSkills([...skills, { skill_name: '', category_code: 'OTHER', evidence: '', confidence: 'low' }])} data-testid="button-jd-add-skill"><Plus /> Add skill</button><button className="button button-primary" onClick={() => void saveSkills()} data-testid="button-jd-save-skills">Save skill corrections</button></div>{saved && <p role="status" className="card-copy" style={{ marginTop: 12 }}>{saved}</p>}</section>}
  </>;
}

function TalentCheck() {
  const [company, setCompany] = useState('');
  const [profile, setProfile] = useState('');
  return <><PageHeading eyebrow="Talent Check" title="Explore company readiness." copy="A guided assessment interface for comparing evidence with company benchmarks. Readiness results are not a job match or hiring verdict." />
    <Notice>{talentCheckClient.message}</Notice><div style={{ height: 18 }} /><section className="card card-pad"><div className="form-grid"><Field label="Company" placeholder="Search or enter a company" value={company} onChange={setCompany} test="input-talent-company" /><Field label="Saved candidate profile" placeholder="No saved profile available" value={profile} onChange={setProfile} test="input-talent-profile" /></div><p className="card-copy" style={{ marginTop: 15 }}>The live service contract is pending. Company catalog, readiness score, category levels and prioritized actions will be shown only when returned by Role 4.</p><button className="button button-primary" disabled style={{ marginTop: 12 }} data-testid="button-talent-assess"><LockKeyhole /> Assessment unavailable</button></section>
    <section className="grid grid-three" style={{ marginTop: 17 }}>{['Evidence-based skill levels', 'Category-level gaps', 'Prioritized actions'].map((title, i) => <div className="card card-pad" key={title}><div className="metric-label">Assessment area 0{i + 1}</div><h3 className="card-title" style={{ marginTop: 13 }}>{title}</h3><p className="card-copy" style={{ marginBottom: 0 }}>Result details will be provided by the service, not calculated in this interface.</p></div>)}</section>
  </>;
}

type MatchBundle = {
  result: MatchResult;
  actions: ImprovementAction[];
  planWarning?: string;
  candidateName: string;
  job: JDAnalysis;
};
const matchBundleKey = 'radix-match-results';

function readMatchBundle(): MatchBundle | null {
  try {
    const value = sessionStorage.getItem(matchBundleKey);
    return value ? JSON.parse(value) as MatchBundle : null;
  } catch {
    return null;
  }
}

function renderServiceValue(value: unknown, empty = 'No evidence provided') {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try { return JSON.stringify(value); } catch { return empty; }
}

function MatchSkillRow({ skill, status }: { skill: MatchSkill; status: string }) {
  const name = skill.skill_name || renderServiceValue(skill.candidate_skill, 'Unnamed skill');
  return <details className="card card-pad" style={{ marginTop: 10 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>{name}</span><span className="status-pill">{status}</span>{skill.critical_gap === true && <span className="status-pill" aria-label="Critical gap">Critical gap</span>}
    </summary>
    <dl className="match-detail-list">
      <div><dt>Rationale</dt><dd>{renderServiceValue(skill.rationale)}</dd></div>
      <div><dt>Job evidence</dt><dd>{renderServiceValue(skill.jd_evidence)}</dd></div>
      <div><dt>Candidate evidence</dt><dd>{renderServiceValue(skill.candidate_evidence)}</dd></div>
      {skill.category_code && <div><dt>Category</dt><dd>{skill.category_code}</dd></div>}
      {skill.candidate_skill && <div><dt>Candidate skill</dt><dd>{renderServiceValue(skill.candidate_skill)}</dd></div>}
    </dl>
  </details>;
}

function MatchingSelect() {
  const [location, setLocation] = useLocation();
  const [profileId, setProfileId] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jdId, setJdId] = useState('');
  const [jds, setJds] = useState<JDAnalysis[]>([]);
  const [jdState, setJdState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [profileBusy, setProfileBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const profileContractConfirmed = import.meta.env.VITE_PROFILE_CONTRACT_CONFIRMED === 'true';

  async function loadJds() {
    if (!jdAnalyticsClient.baseUrl) return;
    setJdState('loading');
    try {
      const response = await jdAnalyticsClient.list();
      if (!Array.isArray(response.data)) throw new Error('Role 1 returned an unexpected job-description list.');
      setJds(response.data);
      setJdState('idle');
      setError('');
    } catch (e) {
      setJdState('error');
      setError(e instanceof Error ? e.message : 'Saved job descriptions could not be loaded.');
    }
  }

  useEffect(() => {
    if (jdAnalyticsClient.baseUrl) void loadJds();
  }, []);

  async function loadProfile() {
    setError('');
    setMessage('');
    if (!profileContractConfirmed) {
      setError('Profile lookup is paused until the Role 3 request and response models are confirmed. Set VITE_PROFILE_CONTRACT_CONFIRMED only after reviewing those models.');
      return;
    }
    if (!profileBuilderClient.baseUrl || !profileId.trim()) {
      setError('Enter a saved Profile Builder profile ID and configure its service URL.');
      return;
    }
    setProfileBusy(true);
    setProfile(null);
    try {
      const response = await profileBuilderClient.get(profileId.trim());
      if (!response.data || !response.data.profile_id || !Array.isArray(response.data.skills)) {
        throw new Error('Role 3 returned a profile without the required profile_id and skills fields.');
      }
      setProfile(response.data);
      setMessage(`Loaded ${response.data.display_name || response.data.profile_id}. Only its skills will be sent to Role 5.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The saved profile could not be loaded.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function run() {
    setError('');
    setMessage('');
    if (!skillMatchingClient.baseUrl) {
      setError('Skill Matching is not connected. Configure VITE_SKILL_MATCH_API_BASE_URL and retry.');
      return;
    }
    if (!profileContractConfirmed) {
      setError('The Role 3 profile schema must be confirmed before profile skills can be sent to Role 5.');
      return;
    }
    if (!profile || !jdId) {
      setError('Load a saved profile and select an analyzed job description to continue.');
      return;
    }
    setBusy(true);
    setMessage('Loading the saved job description…');
    try {
      const [jobResponse, skillsResponse] = await Promise.all([
        jdAnalyticsClient.get(jdId),
        jdAnalyticsClient.skills(jdId),
      ]);
      const job: JDAnalysis = { ...jobResponse.data, skills: skillsResponse.data };
      const candidateSkills = profile.skills.map(skill => ({
        skill_name: skill.skill_name,
        category_code: skill.category_code,
        evidence: skill.evidence,
        confidence: skill.confidence,
      }));
      const payload: MatchRequest = {
        candidate: { skills: candidateSkills },
        job_description: job,
        talent_check: null,
      };
      setMessage('Comparing skills and preparing an improvement plan…');
      const [matchResponse, planResponse] = await Promise.allSettled([
        skillMatchingClient.match(payload),
        skillMatchingClient.improvementPlan({ ...payload, use_llm: false }),
      ]);
      if (matchResponse.status === 'rejected') throw matchResponse.reason;
      const bundle: MatchBundle = {
        result: matchResponse.value.data,
        actions: planResponse.status === 'fulfilled'
          ? planResponse.value.data.actions
          : matchResponse.value.data.improvement_plan?.actions ?? [],
        planWarning: planResponse.status === 'rejected'
          ? 'The match completed, but the improvement plan could not be loaded.'
          : undefined,
        candidateName: profile.display_name || profile.profile_id,
        job,
      };
      sessionStorage.setItem(matchBundleKey, JSON.stringify(bundle));
      setLocation('/app/skill-matching/results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The comparison could not be completed.');
      setMessage('');
    } finally {
      setBusy(false);
    }
  }

  return <><PageHeading eyebrow="Skill matching" title="Compare a profile with a role." copy="Review an estimate based on service-returned skill evidence. This is decision support—not a hiring decision." />
    {!skillMatchingClient.baseUrl && <Notice>Skill Matching is not connected. Set VITE_SKILL_MATCH_API_BASE_URL to enable the documented Role 5 service.</Notice>}
    {!jdAnalyticsClient.baseUrl && <div style={{ marginTop: 12 }}><Notice>JD Analytics is not connected. Configure Role 1 to load saved job descriptions.</Notice></div>}
    {!profileBuilderClient.baseUrl && <div style={{ marginTop: 12 }}><Notice>Profile Builder is not connected. Configure Role 3 to load a saved profile.</Notice></div>}
    <div style={{ height: 18 }} /><section className="card card-pad"><div className="form-grid">
      <div className="field"><label htmlFor="match-profile-id">Saved profile ID</label><div className="search-row"><input id="match-profile-id" value={profileId} onChange={e => { setProfileId(e.target.value); setProfile(null); setMessage(''); }} placeholder="Enter a Profile Builder profile ID" autoComplete="off" data-testid="input-match-profile-id" /><button className="button button-outline" onClick={() => void loadProfile()} disabled={profileBusy || !profileBuilderClient.baseUrl || !profileContractConfirmed} data-testid="button-load-profile">{profileBusy ? 'Loading…' : 'Load profile'}</button></div><small>{profileContractConfirmed ? 'Role 3 does not document a profile list endpoint; enter the ID returned by the service.' : 'Profile lookup is paused until the Role 3 data model is confirmed.'}</small>{profile && <div role="status" className="status-pill teal" style={{ marginTop: 9 }}>Loaded: {profile.display_name || profile.profile_id}</div>}</div>
      <div className="field"><label htmlFor="match-jd">Job description</label><select id="match-jd" value={jdId} onChange={e => setJdId(e.target.value)} disabled={jdState === 'loading' || !jds.length} data-testid="select-match-jd"><option value="">{jdState === 'loading' ? 'Loading saved analyses…' : jds.length ? 'Choose a saved analysis' : 'No saved job analyses available'}</option>{jds.map(item => <option key={item.jd_id} value={item.jd_id}>{item.role || 'Untitled role'} · {item.company || item.source_file}</option>)}</select><small>Choose a saved Role 1 analysis. {jdState === 'error' && <button type="button" className="button button-quiet" onClick={() => void loadJds()} data-testid="button-retry-match-jds">Retry loading</button>}</small></div>
    </div><div className="divider" /><div className="callout"><ShieldCheck /><span>Only profile skills are sent to Role 5—never email or other personal fields. Match scores are not recomputed in the browser.</span></div>
      <button className="button button-primary" onClick={() => void run()} disabled={busy || !skillMatchingClient.baseUrl || !profileContractConfirmed || !profile || !jdId} style={{ marginTop: 18 }} data-testid="button-run-match"><HeartHandshake /> {busy ? 'Comparing…' : 'Compare skills'}</button>
      {message && <p role="status" className="card-copy" style={{ marginTop: 14 }} data-testid="status-match-progress">{message}</p>}
      {error && <div className="callout error" role="alert" style={{ marginTop: 14 }} data-testid="status-match-error">{error}{skillMatchingClient.baseUrl && profile && jdId && <button className="button button-quiet" onClick={() => void run()} data-testid="button-retry-match">Retry</button>}</div>}
    </section>
    <div style={{ marginTop: 17 }}><Notice>Role 3 profile retrieval and saving remain gated until its actual request and response models are reviewed. No profile IDs or records are invented.</Notice></div>
  </>;
}

function MatchingResults() {
  const [bundle] = useState<MatchBundle | null>(readMatchBundle);
  if (!bundle) return <><PageHeading eyebrow="Skill matching / Results" title="Your comparison will appear here." copy="Match score, service explanation, skill statuses and improvement actions are shown only after Role 5 returns them." /><section className="card card-pad"><EmptyState icon={HeartHandshake} title="No match result" copy="Run a comparison from Skill Matching after loading a saved profile and choosing a saved job description." action={<Link href="/app/skill-matching" className="button button-primary" data-testid="link-results-start">Choose profile and role <ArrowRight /></Link>} /><div className="divider" /><Notice>Any future result will keep the service disclaimer visible and present the skill-match estimate as decision support—not as a hiring verdict.</Notice></section></>;

  const { result, actions, candidateName, job, planWarning } = bundle;
  const skillGroups: { title: string; status: string; items: MatchSkill[] }[] = [
    { title: 'Gaps first', status: 'Missing', items: result.missing_skills ?? [] },
    { title: 'Needs attention · partial matches', status: 'Partial', items: result.partial_matches ?? [] },
    { title: 'Needs attention · review required', status: 'Needs review', items: result.review_required ?? [] },
  ];
  const weights = result.score_breakdown
    ? Object.entries(result.score_breakdown).filter(([key]) => key !== 'formula')
    : [];
  return <><PageHeading eyebrow="Skill matching / Results" title={job.role || 'Skill-match estimate'} copy={`${job.company || 'Company not specified'} · ${result.jd_source_file || job.source_file} · ${candidateName}`} action={<Link href="/app/skill-matching" className="button button-outline" data-testid="link-results-new-match">New comparison</Link>} />
    <section className="card card-pad" style={{ marginBottom: 18 }}><div className="eyebrow">Skill-match estimate</div><div className="metric-value" data-testid="text-match-score">{result.match_score}<span style={{ fontSize: 17, color: 'hsl(var(--muted-foreground))' }}> / 100</span></div><p className="card-copy" data-testid="text-match-summary">{result.summary}</p><div className="callout" role="note">{result.disclaimer}</div></section>
    {skillGroups.map(group => <section key={group.title} style={{ marginBottom: 22 }}><div className="section-heading"><div><div className="eyebrow">{group.status}</div><h2 className="card-title" style={{ margin: 0 }}>{group.title}</h2></div><span className="status-pill">{group.items.length} skills</span></div>{group.items.length ? group.items.map((skill, index) => <MatchSkillRow key={`${group.status}-${skill.skill_name || index}`} skill={skill} status={group.status} />) : <p className="card-copy">No {group.status.toLowerCase()} skills were returned.</p>}</section>)}
    <section style={{ marginBottom: 22 }}><details><summary className="button button-quiet" style={{ cursor: 'pointer' }} data-testid="summary-matched-skills">What you have · {result.matched_skills?.length ?? 0} skills</summary><div style={{ marginTop: 10 }}>{result.matched_skills?.length ? result.matched_skills.map((skill, index) => <MatchSkillRow key={`matched-${skill.skill_name || index}`} skill={skill} status="Matched" />) : <p className="card-copy">No matched skills were returned.</p>}</div></details></section>
    <section className="card card-pad" style={{ marginBottom: 18 }}><div className="eyebrow">Improvement plan</div><h2 className="card-title">Possible next steps</h2>{planWarning && <Notice kind="warning">{planWarning}</Notice>}{!actions.length ? <p className="card-copy">No gaps found against this job description.</p> : actions.map((action, index) => <article className="list-row" key={`${action.skill_name || action.title || 'action'}-${index}`} data-testid={`row-improvement-action-${index}`}><div><div className="row-title">{action.title || action.skill_name || `Action ${index + 1}`}</div>{action.why && <p className="card-copy">{action.why}</p>}{action.steps?.length ? <ol>{action.steps.map((step, stepIndex) => <li key={stepIndex}>{renderServiceValue(step)}</li>)}</ol> : null}{action.level_needed !== undefined && <div className="row-caption">Level needed: {renderServiceValue(action.level_needed)}</div>}</div><div className="row-caption" style={{ textAlign: 'right', minWidth: 125 }}>{action.score_gain !== undefined && <div>+{action.score_gain} score points</div>}{action.projected_score_after !== undefined && <div>Projected: {action.projected_score_after}</div>}</div></article>)}</section>
    <section className="card card-pad" style={{ marginBottom: 18 }}><details><summary style={{ cursor: 'pointer', fontWeight: 700 }} data-testid="summary-score-calculation">How is this calculated?</summary><p className="card-copy">{result.score_breakdown?.formula || 'Formula details were not included in the service response.'}</p>{weights.map(([name, value]) => <div className="list-row" key={name}><span>{name}</span><span>{renderServiceValue(value)}</span></div>)}</details></section>
    <section className="card card-pad"><div className="eyebrow">Service details</div>{result.algorithm_version && <p className="card-copy">Algorithm version: {result.algorithm_version}</p>}{result.warnings?.length ? <ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : <p className="card-copy">No warnings returned.</p>}<div className="callout" role="note" data-testid="text-match-disclaimer">{result.disclaimer}</div></section>
  </>;
}

function SettingsPage({ theme, setTheme }: { theme: string; setTheme: (theme: string) => void }) {
  return <><PageHeading eyebrow="Preferences" title="Settings" copy="Adjust how your workspace looks. Authentication and account controls are not connected." /><section className="card card-pad"><div className="eyebrow">Appearance</div><h2 className="card-title">Theme</h2><p className="card-copy">Choose a comfortable display. Your preference is saved locally in this browser.</p><div className="settings-options">{[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }].map(({ value, label, icon: Icon }) => <button className={`theme-choice ${theme === value ? 'selected' : ''}`} onClick={() => setTheme(value)} key={value} aria-pressed={theme === value} data-testid={`button-theme-${value}`}><Icon /><span>{label}</span>{theme === value && <CheckCircle2 size={16} />}</button>)}</div><div className="divider" /><div className="eyebrow">Account</div><div className="list-row"><div><div className="row-title">Authentication</div><div className="row-caption">Provider not selected · sign-in screens are visual previews only</div></div><span className="status-pill">Not connected</span></div><div className="list-row"><div><div className="row-title">Demo fixtures</div><div className="row-caption">Demo data is opt-in and disabled unless VITE_DEMO_MODE=true outside production.</div></div><span className={`status-pill ${demoEnabled ? 'teal' : ''}`}>{demoEnabled ? 'Enabled' : 'Disabled'}</span></div></section></>;
}

function DeveloperPage() {
  const [health, setHealth] = useState<Record<string, string>>({});
  const configured = [
    { name: 'JD Analytics · Role 1', base: import.meta.env.VITE_JD_API_BASE_URL ?? '' },
    { name: 'Profile Builder · Role 3', base: import.meta.env.VITE_PROFILE_API_BASE_URL ?? '' },
    { name: 'Skill Matching · Role 5', base: import.meta.env.VITE_SKILL_MATCH_API_BASE_URL ?? '' },
  ];
  async function checkAll() {
    const checks = [jdAnalyticsClient.health, profileBuilderClient.health, skillMatchingClient.health];
    const entries = await Promise.all(configured.map(async (service, index) => {
      if (!service.base) return [service.name, 'Not configured'];
      try { await checks[index](); return [service.name, 'Reachable']; }
      catch { return [service.name, 'Unavailable']; }
    }));
    setHealth(Object.fromEntries(entries));
  }
  useEffect(() => { void checkAll(); }, []);
  return <><PageHeading eyebrow="Development only" title="Service diagnostics" copy="A minimal view of configured service addresses and reachability. This is not an admin console or an authorization boundary." action={<button className="button button-outline" onClick={() => void checkAll()} data-testid="button-health-refresh"><Activity /> Refresh checks</button>} />
    <Notice>Developer access is not granted by this page. Local services may be unauthenticated; this frontend does not secure service APIs.</Notice><div style={{ height: 18 }} /><section className="card card-pad">{configured.map(service => <div className="list-row" key={service.name}><div><div className="row-title">{service.name}</div><div className="row-caption">{service.base || 'Base URL not configured'} · /health</div></div><span className={`status-pill ${health[service.name] === 'Reachable' ? 'teal' : ''}`} data-testid={`status-health-${service.name.split(' ')[0].toLowerCase()}`}>{health[service.name] || 'Checking…'}</span></div>)}<div className="list-row"><div><div className="row-title">Resume Parsing · Role 2</div><div className="row-caption">{resumeParsingClient.message}</div></div><span className="status-pill">CLI only</span></div><div className="list-row"><div><div className="row-title">Talent Check · Role 4</div><div className="row-caption">{talentCheckClient.message}</div></div><span className="status-pill">Contract pending</span></div></section><p className="card-copy" style={{ marginTop: 14 }}>Environment addresses are public frontend configuration. Never place provider keys or service credentials in VITE_* variables.</p></>;
}

function NotFound() {
  return <main className="content"><div className="eyebrow">404 · Not found</div><h1>This page isn’t in the workspace.</h1><p className="subhead">The page may have moved. Head back to your dashboard to continue.</p><Link href="/app" className="button button-primary" style={{ marginTop: 20 }} data-testid="link-not-found-dashboard">Go to dashboard <ArrowRight /></Link></main>;
}

function App() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('radix-theme') || 'light');
  function setTheme(next: string) { setThemeState(next); localStorage.setItem('radix-theme', next); }
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  const shell = (title: string, child: ReactNode) => <AppShell title={title} theme={theme} toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{child}</AppShell>;
  function Router() {
    return <ErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login">{() => <AuthPage kind="login" />}</Route>
        <Route path="/signup">{() => <AuthPage kind="signup" />}</Route>
        <Route path="/forgot-password">{() => <AuthPage kind="forgot" />}</Route>
        <Route path="/app">{() => shell('Dashboard', <Dashboard />)}</Route>
        <Route path="/app/profile">{() => shell('My Profile', <ProfileOverview />)}</Route>
        <Route path="/app/profile/new">{() => shell('Create profile', <ProfileWizard />)}</Route>
        <Route path="/app/profile/edit">{() => shell('Edit profile', <ProfileWizard edit />)}</Route>
        <Route path="/app/resume">{() => shell('Resume', <ResumePage />)}</Route>
        <Route path="/app/jds">{() => shell('JD Analytics', <JDLibrary />)}</Route>
        <Route path="/app/jds/new">{() => shell('Analyze a JD', <JDUpload />)}</Route>
        <Route path="/app/jds/:jdId">{params => shell('JD analysis', <JDDetail id={params.jdId} />)}</Route>
        <Route path="/app/talent-check">{() => shell('Talent Check', <TalentCheck />)}</Route>
        <Route path="/app/skill-matching">{() => shell('Skill Matching', <MatchingSelect />)}</Route>
        <Route path="/app/skill-matching/results">{() => shell('Match results', <MatchingResults />)}</Route>
        <Route path="/app/settings">{() => shell('Settings', <SettingsPage theme={theme} setTheme={setTheme} />)}</Route>
        <Route path="/developer">{() => shell('Diagnostics', <DeveloperPage />)}</Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>;
  }
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
