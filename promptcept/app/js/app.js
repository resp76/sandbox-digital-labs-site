/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const ALLOWED_AI_IDS = new Set(['chatgpt', 'claude', 'gemini', 'grok']);
const ALLOWED_CATEGORY_IDS = new Set([
  'writing', 'coding', 'business', 'creative', 'analysis',
  'learning', 'planning', 'images', 'freestyle'
]);

function normalizePromptRecord(prompt) {
  if (!prompt || !Number.isFinite(prompt.id)) return null;
  if (typeof prompt.name !== 'string' || !prompt.name.trim()) return null;
  if (typeof prompt.ai !== 'string' || (prompt.ai !== '' && !ALLOWED_AI_IDS.has(prompt.ai))) return null;
  if (typeof prompt.category !== 'string' || !ALLOWED_CATEGORY_IDS.has(prompt.category)) return null;
  if (typeof prompt.task !== 'string' || typeof prompt.prompt !== 'string') return null;
  const createdAt = Number.isFinite(prompt.createdAt) ? prompt.createdAt : prompt.id;
  const updatedAt = Number.isFinite(prompt.updatedAt) ? prompt.updatedAt : createdAt;
  return {
    id: prompt.id,
    name: prompt.name.trim().slice(0, 60),
    ai: prompt.ai,
    category: prompt.category,
    subcategory: typeof prompt.subcategory === 'string' ? prompt.subcategory : '',
    task: prompt.task.slice(0, 1000),
    clarification: typeof prompt.clarification === 'string' ? prompt.clarification.slice(0, 600) : '',
    prompt: prompt.prompt,
    favorite: Boolean(prompt.favorite),
    createdAt,
    updatedAt,
  };
}

function isValidPromptRecord(prompt) {
  return normalizePromptRecord(prompt) !== null;
}

function loadSavedPrompts() {
  try {
    const parsed = JSON.parse(localStorage.getItem('aiPromptsV2') || '[]');
    if (!Array.isArray(parsed)) throw new Error('Saved prompt data is not an array');
    const validPrompts = parsed.map(normalizePromptRecord).filter(Boolean);
    if (validPrompts.length !== parsed.length || JSON.stringify(validPrompts) !== JSON.stringify(parsed)) {
      localStorage.setItem('aiPromptsV2', JSON.stringify(validPrompts));
    }
    return validPrompts;
  } catch (error) {
    console.warn('PromptCept recovered from invalid saved prompt data.', error);
    localStorage.removeItem('aiPromptsV2');
    return [];
  }
}

let savedPrompts = loadSavedPrompts();

let state = {
  name: '', ai: '', category: '', subcategory: '',
  task: '', clarification: '', prompt: '', variation: 0
};
let screenHistory = ['screen-home'];
let activeSavedPromptId = null;

const AI_META = {
  chatgpt: {
    label: 'ChatGPT',
    color: 'chatgpt',
    appUrl: 'chatgpt://',
    url: 'https://chatgpt.com/',
  },
  claude: {
    label: 'Claude',
    color: 'claude',
    appUrl: 'claude://',
    url: 'https://claude.ai/new',
  },
  gemini: {
    label: 'Gemini',
    color: 'gemini',
    appUrl: 'googlegemini://',
    url: 'https://gemini.google.com/app',
  },
  grok: {
    label: 'Grok',
    color: 'grok',
    appUrl: 'grok://',
    url: 'https://grok.com/',
  },
};
// Display-only metadata for prompts with no assistant chosen. Not part of
// AI_META because it has no launch destination — it can't be opened.
const NO_AI_META = { label: 'No assistant selected', color: 'none' };
function getAiMeta(ai) {
  return AI_META[ai] || null;
}
// `icon` names a symbol in the SVG sprite at the top of index.html.
const CAT_META = {
  writing:  { icon: 'pencil', label: 'Writing & Editing' },
  coding:   { icon: 'code', label: 'Coding & Tech' },
  business: { icon: 'briefcase', label: 'Work & Business' },
  creative: { icon: 'bulb', label: 'Creative Ideas' },
  analysis: { icon: 'chart', label: 'Research & Analysis' },
  learning: { icon: 'book', label: 'Learning' },
  planning: { icon: 'checklist', label: 'Planning & Productivity' },
  images:   { icon: 'image', label: 'Images' },
  // Kept for prompts saved by pre-1.0 builds.
  freestyle: { icon: 'star4', label: 'Freestyle' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(name, className = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

const SUBCAT_DATA = {
  writing: [
    { id: 'email',   name: 'Email',                 desc: 'Professional or personal email' },
    { id: 'rewrite', name: 'Rewrite & Improve',     desc: 'Improve clarity, tone, and flow' },
    { id: 'social',  name: 'Social Media',          desc: 'Posts, captions, and threads' },
    { id: 'blog',    name: 'Blog / Article',        desc: 'Articles, guides, and posts' },
    { id: 'newsletter', name: 'Newsletter',         desc: 'Updates, editions, and campaigns' },
    { id: 'storypoetry', name: 'Story / Poetry',    desc: 'Stories, poems, and creative prose' },
    { id: 'resume',  name: 'Resume',                desc: 'ATS-friendly career documents' },
    { id: 'coverletter', name: 'Cover Letter',      desc: 'Tailored job applications' },
    { id: 'product', name: 'Product Description',   desc: 'Listings and sales copy' },
    { id: 'custom',  name: 'Freestyle',             desc: 'Any other writing task' },
  ],
  coding: [
    { id: 'newcode',     name: 'Write Code',        desc: 'Build something from scratch' },
    { id: 'debug',       name: 'Debug / Fix',       desc: 'Find and fix errors' },
    { id: 'explaincode', name: 'Explain Code',      desc: 'Understand how code works' },
    { id: 'review',      name: 'Code Review',       desc: 'Improve quality and security' },
    { id: 'api',         name: 'API / Integration', desc: 'Connect services together' },
    { id: 'database',    name: 'Database / SQL',    desc: 'Queries, schemas, and data' },
    { id: 'testing',     name: 'Tests / Test Cases', desc: 'Reliable automated testing' },
    { id: 'architecture', name: 'System Design',    desc: 'Architecture and trade-offs' },
    { id: 'website',     name: 'Website Design',    desc: 'Plan, design, and build a site' },
    { id: 'docs',        name: 'Documentation',      desc: 'Technical docs and guides' },
    { id: 'custom',      name: 'Freestyle',         desc: 'Any other technical task' },
  ],
  business: [
    { id: 'meeting',      name: 'Meeting Notes',     desc: 'Summaries and action items' },
    { id: 'presentation', name: 'Presentation',      desc: 'Slides, outlines, and talking points' },
    { id: 'report',       name: 'Report',            desc: 'Professional reports and updates' },
    { id: 'strategy',     name: 'Business Strategy', desc: 'Priorities, growth, and decisions' },
    { id: 'marketing',    name: 'Marketing Copy',    desc: 'Campaigns, ads, and promotions' },
    { id: 'adcopy',       name: 'Ad Copy',           desc: 'Focused ads and calls-to-action' },
    { id: 'competitor',   name: 'Competitor Analysis', desc: 'Positioning and market gaps' },
    { id: 'budget',       name: 'Budget / Financial Plan', desc: 'Costs, forecasts, and buffers' },
    { id: 'support',      name: 'Customer Support Reply', desc: 'Helpful customer communication' },
    { id: 'negotiation',  name: 'Negotiation Prep',   desc: 'Salary, vendor, and deal talks' },
    { id: 'custom',       name: 'Freestyle',         desc: 'Any other work task' },
  ],
  creative: [
    { id: 'brainstorm', name: 'Brainstorm Ideas', desc: 'Generate and develop ideas' },
    { id: 'story',      name: 'Story / Fiction',   desc: 'Stories, scenes, and characters' },
    { id: 'script',     name: 'Video Script',      desc: 'Videos, scenes, and dialogue' },
    { id: 'podcast',    name: 'Podcast Script',    desc: 'Episodes, segments, and interviews' },
    { id: 'naming',     name: 'Names & Slogans',   desc: 'Names, taglines, and titles' },
    { id: 'design',     name: 'Design Concept',    desc: 'Visual direction and concepts' },
    { id: 'lyrics',     name: 'Song / Lyrics',     desc: 'Lyrics, themes, and song ideas' },
    { id: 'worldbuild', name: 'Worldbuilding',     desc: 'Settings, cultures, and lore' },
    { id: 'custom',     name: 'Freestyle',         desc: 'Any other creative task' },
  ],
  analysis: [
    { id: 'summarize', name: 'Summarize',        desc: 'Turn content into key points' },
    { id: 'research',  name: 'Research Topic',   desc: 'Explore a subject in depth' },
    { id: 'compare',   name: 'Compare Options',  desc: 'Compare choices and trade-offs' },
    { id: 'data',      name: 'Analyze Data',     desc: 'Interpret numbers and trends' },
    { id: 'insights',  name: 'Extract Insights', desc: 'Find themes and key findings' },
    { id: 'decision',  name: 'Decision Support', desc: 'Evaluate options and recommend' },
    { id: 'swot',      name: 'SWOT Analysis',     desc: 'Strengths, weaknesses, opportunities, threats' },
    { id: 'factcheck', name: 'Fact Check',        desc: 'Verify claims and source quality' },
    { id: 'custom',    name: 'Freestyle',        desc: 'Any other analysis task' },
  ],
  learning: [
    { id: 'explain',   name: 'Explain a Topic',    desc: 'Understand something clearly' },
    { id: 'tutor',     name: 'Tutor Me',           desc: 'Learn through guided questions' },
    { id: 'studyplan', name: 'Study Plan',         desc: 'Create a learning schedule' },
    { id: 'quiz',      name: 'Quiz Me',            desc: 'Test your knowledge' },
    { id: 'practice',  name: 'Practice Exercises', desc: 'Build skills through practice' },
    { id: 'simplify',  name: 'Simplify a Topic',   desc: 'Make complex ideas accessible' },
    { id: 'translate', name: 'Translate',          desc: 'Translate text with nuance' },
    { id: 'define',    name: 'Define a Term',      desc: 'Meaning, context, and examples' },
    { id: 'languagepractice', name: 'Language Practice', desc: 'Conversation and corrections' },
    { id: 'interview', name: 'Interview Prep',      desc: 'Practice questions and answers' },
    { id: 'lessonplan',name: 'Lesson Plan',          desc: 'Teach a class or session' },
    { id: 'custom',    name: 'Freestyle',          desc: 'Any other learning task' },
  ],
  planning: [
    { id: 'roadmap',   name: 'Project Plan',      desc: 'Tasks, milestones, and timeline' },
    { id: 'checklist', name: 'To-do / Checklist', desc: 'Organize tasks and next steps' },
    { id: 'daily',     name: 'Schedule',          desc: 'Plan a day, week, or routine' },
    { id: 'goals',     name: 'Goal Plan',          desc: 'Set measurable goals and milestones' },
    { id: 'habits',    name: 'Habit Builder',      desc: 'Build sustainable routines' },
    { id: 'event',     name: 'Event Plan',        desc: 'Plan logistics and timing' },
    { id: 'travel',    name: 'Travel Plan',       desc: 'Itineraries, activities, and tips' },
    { id: 'budget',    name: 'Budget Plan',       desc: 'Income, costs, and contingencies' },
    { id: 'workout',   name: 'Workout Plan',        desc: 'Training and exercise routines' },
    { id: 'custom',    name: 'Freestyle',         desc: 'Any other planning task' },
  ],
  images: [
    { id: 'photoreal',    name: 'Photorealistic',     desc: 'Lifelike photographic images' },
    { id: 'digitalart',   name: 'Illustration / Art', desc: 'Illustrations and digital art' },
    { id: 'logo',         name: 'Logo / Icon',        desc: 'Brand marks, icons, and badges' },
    { id: 'character',    name: 'Character Design',   desc: 'People, avatars, and characters' },
    { id: 'productimage', name: 'Product Image',      desc: 'Product and advertising visuals' },
    { id: 'scene',        name: 'Scene / Background', desc: 'Places, landscapes, and settings' },
    { id: 'abstract',     name: 'Abstract Art',       desc: 'Concepts, emotion, and form' },
    { id: 'uimockup',     name: 'UI / App Mockup',    desc: 'Interface concepts and layouts' },
    { id: 'infographic',  name: 'Infographic',        desc: 'Visual information layouts' },
    { id: 'custom',       name: 'Freestyle',          desc: 'Any other image idea' },
  ],
  // Legacy data retained so prompts saved by older builds still display correctly.
  freestyle: [
    { id: 'quickanswer', name: 'Quick Answer',      desc: 'Fast, direct response' },
    { id: 'roleplay',    name: 'Roleplay',          desc: 'Character or persona-based' },
    { id: 'debate',      name: 'Debate Both Sides', desc: 'Argue multiple perspectives' },
    { id: 'feedback',    name: 'Give Feedback',     desc: 'Review and critique my work' },
    { id: 'rewrite',     name: 'Rewrite & Improve', desc: 'Enhance existing content' },
    { id: 'open',        name: 'Open Prompt',       desc: 'Fully custom, no constraints' },
  ],
};

/* ═══════════════════════════════════════════
   ROUTING
═══════════════════════════════════════════ */
function updateQuickStart() {
  const task = document.getElementById('quick-task').value.trim();
  document.getElementById('quick-start-btn').disabled = task.length === 0;
}

function makePromptName(task) {
  const words = task.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || [];
  const smallWords = new Set(['a', 'an', 'and', 'for', 'of', 'or', 'the', 'to']);
  return words.slice(0, 5).map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && smallWords.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ') || 'New Prompt';
}

function inferPromptType(task) {
  const text = task.toLowerCase();
  if (/code|debug|api|database|software|program/.test(text)) return ['coding', 'custom'];
  if (/image|logo|photo|illustration|visual/.test(text)) return ['images', 'custom'];
  if (/learn|teach|study|quiz|explain/.test(text)) return ['learning', 'custom'];
  if (/plan|schedule|travel|trip|itinerary|goal|checklist/.test(text)) return ['planning', 'custom'];
  if (/research|analy[sz]e|compare|summari[sz]e|insight|feedback/.test(text)) return ['analysis', 'summarize'];
  if (/brainstorm|story|script|creative|name|slogan/.test(text)) return ['creative', 'custom'];
  if (/meeting|report|strategy|marketing|business|customer/.test(text)) return ['business', 'custom'];
  return ['writing', 'custom'];
}

function startQuickPrompt() {
  const task = document.getElementById('quick-task').value.trim();
  if (!task) return;
  const [category, subcategory] = inferPromptType(task);
  state = {
    name: makePromptName(task),
    ai: document.getElementById('quick-ai').value,
    category,
    subcategory,
    task,
    clarification: '',
    prompt: '',
    variation: 0
  };
  activeSavedPromptId = null;
  screenHistory = ['screen-home'];
  document.getElementById('prompt-task').value = task;
  document.getElementById('char-count').textContent = task.length;
  document.getElementById('btn-generate').disabled = false;
  prepareConfirmation();
}

function startNewPrompt() {
  state = {
    name: '', ai: '', category: '', subcategory: '',
    task: '', clarification: '', prompt: '', variation: 0
  };
  activeSavedPromptId = null;
  screenHistory = ['screen-home'];

  document.getElementById('prompt-name').value = '';
  document.getElementById('prompt-task').value = '';
  document.getElementById('prompt-clarification').value = '';
  document.getElementById('result-prompt').value = '';
  document.getElementById('view-prompt').value = '';
  document.getElementById('char-count').textContent = '0';
  document.getElementById('subcat-grid').innerHTML = '';

  document.querySelectorAll('.ai-chip').forEach(control => {
    control.className = control.id === 'chip-none' ? 'ai-chip ai-chip-none' : 'ai-chip';
    control.setAttribute('aria-pressed', 'false');
  });
  document.querySelectorAll('#screen-step1 .cat-card').forEach(control => {
    control.classList.remove('selected');
    control.setAttribute('aria-pressed', 'false');
  });
  document.getElementById('btn-s1-next').disabled = true;
  document.getElementById('btn-s1b-next').disabled = true;
  document.getElementById('btn-generate').disabled = true;

  goTo('screen-step1');
}

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll(`#${id} .result-prompt`).forEach(autoResizeTA);
  if (screenHistory[screenHistory.length - 1] !== id) screenHistory.push(id);
  updateBackBtn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  requestAnimationFrame(() => {
    const heading = document.querySelector(`#${id} .step-title, #${id} h2`);
    heading?.focus({ preventScroll: true });
  });
}

function goBack() {
  if (screenHistory.length > 1) screenHistory.pop();
  const prev = screenHistory[screenHistory.length - 1];
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(prev).classList.add('active');
  updateBackBtn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Android's hardware Back button (MainActivity calls this): step back through the app's own
// screens, and report false from Home so the app closes as usual.
window.handleHardwareBack = () => {
  if (screenHistory.length <= 1) return false;
  goBack();
  return true;
};

function updateBackBtn() {
  const cur = screenHistory[screenHistory.length - 1];
  const btn = document.getElementById('back-btn');
  btn.classList.toggle('visible', cur !== 'screen-home');
}

/* ═══════════════════════════════════════════
   STEP 1
═══════════════════════════════════════════ */
function pickAI(ai) {
  state.ai = ai;
  document.querySelectorAll('.ai-chip').forEach(c => {
    c.className = c.id === 'chip-none' ? 'ai-chip ai-chip-none' : 'ai-chip';
    c.setAttribute('aria-pressed', 'false');
  });
  const selected = document.getElementById(ai ? 'chip-' + ai : 'chip-none');
  selected.classList.add('selected-' + (ai || 'none'));
  selected.setAttribute('aria-pressed', 'true');
  updateStep1();
}

function pickCat(cat) {
  state.category = cat;
  state.subcategory = ''; // reset subcategory when category changes
  document.querySelectorAll('#screen-step1 .cat-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  const selected = document.getElementById('cat-' + cat);
  selected.classList.add('selected');
  selected.setAttribute('aria-pressed', 'true');
  renderSubcats(cat);
  updateStep1();
}

function renderSubcats(cat) {
  const meta = CAT_META[cat];
  const subcats = SUBCAT_DATA[cat] || [];

  document.getElementById('subcat-title').textContent = 'Choose a type';
  document.getElementById('subcat-sub').textContent = `${meta.label}: pick the specific type that best matches what you need.`;
  document.getElementById('btn-s1b-next').disabled = true;

  const grid = document.getElementById('subcat-grid');
  grid.innerHTML = subcats.map(s => `
    <button type="button" class="cat-card" id="subcat-${s.id}" data-click="pickSubcat" data-arg="${s.id}" aria-pressed="false">
      <div class="cat-name">${s.name}</div>
      <div class="cat-desc">${s.desc}</div>
    </button>`).join('');
}

function pickSubcat(id) {
  state.subcategory = id;
  document.querySelectorAll('#subcat-grid .cat-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  const selected = document.getElementById('subcat-' + id);
  selected.classList.add('selected');
  selected.setAttribute('aria-pressed', 'true');
  document.getElementById('btn-s1b-next').disabled = false;

  // Update step 3 hint based on subcategory
  const subcat = (SUBCAT_DATA[state.category] || []).find(s => s.id === id);
  const hints = {
    blog:       'What\'s the topic, target audience, tone, and desired length?',
    negotiation:'What are you negotiating, with whom, and what outcome and walk-away point do you have?',
    interview:  'What role and company, what format, and which experience do you want to draw on?',
    lessonplan: 'What subject, what age or level, how long is the session, and what should they be able to do afterwards?',
    workout:    'What\'s the goal, your current level, how many days a week, and what equipment do you have?',
    email:      'Who is it to, what\'s the goal, and what tone should it have?',
    rewrite:    'Paste the text and describe the tone, audience, and result you want.',
    social:     'Which platform, what\'s the message, and who\'s the audience?',
    product:    'What\'s the product, its key features, and who are you selling to?',
    resume:     'What role are you targeting, and which measurable experience and skills should be highlighted?',
    coverletter:'What role and company are you applying to, and why are you a strong fit?',
    newsletter: 'What\'s the main topic, audience, and key sections you want included?',
    storypoetry:'Are you creating a story or poem, and what genre, theme, tone, length, and key details should it use?',
    newcode:    'What language, what should it do, and any specific requirements?',
    debug:      'Paste or describe the broken code and explain what should happen instead.',
    explaincode:'Share the code and say which parts or concepts need explaining.',
    review:     'Share the code and explain what you want evaluated or improved.',
    api:        'Which services need connecting and what data should flow between them?',
    database:   'Describe the data structure, the query goal, or the schema you need.',
    testing:    'What should be tested, which framework is used, and what risks or edge cases matter?',
    architecture:'What system are you designing, at what scale, and what constraints or trade-offs matter?',
    website:    'What\'s the website for, who\'s the audience, which pages do you need, and what brand style, functionality, and tech platform should it use?',
    docs:       'What code or system needs documenting and who will read the docs?',
    meeting:    'Share the notes or transcript and say whether you need a summary, decisions, or action items.',
    presentation:'What is the topic, audience, goal, slide count, and presentation length?',
    report:     'What should the report cover, who will read it, and what outcome should it support?',
    marketing:  'What are you promoting, who is the audience, which channel will be used, and what action should they take?',
    competitor: 'Who are the competitors, who is the customer, and which dimensions should be evaluated?',
    budget:     'What is being budgeted, for what timeframe, and what income, costs, or limits are known?',
    support:    'What happened, what tone should the reply use, and what resolution can you offer?',
    story:      'What\'s the genre, setting, characters, and the core conflict or theme?',
    brainstorm: 'What problem or opportunity are you brainstorming around?',
    naming:     'What does the brand/product do, and what feeling should the name evoke?',
    adcopy:     'What\'s the product, the audience, and the goal of the ad?',
    script:     'What kind of video or scene is this, who is it for, and what is the target length?',
    podcast:    'What is the episode format, topic, audience, hosts or guests, and target length?',
    worldbuild: 'What kind of world is it — genre, era, tone — and what do you need built?',
    design:     'What are you designing, who is it for, and what style, mood, or constraints should guide it?',
    lyrics:     'What genre, theme, mood, song structure, and point of view do you want?',
    summarize:  'Paste or describe the content you want summarized and the desired length.',
    compare:    'What are the options being compared and what criteria matter most?',
    research:   'What topic needs researching and what questions should be answered?',
    data:       'Describe the data or metrics and the insights you\'re looking for.',
    insights:   'Share the material and describe which themes, findings, or implications matter most.',
    decision:   'What decision are you making, which options exist, and what criteria matter most?',
    swot:       'What business, product, or idea should be analyzed?',
    factcheck:  'Which claims should be checked, and what sources or evidence are available?',
    explain:    'What concept needs explaining and what\'s your current level of knowledge?',
    tutor:      'What topic do you want to learn, what is your current level, and how should the tutor teach you?',
    studyplan:  'What subject do you want to learn, your timeline, and daily availability?',
    quiz:       'What topic or material should the quiz cover, and how many questions?',
    simplify:   'What complex topic should be broken down for a beginner?',
    translate:  'What text should be translated, into which language or regional variant, and for what audience?',
    define:     'What word or concept should be defined, and in what context or subject area?',
    languagepractice:'Which language are you practising, what is your level, and what scenario should the conversation cover?',
    practice:   'What skill or topic should you practise, at what level, and how many exercises do you want?',
    roadmap:    'What\'s the project goal, timeline, team size, and key constraints?',
    checklist:  'What outcome are you working toward, what is the deadline, and which steps are already complete?',
    strategy:   'What\'s the business, the challenge, and the outcome you\'re aiming for?',
    goals:      'What area of life or work, and what does success look like?',
    habits:     'What habit do you want to build or stop, what triggers it, and what usually gets in the way?',
    event:      'What type of event, how many people, when, and what\'s the budget?',
    daily:       'What are your priorities, available hours, and any fixed commitments?',
    travel:      'Where are you going, when, for how long, and what budget or interests should shape the trip?',
    photoreal:   'Describe the subject, setting, lighting, camera style, and mood.',
    digitalart:  'Describe the subject, art style, color palette, and overall feeling.',
    logo:        'Describe the brand name, what it represents, style preference, and colors.',
    character:   'Describe the character — appearance, personality, style, and setting.',
    productimage:'Describe the product, background, lighting, camera angle, brand style, and intended use.',
    abstract:    'Describe the concept or emotion, visual language, palette, texture, and composition.',
    uimockup:    'Describe the product, target device, core screen, users, brand style, and required interface elements.',
    infographic: 'What information should be visualized, who is it for, and what hierarchy, format, and brand style should it use?',
    scene:       'Describe the environment, time of day, weather, mood, and any key details.',
    quickanswer: 'What do you want to know? Ask clearly and directly.',
    roleplay:    'Describe the character or persona and the scenario you want to explore.',
    debate:      'What topic should be debated and which angles should be covered?',
    feedback:    'Paste your work and describe what kind of feedback you\'re looking for.',
    open:        'Write your prompt exactly as you want it — no structure required.',
    custom:      'Describe what you need, the desired result, and any audience, format, tone, or constraints.',
  };
  document.getElementById('s2-sub').textContent = hints[id] || 'Describe your task in detail. More context = better prompt.';
}

function updateStep1() {
  state.name = document.getElementById('prompt-name').value.trim();
  const ok = state.name.length > 0 && state.category;
  document.getElementById('btn-s1-next').disabled = !ok;
}

/* ═══════════════════════════════════════════
   STEP 2
═══════════════════════════════════════════ */
function updateStep2() {
  const val = document.getElementById('prompt-task').value;
  document.getElementById('char-count').textContent = val.length;
  state.task = val.trim();
  document.getElementById('btn-generate').disabled = state.task.length < 15;
}

function prepareConfirmation() {
  const enteredTask = document.getElementById('prompt-task').value.trim();
  if (enteredTask) state.task = enteredTask;
  const ai = getAiMeta(state.ai);
  const category = CAT_META[state.category];
  document.getElementById('confirm-name').textContent = state.name;
  document.getElementById('confirm-ai').textContent = ai ? ai.label : 'Not selected — decide later';
  document.getElementById('confirm-category').textContent = category.label;
  document.getElementById('confirm-type').textContent = getSubcatLabel(state.category, state.subcategory) || 'Freestyle';
  document.getElementById('confirm-request').textContent = state.task;
  document.getElementById('prompt-clarification').value = state.clarification;
  coachQuestions = getCoachQuestions(state.category, `${state.task}\n${state.clarification}`);
  renderCoach();
  goTo('screen-confirm');
}

/* ═══════════════════════════════════════════
   GENERATE
═══════════════════════════════════════════ */
function generate() {
  state.clarification = cleanClarification(document.getElementById('prompt-clarification').value);
  state.variation = 0;
  state.prompt = buildPrompt(state.name, state.ai, state.category, getReviewedTask(), state.variation);
  savePrompt();
  showResult();
  maybeRequestReview();
}

function regenerate() {
  state.variation = (state.variation % 3) + 1;
  state.prompt = buildPrompt(state.name, state.ai, state.category, getReviewedTask(), state.variation);
  updateSavedPrompt();
  showResult();
  announce(`Generated ${getVariationLabel(state.variation).toLowerCase()} version.`);
}

function getReviewedTask() {
  return state.clarification
    ? `${state.task}\n\nAdditional requirements or corrections:\n${state.clarification}`
    : state.task;
}

function getVariationLabel(variation) {
  return ['Standard', 'Concise', 'Detailed', 'Alternative approach'][variation] || 'Standard';
}

function getVariationInstructions(variation) {
  const instructions = {
    1: '- Prefer a concise response. Include only the detail needed to complete the task well.',
    2: '- Produce a detailed response with examples, edge cases, and implementation guidance where relevant.',
    3: '- Take a fresh, meaningfully different approach while preserving every stated requirement.',
  };
  return instructions[variation] || '';
}

function showResult() {
  document.getElementById('result-title').textContent = state.name;
  const m = getAiMeta(state.ai);
  const badge = document.getElementById('result-ai-badge');
  const badgeMeta = m || NO_AI_META;
  badge.textContent = badgeMeta.label;
  badge.className = 'result-ai-badge ' + badgeMeta.color;

  const ta = document.getElementById('result-prompt');
  ta.value = state.prompt;
  autoResizeTA(ta);

  const openBtn = document.getElementById('open-ai-btn');
  const openHint = document.getElementById('open-ai-hint');
  if (m) {
    openBtn.hidden = false;
    document.getElementById('open-ai-label').textContent = `Copy & Open ${m.label}`;
    openHint.textContent = `Your prompt will be copied. Paste it into ${m.label}, then send.`;
  } else {
    openBtn.hidden = true;
    openHint.textContent = 'No assistant selected — copy your prompt above and paste it into any AI assistant.';
  }

  resetCopy('copy-btn', 'copy-icon', 'copy-label');
  goTo('screen-result');
}

/* ═══════════════════════════════════════════
   PROMPT BUILDER
═══════════════════════════════════════════ */
function buildPrompt(name, ai, category, task, variation = 0) {
  const catRoles = {
    writing:  'an expert content writer and editor',
    coding:   'a senior software engineer',
    business: 'an experienced business communications and strategy advisor',
    creative: 'a creative director and ideation expert',
    analysis: 'a skilled analyst and researcher',
    learning: 'an expert teacher and subject-matter mentor',
    planning:  'a strategic planner and project manager',
    images:    'an expert AI image prompt engineer specializing in visual content creation',
    freestyle: 'an expert AI assistant',
  };

  const role = catRoles[category] || 'an expert AI assistant';
  const subcatLabel = getSubcatLabel(category, state.subcategory);

  // AI-specific formatting
  if (ai === 'claude') {
    return buildClaudePrompt(name, role, category, task, subcatLabel, variation);
  } else if (ai === 'chatgpt') {
    return buildChatGPTPrompt(name, role, category, task, subcatLabel, variation);
  } else if (ai === 'grok') {
    return buildGrokPrompt(name, role, category, task, subcatLabel, variation);
  } else if (ai === 'gemini') {
    return buildGeminiPrompt(name, role, category, task, subcatLabel, variation);
  } else {
    return buildGenericPrompt(name, role, category, task, subcatLabel, variation);
  }
}

function buildGenericPrompt(name, role, category, task, subcatLabel, variation) {
  const catInstructions = getCatInstructions(category, state.subcategory);
  const variationInstructions = getVariationInstructions(variation);
  const typeNote = subcatLabel ? `**Type:** ${subcatLabel}\n\n` : '';
  return `You are ${role}.

## Prompt objective
${name}

## What I need
${typeNote}${task}

## How to approach this
${catInstructions}
${variationInstructions ? `\n${variationInstructions}` : ''}
- Work through the task carefully before responding.
- Be specific, accurate, and well-organized.
- If a missing detail blocks a useful answer, ask one focused question; otherwise state reasonable assumptions and continue.
- Use clear formatting suited to the task — this prompt is written to work well with any AI assistant.

Begin your response now.`;
}

function buildGrokPrompt(name, role, category, task, subcatLabel, variation) {
  const catInstructions = getCatInstructions(category, state.subcategory);
  const variationInstructions = getVariationInstructions(variation);
  const typeNote = subcatLabel ? `**Type:** ${subcatLabel}\n\n` : '';
  return `You are ${role}. Be direct, sharp, and genuinely useful — skip the filler.

## Prompt objective
${name}

## What I need
${typeNote}${task}

## How to approach this
${catInstructions}
${variationInstructions ? `\n${variationInstructions}` : ''}
- Get straight to the point — lead with the most useful information first.
- Be specific and concrete; avoid hedging or vague generalities.
- If a missing detail blocks a useful answer, ask one focused question; otherwise state reasonable assumptions and continue.
- If there are multiple valid approaches, name them briefly and pick the best one.
- Show your reasoning where it adds value, but don't over-explain the obvious.
- Match the energy of the request — if it's creative, be creative; if it's technical, be precise.

Go.`;
}

function getSubcatLabel(category, subcatId) {
  if (!subcatId) return '';
  const sub = (SUBCAT_DATA[category] || []).find(s => s.id === subcatId);
  return sub ? sub.name : '';
}

function buildClaudePrompt(name, role, category, task, subcatLabel, variation) {
  const catInstructions = getCatInstructions(category, state.subcategory);
  const variationInstructions = getVariationInstructions(variation);
  const typeNote = subcatLabel ? `\n<type>${subcatLabel}</type>\n` : '';
  return `<role>
You are ${role}. Focus on delivering a useful, accurate result.
</role>
<objective>${name}</objective>
${typeNote}
<task>
${task}
</task>

<instructions>
${catInstructions}
${variationInstructions ? `${variationInstructions}\n` : ''}
- Work through the task carefully before writing your response.
- If anything is ambiguous, state your assumptions clearly.
- Ask a clarifying question only when a missing detail blocks a useful answer.
- Structure your response with headers or numbered sections where it aids clarity.
- Be specific and actionable — avoid generic filler.
- Proofread and refine before presenting your final answer.
</instructions>

<format>
Respond in clear, well-organized prose or structured lists as appropriate to the task. Use markdown formatting.
</format>

Begin your response now.`;
}

function buildChatGPTPrompt(name, role, category, task, subcatLabel, variation) {
  const catInstructions = getCatInstructions(category, state.subcategory);
  const variationInstructions = getVariationInstructions(variation);
  const typeNote = subcatLabel ? `\nType: ${subcatLabel}\n` : '';
  return `Act as ${role}.
Prompt objective: ${name}
${typeNote}
Your task:
"""
${task}
"""

Instructions:
${catInstructions}
${variationInstructions ? `${variationInstructions}\n` : ''}
- Work through the task carefully before responding.
- If a missing detail blocks a useful answer, ask one focused question; otherwise state reasonable assumptions and continue.
- Be specific, actionable, and thorough — no filler or vague advice.
- Use clear headings, sections, or numbered steps where appropriate.
- Review your output for quality before presenting it.

Format your response in clean markdown with headers where helpful.`;
}

function buildGeminiPrompt(name, role, category, task, subcatLabel, variation) {
  const catInstructions = getCatInstructions(category, state.subcategory);
  const variationInstructions = getVariationInstructions(variation);
  const typeNote = subcatLabel ? `**Type:** ${subcatLabel}\n\n` : '';
  return `**Persona:** You are ${role}.

**Task:** ${name}

**Context:**
${typeNote}${task}

**How to respond:**
${catInstructions}
${variationInstructions ? `\n${variationInstructions}` : ''}
- Work through the task methodically and plan your approach before writing the final answer.
- Ground every claim in the context above. If a missing detail blocks a useful answer, ask one focused question; otherwise state reasonable assumptions and continue.
- Be specific and complete, but don't pad — cut filler and repetition.
- Match the length to the task; don't inflate a simple answer.

**Output format:** Clean markdown. Lead with the direct answer, then supporting detail under clear headings or numbered steps.`;
}

function getCatInstructions(category, subcatId) {
  // Base instructions per category
  const base = {
    writing:  '- Match the tone, audience, and purpose described in the task.\n- Produce polished, publication-ready copy.\n- Vary sentence structure for readability.',
    coding:   '- Write clean, well-commented, production-quality code.\n- Explain your implementation decisions.\n- Include example usage or test cases where relevant.',
    business: '- Match the audience, business context, and desired outcome.\n- Keep recommendations practical, concise, and professionally written.\n- Clearly identify decisions, actions, owners, or next steps where relevant.',
    creative: '- Prioritize originality — avoid clichés and generic ideas.\n- Offer multiple creative directions if applicable.\n- Explain the reasoning behind your creative choices.',
    analysis: '- Base your analysis on the information provided — do not fabricate facts.\n- Highlight key insights, patterns, and implications.\n- Be objective and balanced in your evaluation.',
    learning: '- Calibrate your explanation to the skill level implied in the task.\n- Use concrete examples, analogies, or real-world scenarios.\n- Anticipate and address common misconceptions.',
    planning:  '- Break the plan into clear, sequenced phases or milestones.\n- Flag risks, dependencies, and open questions.\n- Keep recommendations practical and achievable.',
    images:    '- Write a detailed, vivid image generation prompt with subject, visual attributes, lighting, mood, and composition.\n- Include technical parameters such as aspect ratio and quality settings only where the selected image tool supports them.\n- Describe observable aesthetics, media, eras, and art movements rather than imitating a living artist.\n- Add concise exclusion guidance only where the selected image tool supports negative prompts.',
    freestyle: '- Respond naturally and directly — no forced structure.\n- Match the tone and format to what the request actually calls for.\n- Be concise when brevity is better, thorough when depth is needed.\n- Focus entirely on what the user wants, nothing more.',
  };

  // Subcategory-specific additions
  const extra = {
    negotiation:'- Establish the interests behind each side\'s position, not just the stated demands.\n- Prepare a target, a realistic opening, and a walk-away point, plus the best alternative if no deal is reached.\n- Draft concrete language for the hardest likely objections, and keep the tone collaborative rather than adversarial.',
    interview:  '- Generate questions the described role would realistically ask, covering behavioural, technical, and motivation angles.\n- Structure example answers around a situation, the actions taken, and the measurable result, using only experience the user supplied.\n- Do not invent achievements or credentials; mark anything the user still needs to fill in.',
    lessonplan: '- Start from what the learner should be able to do afterwards, then work backwards to activities.\n- Sequence the session with timings, a hook, guided practice, independent practice, and a check for understanding.\n- Note materials needed, likely misconceptions, and how to adapt for learners who are ahead or behind.',
    workout:    '- Match volume and intensity to the stated experience level, available days, and equipment.\n- Specify sets, reps, rest, and progression over time, with warm-up and cool-down.\n- Include form cues and substitutions, and state plainly that this is general information, not medical advice, and that a professional should be consulted for injuries or health conditions.',
    blog:       '- Include a compelling headline, introduction hook, and clear structure with H2/H3 headers.\n- End with a fitting conclusion; include a call-to-action only when the purpose calls for one.',
    email:      '- Write a clear subject line, keep the body concise, and end with a single clear call-to-action.\n- Match the formality to the relationship described.',
    social:     '- Tailor length and format to the specific platform.\n- Include relevant hashtags if appropriate.\n- Optimize for engagement — use a strong opening line.',
    product:    '- Choose a benefit-led or factual specification-led structure based on the sales channel and audience.\n- Use concrete, supportable language and preserve supplied product facts.\n- Include a call-to-action only when appropriate for the requested format.',
    resume:     '- Use strong action verbs and quantify achievements only when supported by the supplied facts.\n- Tailor language to the target job description without inventing experience, skills, or credentials.\n- Keep formatting ATS-friendly.',
    coverletter:'- Connect the candidate\'s verified experience to the role\'s most important needs.\n- Show specific interest in the employer without inventing company facts or personal history.\n- Keep it concise, credible, and distinct from a resume summary.',
    newsletter: '- Open with a compelling hook.\n- Use short paragraphs and clear section breaks.\n- Include a single primary call-to-action.',
    storypoetry:'- Follow the requested form, genre, point of view, structure, tone, and length.\n- Use vivid, specific language and purposeful imagery while avoiding clichés.\n- For stories, develop character, setting, conflict, and narrative movement; for poetry, prioritize voice, rhythm, imagery, and lineation appropriate to the chosen form.',
    newcode:    '- Follow best practices and idiomatic patterns for the language specified.\n- Add clear inline comments explaining non-obvious logic.\n- Include a usage example.',
    debug:      '- First diagnose the root cause before suggesting a fix.\n- Explain why the bug occurs, not just how to fix it.\n- Suggest how to prevent similar issues in future.',
    review:     '- Evaluate readability, correctness, performance, security, and maintainability where each is relevant.\n- Prioritize feedback by severity — critical, moderate, minor.\n- Suggest concrete rewrites, not just vague improvements.',
    api:        '- Specify request/response formats clearly.\n- Include error handling patterns.\n- Note authentication or rate-limit considerations.',
    database:   '- Write optimized, readable queries with appropriate indexing hints.\n- Explain the query logic step by step.\n- Flag any potential performance concerns.',
    testing:    '- Cover normal behavior, boundaries, failure paths, and the highest-risk regressions.\n- Use idiomatic patterns for the requested test framework and avoid brittle implementation-detail assertions.\n- Explain what each test protects and note important gaps that require integration or manual testing.',
    architecture:'- Start with requirements, scale, constraints, and quality attributes before proposing components.\n- Explain data flow, interfaces, failure handling, security boundaries, and operational trade-offs.\n- Offer the simplest viable design first, then identify when a more complex design becomes justified.',
    website:    '- Clarify goals, audience, sitemap/pages, brand, and content before building, and pick a concrete tech approach (plain HTML/CSS/JS unless a framework or CMS is specified).\n- Deliver a responsive, accessible design: semantic HTML, sufficient color contrast, keyboard and screen-reader support, and a mobile-first layout.\n- Cover on-page SEO (titles, meta descriptions, heading structure) and performance (optimized assets, minimal render-blocking scripts), then list the concrete deliverables produced.',
    docs:       '- Write for the intended audience — developer, end-user, or both.\n- Include code examples for technical docs.\n- Keep language plain and scannable.',
    explaincode:'- Explain the code from the outside in: purpose, data flow, then important lines or functions.\n- Define unfamiliar terms and call out assumptions or hidden side effects.\n- Include a small example or mental model where it improves understanding.',
    meeting:    '- Separate the summary, decisions, open questions, and action items.\n- Assign owners and due dates only when supported by the source; otherwise mark them as unassigned.\n- Do not invent attendees, commitments, or conclusions.',
    presentation:'- Build a clear narrative arc with an opening, key evidence, and conclusion.\n- Provide slide titles, concise slide content, and optional speaker notes.\n- Match depth and vocabulary to the stated audience and presentation length.',
    report:     '- Start with an executive summary, then organize evidence and recommendations into clear sections.\n- Distinguish facts, assumptions, and interpretations.\n- End with prioritized next steps tied to the report objective.',
    marketing:  '- Align the message, channel, audience, value proposition, and call-to-action.\n- Provide channel-appropriate copy and avoid unsupported claims.\n- Include a practical way to measure whether the campaign worked.',
    support:    '- Acknowledge the customer concern without admitting or inventing facts that are not established.\n- Give only resolution steps, ownership, and timing supported by the supplied information; clearly mark placeholders.\n- Keep the tone calm, empathetic, and appropriate to the severity of the issue.',
    story:      '- Show, don\'t tell — use vivid sensory details.\n- Maintain consistent voice and tense throughout.\n- Build tension through character motivation and conflict.',
    brainstorm: '- Generate several genuinely distinct ideas, ranging from obvious to unconventional, or use the quantity requested.\n- Group related ideas into themes.\n- Flag the 2-3 most promising ideas and explain why.',
    naming:     '- Provide at least 10 name options across different styles (descriptive, abstract, metaphorical).\n- Include a one-line rationale for each.\n- Check for obvious trademark or pronunciation issues.',
    adcopy:     '- Lead with the core benefit or emotional hook.\n- Use active, punchy language — cut every unnecessary word.\n- Include a strong call-to-action.',
    script:     '- Open with a strong hook in the first 10 seconds.\n- Use natural spoken language, not formal prose.\n- Include stage directions or b-roll cues where helpful.',
    podcast:    '- Create a spoken-word structure with a strong opening, clear segments, transitions, and a satisfying close.\n- Distinguish host, co-host, guest, narration, and production cues where relevant.\n- Keep timing realistic and language natural to say aloud.',
    worldbuild: '- Create internally consistent rules for how the world works.\n- Develop history, culture, and conflict that feel lived-in.\n- Leave room for mystery — not everything needs to be explained.',
    design:     '- Translate the goal and audience into a clear visual direction.\n- Specify hierarchy, layout, typography, color, interaction states, and constraints where relevant.\n- Explain how the design choices support usability and the intended mood.',
    lyrics:     '- Establish a consistent point of view, emotional arc, rhyme approach, and song structure.\n- Use original imagery and avoid copying recognizable lyrics or a living artist\'s signature style.\n- Make the words natural to sing and appropriate to the requested genre attributes.',
    summarize:  '- Capture the core argument or main points only — cut supporting detail.\n- Preserve the original meaning, tone, names, numbers, and qualifications; do not add facts.\n- Flag any ambiguities or contradictions in the source material.',
    compare:    '- Use a consistent framework across all options.\n- Surface non-obvious trade-offs, not just the obvious ones.\n- Conclude with a clear recommendation based on the criteria provided.',
    research:   '- Organize findings into clear themes or categories.\n- Distinguish between established facts and emerging or contested claims.\n- Cite verifiable sources when browsing or source material is available; otherwise identify claims that need verification instead of inventing citations.',
    data:       '- Identify the most significant trends and outliers first.\n- Explain what the data suggests and what it cannot tell us.\n- Recommend next steps or further analysis where relevant.',
    insights:   '- Separate direct observations from interpretations and implications.\n- Group findings into themes and prioritize them by relevance or impact.\n- Quote or reference the supplied material when supporting key conclusions.',
    decision:   '- Define the decision, constraints, and evaluation criteria before comparing options.\n- Make trade-offs explicit and identify what additional information could change the choice.\n- End with a recommendation and the strongest reason against it.',
    swot:       '- Be brutally honest — especially about weaknesses and threats.\n- Prioritize the top 3 items in each quadrant.\n- Identify how strengths can be used to exploit opportunities or offset threats.',
    competitor: '- Evaluate on dimensions that matter to the end user, not just surface-level features.\n- Identify white-space opportunities the competitors are missing.\n- Note which competitor strategies are most worth watching.',
    factcheck:  '- Break the material into discrete checkable claims and rate each as supported, contradicted, misleading, unverifiable, or opinion.\n- Prefer primary and high-quality independent sources; explain source limitations and publication dates.\n- Never invent citations. If browsing or source material is unavailable, produce a verification plan and clearly label the result provisional.',
    explain:    '- Start with the simplest possible version of the concept.\n- Use at least one real-world analogy.\n- Build complexity layer by layer, checking for understanding.',
    tutor:      '- Teach interactively in small steps and adapt to the learner level stated.\n- Ask short check-for-understanding questions before increasing difficulty.\n- Give hints before full answers unless the learner requests otherwise.',
    studyplan:  '- Break learning into weekly milestones with specific deliverables.\n- Mix theory, practice, and review sessions.\n- Include recommended resources for each phase.',
    quiz:       '- Vary question types (multiple choice, true/false, short answer).\n- Include an answer key with brief explanations.\n- Calibrate difficulty to the level specified.',
    simplify:   '- Assume zero prior knowledge.\n- Use everyday analogies and avoid jargon entirely.\n- Confirm understanding by summarizing in one final sentence.',
    skill:      '- Identify the 20% of skills that deliver 80% of results.\n- Sequence steps from foundational to advanced.\n- Include practice exercises at each level.',
    translate:  '- Provide the translation and note any nuance lost in translation.\n- Include phonetic pronunciation if helpful.\n- Flag regional variations where relevant.',
    define:     '- Give a plain-language definition first, then the precise meaning in the stated context.\n- Include a concise example and distinguish commonly confused terms.\n- Note when a term has multiple accepted meanings.',
    languagepractice:'- Hold a realistic conversation at the learner\'s level and stay mostly in the target language.\n- Correct important mistakes supportively, explaining one pattern at a time.\n- Adapt difficulty as the learner improves and end with a short vocabulary or grammar recap.',
    practice:   '- Provide exercises at the requested level with a deliberate progression in difficulty.\n- Keep solutions or answer keys separate so the learner can attempt each exercise first.\n- Explain the skill each exercise develops and common mistakes to watch for.',
    roadmap:    '- Define clear phases with entry/exit criteria.\n- Assign ownership or roles to each milestone.\n- Highlight the critical path and biggest risks.',
    checklist:  '- Use short, action-oriented checklist items in a sensible sequence.\n- Separate prerequisites, core steps, verification, and follow-up.\n- Reflect completed work and deadlines supplied by the user without inventing either.',
    strategy:   '- Ground the strategy in the specific context provided — avoid generic frameworks.\n- Identify the 2-3 highest-leverage moves to make first.\n- Define how success will be measured.',
    goals:      '- Make goals SMART: Specific, Measurable, Achievable, Relevant, Time-bound.\n- Include leading indicators, not just outcomes.\n- Suggest a weekly review cadence.',
    habits:     '- Define a small, observable behavior with a clear cue, routine, and immediate reward.\n- Reduce friction for the desired habit and increase friction for the unwanted alternative.\n- Include a realistic minimum version, tracking method, recovery plan after missed days, and review cadence.',
    event:      '- Provide a day-of timeline and a pre-event checklist.\n- Flag the highest-risk logistics items.\n- Include a contingency for the most likely problems.',
    budget:     '- Separate fixed vs. variable costs clearly.\n- Include a contingency buffer of 10-20%.\n- Flag the highest-risk line items.',
    daily:      '- Block deep work for peak energy hours.\n- Include buffer time between tasks.\n- Batch similar tasks together to reduce context switching.',
    travel:     '- Build a realistic day-by-day plan around dates, budget, pace, and interests.\n- Flag reservations, transit time, seasonal constraints, and details that require current verification.\n- Include practical alternatives for weather, closures, or fatigue.',
    // Images subcategories
    photoreal:   '- Specify useful photographic attributes such as viewpoint, focal-length feel, depth of field, exposure character, and medium only when they affect the intended image.\n- Describe the lighting direction, softness, color, environment, and relationship to the subject.\n- Use concrete detail about materials, skin, weather, motion, and composition instead of generic quality tokens.',
    digitalart:  '- Describe visual attributes and movements such as hand-painted animation, ligne claire, painterly, or geometric abstraction without imitating a living artist.\n- Include medium details: oil painting, watercolor, vector, pixel art.\n- Specify color mood: warm palette, desaturated, high contrast.\n- Add concrete quality cues such as crisp edges, controlled texture, or finely rendered detail.',
    logo:        '- Keep the concept minimal and geometric so the mark remains clear at small sizes.\n- Specify flat or dimensional treatment, monochrome or color, icon plus wordmark or icon only, and brand personality.\n- Prefer generating the symbol separately from exact lettering because image models may render typography unreliably.',
    character:   '- Describe physical features, clothing, expression, and pose in sequence.\n- Specify art style: anime, realistic, cartoon, comic book.\n- Add background context: standing against, in a world of.\n- Include: full body / portrait / bust shot, high detail, character sheet if multiple angles needed.',
    productimage:'- Make the product the unmistakable focal point and preserve its defining shape, materials, colors, and branding.\n- Specify background, lighting, camera angle, composition, intended placement, and aspect ratio.\n- Avoid adding unsupported text, logos, accessories, or product features.',
    scene:       '- Set an intentional viewpoint such as wide, aerial, eye-level, or street-level.\n- Layer foreground, midground, and background elements to create depth.\n- Describe weather, atmosphere, light, scale, color, and focal hierarchy with observable terms.',
    abstract:    '- Lead with the emotion or concept rather than literal objects.\n- Specify a visual language such as geometric, fluid, fractal, glitch, ink wash, or color-field abstraction.\n- Define palette, temperature, saturation, texture, rhythm, negative space, and composition.',
    uimockup:    '- Define the device, viewport, screen purpose, information hierarchy, navigation, components, states, and accessibility needs.\n- Specify visual system details such as spacing, typography character, color roles, elevation, and interaction feedback.\n- Keep on-screen text short and treat generated lettering as a layout placeholder that may need recreation in a design tool.',
    infographic: '- Organize the information into a clear reading order with a title, a small number of sections, and one dominant takeaway.\n- Specify chart or diagram forms, icon style, palette, aspect ratio, and brand constraints.\n- Keep labels brief and treat generated lettering or precise data as placeholders that must be verified and recreated if necessary.',
    // Freestyle subcategories
    quickanswer: '- Answer in the fewest words that fully address the question.\n- Lead with the direct answer, then add any essential context.\n- No preamble, no filler.',
    roleplay:    '- Stay fully in character throughout — do not break character to add disclaimers.\n- Adapt vocabulary, tone, and knowledge to the character\'s perspective.\n- Drive the narrative forward with each response.',
    debate:      '- Present each side with equal rigor — steelman every position.\n- Use evidence and reasoning, not rhetoric.\n- Conclude with a balanced summary, not a winner.',
    feedback:    '- Lead with the strongest aspects before critiquing.\n- Be specific: quote or reference the exact parts you\'re addressing.\n- End with 2-3 concrete, prioritized action items.',
    rewrite:     '- Preserve the original meaning, facts, names, numbers, and qualifications while improving clarity and flow.\n- Adjust tone and vocabulary to match the target audience without introducing new claims.\n- Highlight the 2-3 most impactful changes made.',
    open:        '- Interpret the request generously and deliver exactly what was asked.\n- Choose the most useful format for the content — prose, list, table, code.\n- Be direct: start with the answer, not the setup.',
  };

  const baseInstr = base[category] || '- Be thorough and specific.\n- Structure your response clearly.';
  const extraInstr = subcatId && extra[subcatId] ? '\n' + extra[subcatId] : '';
  return baseInstr + extraInstr;
}

/* ═══════════════════════════════════════════
   COPY
═══════════════════════════════════════════ */
function copyPrompt() {
  doCopy(document.getElementById('result-prompt').value, 'copy-btn', 'copy-icon', 'copy-label');
}
function viewCopy() {
  doCopy(document.getElementById('view-prompt').value, 'view-copy-btn', 'view-copy-icon', 'view-copy-label');
}
function setCopyGlyph(iconId, name) {
  const glyph = document.getElementById(iconId);
  if (glyph) glyph.replaceChildren(icon(name));
}
function doCopy(text, btnId, iconId, labelId) {
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById(btnId).classList.add('copied');
    setCopyGlyph(iconId, 'check');
    document.getElementById(labelId).textContent = 'Copied!';
    announce('Prompt copied to clipboard.');
    setTimeout(() => resetCopy(btnId, iconId, labelId), 2500);
  }).catch(() => {
    setCopyGlyph(iconId, 'alert');
    document.getElementById(labelId).textContent = 'Copy failed';
    announce('Copy failed. Select the prompt text and copy it manually.');
    setTimeout(() => resetCopy(btnId, iconId, labelId), 2500);
  });
}
function resetCopy(btnId, iconId, labelId) {
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.remove('copied');
  setCopyGlyph(iconId, 'copy');
  const lbl = document.getElementById(labelId);
  if (lbl) lbl.textContent = 'Copy';
}

async function copyAndOpenSelectedAI() {
  const destination = getAiMeta(state.ai);
  const prompt = document.getElementById('result-prompt').value;
  if (!destination || !prompt) return;

  const label = document.getElementById('open-ai-label');
  try {
    await navigator.clipboard.writeText(prompt);
    label.textContent = `Copied — opening ${destination.label}…`;
  } catch (error) {
    label.textContent = 'Copy failed — try the Copy button';
    announce('Copy failed. Use the Copy button or select the prompt text manually.');
    setTimeout(() => {
      label.textContent = `Copy & Open ${destination.label}`;
    }, 2500);
    return;
  }

  const AppLauncher = window.Capacitor?.Plugins?.AppLauncher;
  try {
    if (AppLauncher) {
      if (destination.appUrl) {
        try {
          const { value: appInstalled } = await AppLauncher.canOpenUrl({ url: destination.appUrl });
          if (appInstalled) {
            await AppLauncher.openUrl({ url: destination.appUrl });
            return;
          }
        } catch (error) {
          // If the native check fails, continue to the web destination.
        }
      }
      await AppLauncher.openUrl({ url: destination.url });
    } else {
      window.open(destination.url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    window.open(destination.url, '_blank', 'noopener,noreferrer');
  } finally {
    setTimeout(() => {
      label.textContent = `Copy & Open ${destination.label}`;
    }, 1500);
  }
}

/* ═══════════════════════════════════════════
   RATINGS
═══════════════════════════════════════════ */
const APP_STORE_ID = '6802508418';
const PLAY_STORE_ID = 'com.sandboxdigitallabs.promptcept';
const REVIEW_STATE_KEY = 'pcReviewV1';
const REVIEW_PROMPT_AFTER = 3;
const REVIEW_COOLDOWN_DAYS = 120;

function readReviewState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_STATE_KEY) || '{}');
    return {
      generated: Number(parsed.generated) || 0,
      lastAskedAt: Number(parsed.lastAskedAt) || 0,
    };
  } catch (error) {
    return { generated: 0, lastAskedAt: 0 };
  }
}

function writeReviewState(reviewState) {
  try {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(reviewState));
  } catch (error) {
    // An unavailable store only costs us the rating prompt.
  }
}

// Asks the system to consider its native rating prompt once the user has built
// a few prompts. iOS decides whether anything appears and how often, so this
// stays silent when the quota is spent or the plugin is absent.
async function maybeRequestReview() {
  const reviewState = readReviewState();
  reviewState.generated += 1;

  const AppReview = window.Capacitor?.Plugins?.AppReview;
  const cooldownMs = REVIEW_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  if (AppReview
    && reviewState.generated >= REVIEW_PROMPT_AFTER
    && Date.now() - reviewState.lastAskedAt > cooldownMs) {
    try {
      await AppReview.requestReview();
      reviewState.lastAskedAt = Date.now();
    } catch (error) {
      console.warn('Rating prompt unavailable.', error);
    }
  }

  writeReviewState(reviewState);
}

// Opens the store's review page (App Store, or Google Play on Android). Used by the
// Settings button, where the user has explicitly chosen to leave a rating.
async function rateApp() {
  const url = window.Capacitor?.getPlatform?.() === 'android'
    ? `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`
    : `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
  const AppLauncher = window.Capacitor?.Plugins?.AppLauncher;
  try {
    if (AppLauncher) {
      await AppLauncher.openUrl({ url });
      return;
    }
  } catch (error) {
    // Fall through to the browser destination.
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ═══════════════════════════════════════════
   SAVED PROMPTS
═══════════════════════════════════════════ */
function savePrompt() {
  const id = Date.now();
  const now = Date.now();
  activeSavedPromptId = id;
  savedPrompts.unshift({
    id,
    name: state.name,
    ai: state.ai,
    category: state.category,
    subcategory: state.subcategory,
    task: state.task,
    clarification: state.clarification,
    prompt: state.prompt,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  });
  persist();
}

function findActiveSavedPrompt() {
  return savedPrompts.find(prompt => prompt.id === activeSavedPromptId);
}

function updateSavedPrompt() {
  const prompt = findActiveSavedPrompt();
  if (prompt) {
    prompt.prompt = state.prompt;
    prompt.updatedAt = Date.now();
    persist();
  }
}

function saveResultEdit() {
  const prompt = findActiveSavedPrompt();
  if (!prompt) return;
  const value = document.getElementById('result-prompt').value;
  state.prompt = value;
  prompt.prompt = value;
  prompt.updatedAt = Date.now();
  persist();
  announce('Prompt changes saved.');
}

function saveViewedPromptEdit() {
  const prompt = findActiveSavedPrompt();
  if (!prompt) return;
  const value = document.getElementById('view-prompt').value;
  prompt.prompt = value;
  prompt.updatedAt = Date.now();
  persist();
  updateTemplateHint();
  announce('Prompt changes saved.');
}

function updateFavoriteButton() {
  const prompt = findActiveSavedPrompt();
  const button = document.getElementById('favorite-btn');
  if (!button) return;
  const isFavorite = Boolean(prompt?.favorite);
  button.replaceChildren(
    icon('star', isFavorite ? 'icon-fill' : 'icon'),
    document.createTextNode(isFavorite ? 'Remove from Favorites' : 'Add to Favorites'),
  );
}

function toggleFavorite() {
  const prompt = findActiveSavedPrompt();
  if (!prompt) return;
  prompt.favorite = !prompt.favorite;
  prompt.updatedAt = Date.now();
  persist();
  updateFavoriteButton();
  announce(prompt.favorite ? 'Added to favorites.' : 'Removed from favorites.');
}

function duplicateActivePrompt() {
  const prompt = findActiveSavedPrompt();
  if (!prompt) return;
  const now = Date.now();
  const copy = {
    ...prompt,
    id: now,
    name: `${prompt.name} Copy`,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
  savedPrompts.unshift(copy);
  activeSavedPromptId = copy.id;
  const searchInput = document.getElementById('prompt-search');
  if (searchInput) searchInput.value = '';
  persist();
  goTo('screen-home');
  announce('Prompt duplicated.');
}

function exportPrompts() {
  const payload = {
    app: 'PromptCept',
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts: savedPrompts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'promptcept-prompts.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  announce('Prompt backup exported.');
}

async function importPrompts(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Backup exceeds the 5 MB limit.');
    const payload = JSON.parse(await file.text());
    if (payload?.app !== 'PromptCept' || payload?.version !== 1 || !Array.isArray(payload.prompts)) {
      throw new Error('This is not a supported PromptCept backup.');
    }
    if (payload.prompts.length > 1000) throw new Error('Backup contains too many prompts.');
    const imported = payload.prompts.map(normalizePromptRecord);
    if (imported.some(prompt => !prompt)) throw new Error('Backup contains an invalid prompt record.');

    const byId = new Map(savedPrompts.map(prompt => [prompt.id, prompt]));
    for (const prompt of imported) {
      const existing = byId.get(prompt.id);
      if (!existing || prompt.updatedAt > existing.updatedAt) byId.set(prompt.id, prompt);
    }
    const restoredPrompts = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!persist(restoredPrompts)) throw new Error('Prompt backup could not be saved on this device.');
    savedPrompts = restoredPrompts;
    renderList();
    announce(`${imported.length} prompts restored from backup.`);
  } catch (error) {
    console.warn('Unable to import PromptCept backup.', error);
    announce(error.message || 'Prompt backup could not be imported.');
  } finally {
    input.value = '';
  }
}

function persist(prompts = savedPrompts) {
  try {
    localStorage.setItem('aiPromptsV2', JSON.stringify(prompts));
    if (prompts === savedPrompts) renderList();
    return true;
  } catch (error) {
    console.error('Unable to save prompts locally.', error);
    announce('This prompt could not be saved on this device.');
    return false;
  }
}

function deleteAllData() {
  if (!confirm('Delete all saved prompts from this device? This cannot be undone.')) return;
  localStorage.removeItem('aiPromptsV2');
  localStorage.removeItem('aiProStatus'); // clean up data from pre-release builds
  savedPrompts = [];
  renderList();
  alert('All saved prompts have been deleted.');
  goTo('screen-home');
}

function deletePromptById(id, event) {
  event?.stopPropagation();
  savedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
  if (activeSavedPromptId === id) activeSavedPromptId = null;
  persist();
}

function toggleFavoriteById(id, event) {
  event?.stopPropagation();
  const prompt = savedPrompts.find(item => item.id === id);
  if (!prompt) return;
  prompt.favorite = !prompt.favorite;
  prompt.updatedAt = Date.now();
  persist();
  announce(prompt.favorite ? 'Added to favorites.' : 'Removed from favorites.');
}

function createEmptyState(iconName, message) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  const iconElement = document.createElement('div');
  iconElement.className = 'empty-icon';
  iconElement.append(icon(iconName));
  empty.append(iconElement, document.createTextNode(message));
  return empty;
}

function getVisiblePrompts() {
  const query = document.getElementById('prompt-search')?.value.trim().toLowerCase() || '';
  const terms = query.split(/\s+/).filter(Boolean);
  return savedPrompts
    .filter(prompt => {
      if (!terms.length) return true;
      const ai = AI_META[prompt.ai];
      const category = CAT_META[prompt.category];
      const subcategory = getSubcatLabel(prompt.category, prompt.subcategory);
      const haystack = [prompt.name, prompt.task, prompt.prompt, ai?.label, category?.label, subcategory]
        .join(' ').toLowerCase();
      return terms.every(term => haystack.includes(term));
    })
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || b.updatedAt - a.updatedAt);
}

function renderList() {
  const list = document.getElementById('prompt-list');
  const searchInput = document.getElementById('prompt-search');
  if (savedPrompts.length === 0) searchInput.value = '';
  list.replaceChildren();
  if (savedPrompts.length === 0) {
    list.append(createEmptyState('note', 'No saved prompts yet. Your first prompt will appear here.'));
    return;
  }

  const visiblePrompts = getVisiblePrompts();
  if (visiblePrompts.length === 0) {
    list.append(createEmptyState('search', 'No matching prompts.'));
    return;
  }

  for (const prompt of visiblePrompts) {
    const ai = getAiMeta(prompt.ai) || NO_AI_META;
    const category = CAT_META[prompt.category];
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open saved prompt ${prompt.name}`);
    card.addEventListener('click', () => viewSavedById(prompt.id));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        viewSavedById(prompt.id);
      }
    });

    const meta = document.createElement('div');
    meta.className = 'prompt-card-meta';
    const dot = document.createElement('div');
    dot.className = 'prompt-card-icon';
    dot.append(icon(category.icon));
    const text = document.createElement('div');
    text.className = 'prompt-card-text';
    const name = document.createElement('div');
    name.className = 'prompt-card-name';
    name.textContent = prompt.name;
    const subtitle = document.createElement('div');
    subtitle.className = 'prompt-card-sub';
    subtitle.textContent = `${category.label} · ${ai.label}`;
    text.append(name, subtitle);
    meta.append(dot, text);

    const actions = document.createElement('div');
    actions.className = 'prompt-card-actions';
    const favorite = document.createElement('button');
    favorite.className = 'favorite-card-btn';
    favorite.type = 'button';
    favorite.append(icon('star', prompt.favorite ? 'icon-fill' : 'icon'));
    favorite.setAttribute('aria-pressed', String(Boolean(prompt.favorite)));
    favorite.setAttribute('aria-label', `${prompt.favorite ? 'Remove' : 'Add'} ${prompt.name} ${prompt.favorite ? 'from' : 'to'} favorites`);
    favorite.addEventListener('click', event => toggleFavoriteById(prompt.id, event));
    const remove = document.createElement('button');
    remove.className = 'delete-btn';
    remove.type = 'button';
    remove.append(icon('trash'));
    remove.setAttribute('aria-label', `Delete ${prompt.name}`);
    remove.addEventListener('click', event => deletePromptById(prompt.id, event));
    const arrow = document.createElement('div');
    arrow.className = 'prompt-card-chevron';
    arrow.append(icon('chev-right'));
    actions.append(favorite, remove, arrow);
    card.append(meta, actions);
    list.append(card);
  }
}

function viewSavedById(id) {
  const p = savedPrompts.find(prompt => prompt.id === id);
  if (!p) return;
  activeSavedPromptId = p.id;
  const ai = getAiMeta(p.ai) || NO_AI_META;
  document.getElementById('view-title').textContent = p.name;
  document.getElementById('view-goal').textContent = p.task;
  const badge = document.getElementById('view-ai-badge');
  badge.textContent = ai.label;
  badge.className = `result-ai-badge ${ai.color}`;
  const ta = document.getElementById('view-prompt');
  ta.value = p.prompt;
  autoResizeTA(ta);
  resetCopy('view-copy-btn', 'view-copy-icon', 'view-copy-label');
  updateFavoriteButton();
  updateTemplateHint();
  goTo('screen-view');
}

function viewSaved(index) {
  const prompt = savedPrompts[index];
  if (prompt) viewSavedById(prompt.id);
}

/* ═══════════════════════════════════════════
   PROMPT COACH
   Offline and rule-based. Looks for the details that most often improve a
   prompt (audience, format, tone, limits, source material, what success
   looks like) and offers up to three missing ones as one-tap additions to
   the review screen's details box. The answers are plain text in that box.
═══════════════════════════════════════════ */
const COACH_QUESTIONS = {
  audience: {
    field: 'Audience', ask: 'Who is it for?',
    seen: /\b(audience|readers?|customers?|clients?|students?|beginners?|experts?|kids?|children|teens?|teenagers?|team|managers?|boss|investors?|users?|colleagues?|parents?|patients?|recruiters?|employees|stakeholders)\b/i,
  },
  format: {
    field: 'Format', ask: 'What format should the result take?',
    seen: /\b(format|bullets?|table|list|json|csv|markdown|outline|paragraphs?|steps?|checklist|code block|headlines?|slides?|sentences?|words?|pages?|characters?|aspect ratio)\b/i,
  },
  tone: {
    field: 'Tone or style', ask: 'What tone or style?',
    seen: /\b(tone|style|formal|casual|friendly|professional|funny|humou?r|serious|warm|playful|persuasive|confident|empathetic|concise|technical|plain|mood|cinematic|minimal)\b/i,
  },
  constraints: {
    field: 'Must include or avoid', ask: 'Anything it must include or avoid?',
    seen: /\b(must|should not|shouldn'?t|avoid|don'?t|do not|never|without|only|at most|at least|no more than|under \d+|limit|maximum|deadline|budget)\b/i,
  },
  source: {
    field: 'Example or source', ask: 'Any example or source to work from?',
    seen: /\b(example|for instance|such as|like this|here is|here's|below|attached|following|based on|source|reference)\b|"[^"]{8,}"/i,
  },
  success: {
    field: 'Success looks like', ask: 'What does a great result look like?',
    seen: /\b(goal|so that|in order to|outcome|success|aim|objective|by the end)\b/i,
  },
};
// Which questions matter most for each category, most useful first.
const COACH_ORDER = {
  writing:   ['audience', 'tone', 'format', 'constraints', 'source', 'success'],
  coding:    ['source', 'constraints', 'format', 'success'],
  business:  ['audience', 'success', 'format', 'constraints', 'tone'],
  creative:  ['tone', 'audience', 'constraints', 'format', 'source'],
  analysis:  ['source', 'format', 'audience', 'success', 'constraints'],
  learning:  ['audience', 'format', 'success', 'constraints'],
  planning:  ['constraints', 'success', 'format', 'audience'],
  images:    ['tone', 'constraints', 'format'],
  freestyle: ['audience', 'format', 'constraints'],
};
const COACH_MAX = 3;
let coachQuestions = [];

// The (at most three) questions whose answer the request does not already contain.
function getCoachQuestions(category, text) {
  return (COACH_ORDER[category] || COACH_ORDER.freestyle)
    .filter(id => !COACH_QUESTIONS[id].seen.test(text))
    .slice(0, COACH_MAX)
    .map(id => ({ id, ...COACH_QUESTIONS[id] }));
}

function hasCoachLine(details, field) {
  const label = `${field.toLowerCase()}:`;
  return details.split('\n').some(line => line.trim().toLowerCase().startsWith(label));
}

// Called on every keystroke in the details box too, so a question disappears
// as soon as its line is in the box.
function renderCoach() {
  const details = document.getElementById('prompt-clarification').value;
  const open = coachQuestions.filter(question => !hasCoachLine(details, question.field));
  const chips = document.getElementById('coach-chips');
  document.getElementById('coach').hidden = open.length === 0;
  const shown = open.map(question => question.id).join();
  if (chips.dataset.shown === shown) return;
  chips.dataset.shown = shown;
  chips.replaceChildren(...open.map(question => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'coach-chip';
    chip.dataset.click = 'addCoachDetail';
    chip.dataset.arg = question.id;
    chip.append(icon('plus'), document.createTextNode(question.ask));
    return chip;
  }));
}

function addCoachDetail(id) {
  const question = COACH_QUESTIONS[id];
  const box = document.getElementById('prompt-clarification');
  const current = box.value.trimEnd();
  const next = `${current}${current ? '\n' : ''}${question.field}: `;
  if (next.length > box.maxLength) {
    announce('There is no room left in the details box.');
    return;
  }
  box.value = next;
  box.focus();
  box.setSelectionRange(next.length, next.length);
  renderCoach();
  announce(`${question.field} added. Type your answer.`);
}

// Drops coach lines left blank (such as "Audience:") so they never reach the prompt.
function cleanClarification(text) {
  const blanks = Object.values(COACH_QUESTIONS).map(question => `${question.field.toLowerCase()}:`);
  return text.split('\n').filter(line => !blanks.includes(line.trim().toLowerCase())).join('\n').trim();
}

/* ═══════════════════════════════════════════
   TEMPLATES
   A template is a prompt with {fill_in} fields. Using one asks for a value
   for each field and saves a fresh, filled-in copy. Any saved prompt that
   contains {fields} can be used the same way, so no extra data is stored.
═══════════════════════════════════════════ */
const VARIABLE_PATTERN = /\{([a-z][a-z0-9_]{0,29})\}/g;
const VARIABLE_HINTS = new Map(Object.entries({
  recipient: 'e.g. my manager, a new client', goal: 'e.g. get approval for the budget',
  tone: 'e.g. warm and professional', key_points: 'A short list is fine',
  audience: 'e.g. busy managers, first-year students', text: 'Paste it here',
  topic: 'e.g. working from home', word_count: 'e.g. 800', platform: 'e.g. LinkedIn, Instagram',
  language: 'e.g. Python, Swift', error: 'Paste the error or describe the bug',
  expected: 'What should happen instead?', focus: 'e.g. security, readability',
  framework: 'e.g. pytest, Jest', constraints: 'e.g. no extra libraries',
  level: 'e.g. complete beginner', code: 'Paste it here', duration: 'e.g. 30 minutes',
  meeting_goal: 'e.g. agree the Q3 plan', attendees: 'e.g. design, sales, two leads',
  project: 'e.g. website relaunch', notes: 'Paste your rough notes',
  issue: 'e.g. the order arrived damaged', resolution: 'e.g. a refund or a replacement',
  product: 'e.g. insulated travel mug', features: 'The main features and facts',
  role: 'e.g. product designer', company: 'e.g. Acme Corp', strengths: 'Skills, experience, results',
  count: 'e.g. 10', thing: 'e.g. a coffee subscription', vibe: 'e.g. friendly and modern',
  avoid: 'e.g. puns, anything too long', genre: 'e.g. mystery', character: 'e.g. a retired detective',
  setting: 'e.g. a small coastal town', length: 'e.g. five bullet points',
  options: 'e.g. Notion, Obsidian, Evernote', criteria: 'e.g. price, ease of use, privacy',
  decision: 'e.g. moving to a new city for work', context: 'What matters and what is fixed?',
  skill: 'e.g. basic statistics', weeks: 'e.g. 6', hours: 'e.g. 5', target_language: 'e.g. Spanish',
  scenario: 'e.g. ordering at a restaurant', days: 'e.g. 5', destination: 'e.g. Lisbon',
  interests: 'e.g. food and history', budget: 'e.g. $150 a day', deadline: 'e.g. March 31',
  priorities: 'Your top three', commitments: 'Meetings, school runs, appointments',
  habit: 'e.g. walk for 20 minutes', obstacle: 'e.g. I forget in the evening',
  subject: 'e.g. a fox in a snowy forest', scene: 'e.g. a misty forest at dawn',
  lighting: 'e.g. soft morning light', mood: 'e.g. calm and quiet', brand: 'e.g. Northwind Coffee',
  style: 'e.g. minimal and modern', colors: 'e.g. navy and warm yellow',
  background: 'e.g. a white marble surface',
}));

// Ordered as they appear on screen. Keep names short: the first short value a
// user types is appended to the name of the prompt that gets saved.
const TEMPLATES = [
  {
    category: 'writing', name: 'Write an email',
    about: 'A clear email with a subject line and one next step.',
    body: `Write an email to {recipient}.

Goal: {goal}
Tone: {tone}
Points to cover:
{key_points}

Keep it as short as it can be while staying clear. Put the main request in the first two sentences, end with one specific next step, and suggest a subject line.`,
  },
  {
    category: 'writing', name: 'Rewrite in a new tone',
    about: 'Change how a draft sounds without changing what it says.',
    body: `Rewrite the text below in a {tone} tone for {audience}.

Keep the meaning and every fact the same. Improve clarity and flow, cut filler, and do not add claims that are not in the original. After the rewrite, list the three most important changes you made.

Text:
{text}`,
  },
  {
    category: 'writing', name: 'Blog post draft',
    about: 'A structured first draft written for one specific reader.',
    body: `Write a blog post about {topic} for {audience}.

Length: about {word_count} words.

Open with a hook that names the reader's problem. Use clear subheadings, give one concrete example or short story per section, and finish with a brief takeaway and one next step. Use plain language and avoid filler openings.`,
  },
  {
    category: 'writing', name: 'Social media post',
    about: 'Three post options, each tuned to the platform.',
    body: `Write three different {platform} posts about {topic} for {audience}.

Vary the angle: one practical tip, one personal or story-led post, and one question that invites replies. Match the norms of {platform} for length and formatting, lead with the strongest line, and avoid cliches and empty hype. Suggest hashtags only if they suit the platform.`,
  },
  {
    category: 'writing', name: 'Proofread and tighten',
    about: 'Fix errors and trim wordiness, and see what changed.',
    body: `Proofread the text below.

Fix spelling, grammar, and punctuation, and tighten wordy sentences without changing the meaning or my voice. Show the corrected text first, then a short list of the substantive edits so I can accept or reject them.

Text:
{text}`,
  },
  {
    category: 'coding', name: 'Explain this code',
    about: 'A walkthrough pitched at the level you choose.',
    body: `Explain the {language} code below to someone at this level: {level}.

Start with what it does in one or two sentences, then walk through it in the order it runs. Define any term a person at that level might not know, point out anything surprising or risky, and finish with one way to improve it.

Code:
{code}`,
  },
  {
    category: 'coding', name: 'Debug an error',
    about: 'Likely causes ranked, with the smallest fix first.',
    body: `Help me debug this {language} problem.

Error or wrong behavior:
{error}

What I expected:
{expected}

Code:
{code}

Explain the most likely cause first, then show the smallest fix. If several causes are plausible, rank them and tell me how to confirm each one. Do not rewrite code that is not part of the problem.`,
  },
  {
    category: 'coding', name: 'Review code',
    about: 'Problems ordered by severity, each with a concrete fix.',
    body: `Review the {language} code below with a focus on {focus}.

List problems in order of severity. For each one, say where it is, why it matters, and show a concrete fix. Mention what is already done well in one short paragraph. Do not rewrite everything or change the style unless it causes a problem.

Code:
{code}`,
  },
  {
    category: 'coding', name: 'Write unit tests',
    about: 'Normal cases, edge cases, and error paths.',
    body: `Write unit tests in {language} using {framework} for the code below.

Cover the normal cases, boundary values, invalid input, and any error paths. Name each test after the behavior it checks and keep each test small and independent. If the code is hard to test as written, say why and suggest the smallest change.

Code:
{code}`,
  },
  {
    category: 'coding', name: 'Write a function',
    about: 'A small, well-handled function with example calls.',
    body: `Write a {language} function that does the following: {goal}

Constraints: {constraints}

Handle edge cases and invalid input. Use clear names, add short comments only where the reason is not obvious, and finish with two example calls and their expected results.`,
  },
  {
    category: 'business', name: 'Meeting agenda',
    about: 'Timed items with owners and a clear outcome.',
    body: `Create an agenda for this meeting: {meeting_goal}

Attendees: {attendees}
Length: {duration}

Give each item a time limit and an owner, put decisions that need everyone first, and finish with a short slot for next steps. Add one sentence at the top stating what a good outcome looks like.`,
  },
  {
    category: 'business', name: 'Weekly status update',
    about: 'Progress, plans, risks, and what you need.',
    body: `Write a weekly status update for {project}, for {audience}.

My notes:
{notes}

Use four short sections: progress, next week, risks or blockers, and what I need from the reader. Lead with the single most important thing. Be specific, use the numbers I gave, and do not invent details that are not in my notes.`,
  },
  {
    category: 'business', name: 'Customer reply',
    about: 'A calm, specific reply that promises only what you can do.',
    body: `Write a reply to a customer.

What happened: {issue}
What we can offer: {resolution}
Tone: {tone}

Acknowledge the problem in the first sentence without blaming the customer, explain what happens next in plain words, and keep it under 150 words. Do not promise anything beyond what I listed.`,
  },
  {
    category: 'business', name: 'Product description',
    about: 'Benefit-led copy, plus a 50-word short version.',
    body: `Write a product description for {product}, aimed at {audience}.

Key features and facts:
{features}

Lead with the main benefit, not the feature list. Turn each feature into what it means for the buyer, keep claims honest and specific, and finish with a short line that invites the next step. Also give me a short version of about 50 words.`,
  },
  {
    category: 'business', name: 'Cover letter',
    about: 'About 250 words that connect your strengths to the role.',
    body: `Write a cover letter for the {role} role at {company}.

My strengths and relevant experience:
{strengths}

Keep it to about 250 words. Open with why this role and this company, connect two or three of my strengths to what the role needs with specific examples, and close with a confident, brief call to action. Do not invent experience, skills, or credentials that I did not list.`,
  },
  {
    category: 'creative', name: 'Brainstorm ideas',
    about: 'A mix of safe, bold, and unusual ideas, with a top three.',
    body: `Brainstorm ideas for {topic}.

Number of ideas: {count}
Constraints: {constraints}

Include a mix of safe, bold, and unusual ideas. Give each idea a short name and one sentence on why it could work. Then pick your top three and say what you would test first.`,
  },
  {
    category: 'creative', name: 'Name ideas',
    about: 'Fifteen names grouped by style, with your top three.',
    body: `Suggest 15 names for {thing}.

The names should feel {vibe}. Avoid: {avoid}

Mix short and descriptive options, group them by style, and flag any that are hard to spell or say aloud. Pick your top three and explain why.`,
  },
  {
    category: 'creative', name: 'Short story',
    about: 'About 800 words with a clear want and a real obstacle.',
    body: `Write a short story in the {genre} genre, about 800 words.

Main character: {character}
Setting: {setting}

Open in the middle of something happening, give the character a clear want and a real obstacle, and end with a change rather than a summary. Show feelings through actions and details, and avoid cliches in the first and last lines.`,
  },
  {
    category: 'analysis', name: 'Summarize a document',
    about: 'Conclusion first, then the points that matter.',
    body: `Summarize the text below for {audience} in {length}.

Lead with the main conclusion, then the key supporting points, then anything that needs a decision or follow-up. Keep the original meaning, do not add facts that are not in the text, and mark anything that is unclear or missing.

Text:
{text}`,
  },
  {
    category: 'analysis', name: 'Compare options',
    about: 'A comparison table and a clear recommendation.',
    body: `Compare these options: {options}

Judge them on: {criteria}

Present a table with one row per option and one column per criterion, then give a short written verdict. State your assumptions, point out where the choice depends on my situation, and say which option you would pick and why.`,
  },
  {
    category: 'analysis', name: 'Weigh a decision',
    about: 'Arguments for and against, then a recommendation.',
    body: `Help me decide: {decision}

Context and constraints:
{context}

List the strongest arguments for and against, including risks that are easy to overlook. Say what information would change the answer, then give a recommendation with your confidence level and the first step to take.`,
  },
  {
    category: 'learning', name: 'Explain a concept',
    about: 'A plain definition, an analogy, an example, and a check.',
    body: `Explain {topic} to someone at this level: {level}.

Start with a one-sentence plain definition, then use one everyday analogy and one worked example. Point out the most common misunderstanding, and end with three questions I can use to check that I understood.`,
  },
  {
    category: 'learning', name: 'Study plan',
    about: 'Weekly goals, practice tasks, and self-tests.',
    body: `Create a study plan for {skill} over {weeks} weeks, with about {hours} hours available each week.

Break it into weekly goals with specific topics, practice tasks, and a short self-test at the end of each week. Put the foundations first, say what to skip if time runs short, and suggest how to tell when I am ready to move on.`,
  },
  {
    category: 'learning', name: 'Quiz me',
    about: 'One question at a time, with feedback and a final score.',
    body: `Quiz me on {topic}.

Ask {count} questions at this level: {level}. Ask one question at a time and wait for my answer before continuing. After each answer, tell me whether I was right, explain the correct answer briefly, and adjust the difficulty. Finish with a score and the topics I should review.`,
  },
  {
    category: 'learning', name: 'Practice a language',
    about: 'A conversation partner that corrects you as you go.',
    body: `Be my {target_language} conversation partner. My level is {level}.

Scenario: {scenario}

Reply mostly in {target_language} with short, natural sentences at my level. After each of my messages, correct my mistakes in one line, then continue the conversation. Ask me a question each turn.`,
  },
  {
    category: 'planning', name: 'Trip itinerary',
    about: 'Day-by-day plan grouped by area, with a rainy-day backup.',
    body: `Plan a trip to {destination}.

Length: {days} days
Interests: {interests}
Budget: {budget}

Give a day-by-day itinerary with morning, afternoon, and evening, grouped by area to limit travel time. Include rough costs, one backup option for bad weather, and booking tips for anything that sells out.`,
  },
  {
    category: 'planning', name: 'Project plan',
    about: 'Phases, milestones, risks, and what to cut first.',
    body: `Create a plan for this project: {project}

Deadline: {deadline}
Constraints and resources: {constraints}

Break the work into phases with milestones, owners, and dependencies. Highlight the critical path, list the top risks with a mitigation for each, and say what you would cut first if time runs short.`,
  },
  {
    category: 'planning', name: 'Weekly schedule',
    about: 'Hard work placed when your energy is highest.',
    body: `Build a schedule for my week.

My top priorities: {priorities}
Hours available for focused work: {hours}
Fixed commitments: {commitments}

Place the most demanding work when I have the most energy, leave breaks and buffer time, and point out anything that does not fit so I can decide what to drop.`,
  },
  {
    category: 'planning', name: 'Build a habit',
    about: 'A tiny start, a trigger, tracking, and a plan for slips.',
    body: `Help me build this habit: {habit}

What usually gets in my way: {obstacle}

Design a plan that starts almost too small, ties the habit to something I already do each day, and gives me a way to track progress. Include what to do after a missed day and how to scale up after two weeks.`,
  },
  {
    category: 'images', name: 'Photo-style image',
    about: 'A realistic photo with one clear focal point.',
    body: `Create a realistic photograph of {subject} in {scene}.

Lighting: {lighting}
Mood: {mood}

Describe the camera angle, lens feel, and depth of field, and keep the composition simple with one clear focal point. Avoid text, watermarks, and distorted faces or hands.`,
  },
  {
    category: 'images', name: 'Logo concept',
    about: 'A simple mark that works small and in one color.',
    body: `Design a logo concept for {brand}.

Style: {style}
Colors: {colors}

Use a simple, memorable shape that stays clear at small sizes and works in one color. Describe the symbol and how it relates to the brand. Do not include text or lettering in the image; I will add the name separately.`,
  },
  {
    category: 'images', name: 'Product photo',
    about: 'A clean studio shot with room for text later.',
    body: `Create a product photo of {product} on {background}.

Style: {style}

Light it softly from one side with a gentle shadow, keep the product sharp and centered, and leave clean space around it for adding text later. Show true colors and realistic materials, with no extra objects and no text.`,
  },
];
let activeTemplate = null;

function findVariables(text) {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map(match => match[1]))];
}

// One pass, so a value that itself contains {braces} is never filled in again.
function fillVariables(text, values) {
  return text.replace(VARIABLE_PATTERN, (match, name) => (values.has(name) ? values.get(name) : match));
}

function humanizeVariable(name) {
  const words = name.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function openTemplates() {
  renderTemplateList();
  goTo('screen-templates');
}

function renderTemplateList() {
  const list = document.getElementById('template-list');
  if (list.childElementCount) return; // built once
  for (const [category, categoryMeta] of Object.entries(CAT_META)) {
    const templates = TEMPLATES.filter(template => template.category === category);
    if (!templates.length) continue;
    const heading = document.createElement('div');
    heading.className = 'section-label';
    heading.textContent = categoryMeta.label;
    const group = document.createElement('div');
    group.className = 'prompt-list';
    for (const template of templates) group.append(makeTemplateRow(template, categoryMeta));
    list.append(heading, group);
  }
}

function makeTemplateRow(template, categoryMeta) {
  const row = document.createElement('div');
  row.className = 'prompt-card template-row';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.setAttribute('aria-label', `Use template ${template.name}`);
  const open = () => openTemplate(template);
  row.addEventListener('click', open);
  row.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });

  const badge = document.createElement('div');
  badge.className = 'prompt-card-icon';
  badge.append(icon(categoryMeta.icon));
  const text = document.createElement('div');
  text.className = 'prompt-card-text';
  const name = document.createElement('div');
  name.className = 'prompt-card-name';
  name.textContent = template.name;
  const about = document.createElement('div');
  about.className = 'prompt-card-sub';
  about.textContent = template.about;
  text.append(name, about);
  const lead = document.createElement('div');
  lead.className = 'prompt-card-meta';
  lead.append(badge, text);
  const chevron = document.createElement('div');
  chevron.className = 'prompt-card-chevron';
  chevron.append(icon('chev-right'));
  row.append(lead, chevron);
  return row;
}

function openTemplate(template) {
  activeTemplate = template;
  document.getElementById('template-title').textContent = template.name;
  document.getElementById('template-sub').textContent =
    template.about.length > 160 ? `${template.about.slice(0, 157)}…` : template.about;
  document.getElementById('template-fields').replaceChildren(...findVariables(template.body).map(name => {
    const field = document.createElement('div');
    field.className = 'template-field';
    const label = document.createElement('label');
    label.htmlFor = `tpl-var-${name}`;
    label.textContent = humanizeVariable(name);
    const input = document.createElement('textarea');
    input.id = `tpl-var-${name}`;
    input.rows = 2;
    input.maxLength = 6000;
    input.placeholder = VARIABLE_HINTS.get(name) || '';
    input.dataset.input = 'updateTemplateForm';
    field.append(label, input);
    return field;
  }));
  updateTemplateForm();
  goTo('screen-template');
}

function updateTemplateForm(event) {
  if (event?.target?.tagName === 'TEXTAREA') autoResizeTA(event.target);
  const names = findVariables(activeTemplate.body);
  document.getElementById('template-create-btn').disabled =
    names.some(name => !document.getElementById(`tpl-var-${name}`).value.trim());
}

function createFromTemplate() {
  if (!activeTemplate) return;
  const values = new Map(findVariables(activeTemplate.body)
    .map(name => [name, document.getElementById(`tpl-var-${name}`).value.trim()]));
  if ([...values.values()].some(value => !value)) return;
  const label = [...values.values()].find(value => value.length <= 30 && !value.includes('\n'));
  const now = Date.now();
  const record = {
    id: now,
    name: (label ? `${activeTemplate.name}: ${label}` : activeTemplate.name).slice(0, 60),
    ai: activeTemplate.ai || '',
    category: activeTemplate.category,
    subcategory: activeTemplate.subcategory || '',
    task: activeTemplate.about.slice(0, 1000),
    clarification: '',
    prompt: fillVariables(activeTemplate.body, values),
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
  savedPrompts.unshift(record);
  persist();
  announce('Prompt created from template.');
  viewSavedById(record.id);
  maybeRequestReview();
}

function useSavedAsTemplate() {
  const saved = findActiveSavedPrompt();
  if (!saved) return;
  openTemplate({
    name: saved.name,
    about: saved.task,
    category: saved.category,
    ai: saved.ai,
    subcategory: saved.subcategory,
    body: document.getElementById('view-prompt').value,
  });
}

// Shows "Use as template" only when the open prompt has {fields}, and says how to add them when it has none.
function updateTemplateHint() {
  const names = findVariables(document.getElementById('view-prompt').value);
  document.getElementById('use-template-btn').hidden = names.length === 0;
  document.getElementById('template-hint').textContent = names.length
    ? `Fill-in fields in this prompt: ${names.map(name => `{${name}}`).join(', ')}`
    : 'Tip: write {audience} or {topic} in braces to reuse this prompt as a template.';
}

/* ═══════════════════════════════════════════
   CLIPBOARD
   Fills the quick-start box and stops there: nothing is saved until the user
   taps Create Prompt, so whatever happens to be on the clipboard is never stored by accident.
═══════════════════════════════════════════ */
async function pasteFromClipboard() {
  const box = document.getElementById('quick-task');
  const button = document.getElementById('paste-btn');
  const flash = message => {
    button.lastChild.textContent = message;
    setTimeout(() => { button.lastChild.textContent = 'Paste from clipboard'; }, 2500);
    announce(message);
  };
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
      flash('The clipboard is empty');
      return;
    }
    box.setRangeText(text, box.selectionStart, box.selectionEnd, 'end');
    const clipped = box.value.length > box.maxLength;
    box.value = box.value.slice(0, box.maxLength);
    updateQuickStart();
    box.focus();
    announce(clipped ? `Pasted. Only the first ${box.maxLength} characters fit.` : 'Pasted from the clipboard.');
  } catch (error) {
    flash('Paste blocked. Press and hold the box.');
  }
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function announce(message) {
  const status = document.getElementById('app-status');
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = message; });
}
function autoResizeTA(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
}

/* ── Init ── */
// Controls name their handler in data-click / data-input / data-change instead of
// inline on* attributes, so the web build runs under a CSP without 'unsafe-inline'.
// data-arg, when present, is passed as the single argument; otherwise the event is.
for (const type of ['click', 'input', 'change']) {
  document.addEventListener(type, event => {
    const el = event.target.closest(`[data-${type}]`);
    if (!el) return;
    const fn = window[el.dataset[type]];
    'arg' in el.dataset ? fn(el.dataset.arg) : fn(event);
  });
}

renderList();
// Reading the clipboard needs the async Clipboard API; without it, press-and-hold paste still works.
if (!navigator.clipboard?.readText) document.getElementById('paste-btn').hidden = true;
// Peek QR is only on the App Store so far; don't send Android users there.
if (window.Capacitor?.getPlatform?.() === 'android') document.getElementById('more-apps-card').hidden = true;

// Reset step1 form when navigating to it
document.getElementById('screen-step1').addEventListener('transitionend', () => {});
// Allow tapping away from keyboard on iOS
document.addEventListener('touchstart', e => {
  const interactive = e.target.closest('button, a, input, textarea, select, label');
  if (!interactive) document.activeElement?.blur();
}, { passive: true });
