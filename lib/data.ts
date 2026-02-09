export interface Contact {
  id: string
  name: string
  initials: string
  title: string
  company: string
  email: string
  location: {
    city: string
    country: string
    lat: number
    lng: number
  }
  bigIdea: {
    title: string
    description: string
    goals: string[]
  }
  valueProposition: string
  tags: string[]
  circles: string[]
  introducedBy: string | null
  addedAt: string
  networkVisibility: "public" | "friends" | "private"
}

export interface Connection {
  id: string
  from: string
  to: string
  relationship: string
  strength: number
  date: string
}

export interface Circle {
  id: string
  name: string
  color: string
  memberIds: string[]
}

export const CIRCLES: Circle[] = [
  { id: "c1", name: "Startup Founders", color: "#E8A838", memberIds: ["1", "6", "10", "12"] },
  { id: "c2", name: "Climate Action", color: "#4ECDC4", memberIds: ["3", "5", "9"] },
  { id: "c3", name: "AI Community", color: "#FF6B6B", memberIds: ["1", "6", "8", "10"] },
  { id: "c4", name: "Design Leaders", color: "#A78BFA", memberIds: ["2", "7", "9"] },
  { id: "c5", name: "Tech for Good", color: "#34D399", memberIds: ["2", "8", "12"] },
  { id: "c6", name: "Investors Circle", color: "#F472B6", memberIds: ["3", "11"] },
  { id: "c7", name: "LATAM Network", color: "#FBBF24", memberIds: ["7", "10"] },
]

export const CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Maya Chen",
    initials: "MC",
    title: "Founder & CEO",
    company: "NeuralPath AI",
    email: "maya@neuralpath.ai",
    location: { city: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194 },
    bigIdea: {
      title: "Democratizing AI for Small Businesses",
      description: "Building no-code AI tools that let small businesses automate customer service without technical expertise.",
      goals: ["Launch beta with 100 SMBs", "Raise Series A", "Build partnership network"],
    },
    valueProposition: "Deep expertise in AI/ML productization and startup scaling. Can connect you to investors in the AI space.",
    tags: ["founder", "ai", "saas"],
    circles: ["Startup Founders", "AI Community"],
    introducedBy: null,
    addedAt: "2024-03-15",
    networkVisibility: "public",
  },
  {
    id: "2",
    name: "James Okafor",
    initials: "JO",
    title: "Design Director",
    company: "Spotify",
    email: "james.okafor@spotify.com",
    location: { city: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686 },
    bigIdea: {
      title: "Inclusive Design Systems at Scale",
      description: "Creating an open-source framework for building accessible, culturally-aware design systems.",
      goals: ["Open-source the framework", "Present at Config 2025", "Build community of 1000 contributors"],
    },
    valueProposition: "World-class design thinking and experience building design systems used by millions.",
    tags: ["designer", "accessibility", "open-source"],
    circles: ["Design Leaders", "Tech for Good"],
    introducedBy: null,
    addedAt: "2024-01-20",
    networkVisibility: "friends",
  },
  {
    id: "3",
    name: "Priya Sharma",
    initials: "PS",
    title: "Climate Tech Investor",
    company: "Greenfield Ventures",
    email: "priya@greenfieldvc.com",
    location: { city: "Mumbai", country: "India", lat: 19.076, lng: 72.8777 },
    bigIdea: {
      title: "Funding the Carbon Removal Revolution",
      description: "Investing in breakthrough carbon capture technologies that can scale to gigatonne removal.",
      goals: ["Deploy $200M fund", "10 portfolio companies", "Measurable carbon impact"],
    },
    valueProposition: "Access to climate-focused capital and a network of deep-tech founders working on planetary-scale problems.",
    tags: ["investor", "climate", "deep-tech"],
    circles: ["Climate Action", "Investors Circle"],
    introducedBy: "1",
    addedAt: "2024-05-10",
    networkVisibility: "public",
  },
  {
    id: "4",
    name: "Luca Rossi",
    initials: "LR",
    title: "Head of Product",
    company: "Stripe",
    email: "luca@stripe.com",
    location: { city: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603 },
    bigIdea: {
      title: "Embedded Finance for Emerging Markets",
      description: "Building payment infrastructure that enables any app in Africa and SE Asia to offer financial services.",
      goals: ["Launch in 5 new markets", "Process $1B in transactions", "Partner with 50 local banks"],
    },
    valueProposition: "Deep knowledge of payments infrastructure and go-to-market in emerging economies.",
    tags: ["product", "fintech", "emerging-markets"],
    circles: [],
    introducedBy: null,
    addedAt: "2023-11-05",
    networkVisibility: "private",
  },
  {
    id: "5",
    name: "Aisha Williams",
    initials: "AW",
    title: "Community Builder",
    company: "On Deck",
    email: "aisha@ondeck.com",
    location: { city: "New York", country: "USA", lat: 40.7128, lng: -74.006 },
    bigIdea: {
      title: "The Future of Professional Communities",
      description: "Reimagining how professionals connect, learn, and grow together through curated micro-communities.",
      goals: ["Launch 20 new cohorts", "Build community platform", "Write the community playbook"],
    },
    valueProposition: "Master networker who can connect you to exactly the right person. Expertise in community-led growth.",
    tags: ["community", "education", "creator"],
    circles: [],
    introducedBy: "4",
    addedAt: "2024-02-28",
    networkVisibility: "public",
  },
  {
    id: "6",
    name: "Kenji Tanaka",
    initials: "KT",
    title: "Robotics Engineer",
    company: "Sony Research",
    email: "kenji.tanaka@sony.com",
    location: { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    bigIdea: {
      title: "Companion Robots for Elderly Care",
      description: "Developing emotionally intelligent companion robots that help elderly people maintain independence.",
      goals: ["Clinical trial with 500 users", "Partnership with care facilities", "Launch consumer version"],
    },
    valueProposition: "Cutting-edge robotics expertise and connections to major hardware manufacturers in Japan.",
    tags: ["robotics", "healthcare", "research"],
    circles: ["Startup Founders", "AI Community"],
    introducedBy: "1",
    addedAt: "2024-04-18",
    networkVisibility: "friends",
  },
  {
    id: "7",
    name: "Sofia Martinez",
    initials: "SM",
    title: "Creative Director",
    company: "Independent",
    email: "sofia@sofiamartinez.com",
    location: { city: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
    bigIdea: {
      title: "Latin American Creative Renaissance",
      description: "Building a platform connecting Latin American artists with global brands seeking authentic cultural storytelling.",
      goals: ["Onboard 500 creatives", "Partner with 20 global brands", "Host annual festival"],
    },
    valueProposition: "Incredible eye for design and deep connections in the LATAM creative industry.",
    tags: ["creative", "culture", "marketplace"],
    circles: ["Design Leaders", "LATAM Network"],
    introducedBy: null,
    addedAt: "2024-06-01",
    networkVisibility: "public",
  },
  {
    id: "8",
    name: "David Kim",
    initials: "DK",
    title: "Blockchain Architect",
    company: "Ethereum Foundation",
    email: "david.kim@ethereum.org",
    location: { city: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978 },
    bigIdea: {
      title: "Decentralized Identity for All",
      description: "Creating a self-sovereign identity protocol that gives individuals control over their digital identity.",
      goals: ["Launch protocol v1", "1M identity holders", "Government pilot program"],
    },
    valueProposition: "Deep blockchain expertise and vision for how decentralized systems can solve real-world problems.",
    tags: ["web3", "identity", "protocol"],
    circles: ["AI Community", "Tech for Good"],
    introducedBy: "4",
    addedAt: "2024-01-10",
    networkVisibility: "public",
  },
  {
    id: "9",
    name: "Emma Larsson",
    initials: "EL",
    title: "Head of Sustainability",
    company: "IKEA",
    email: "emma.larsson@ikea.com",
    location: { city: "Malmo", country: "Sweden", lat: 55.605, lng: 13.0038 },
    bigIdea: {
      title: "Circular Economy at Consumer Scale",
      description: "Transforming how the world's largest furniture company approaches product lifecycle and recycling.",
      goals: ["100% circular product lines", "Zero waste operations", "Industry-wide standards"],
    },
    valueProposition: "Knows how to make sustainability work at massive corporate scale. Bridge between startups and enterprise.",
    tags: ["sustainability", "corporate", "circular-economy"],
    circles: ["Climate Action", "Design Leaders"],
    introducedBy: "2",
    addedAt: "2024-07-15",
    networkVisibility: "friends",
  },
  {
    id: "10",
    name: "Rafael Santos",
    initials: "RS",
    title: "EdTech Founder",
    company: "Aprenda",
    email: "rafael@aprenda.edu",
    location: { city: "Sao Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
    bigIdea: {
      title: "AI-Powered Personalized Learning",
      description: "Using AI to create individualized learning paths for students in underserved communities across Latin America.",
      goals: ["Reach 1M students", "Prove learning outcomes", "Expand to 5 countries"],
    },
    valueProposition: "Understands education challenges in emerging markets and builds tech solutions that work in low-resource settings.",
    tags: ["edtech", "ai", "social-impact"],
    circles: ["LATAM Network", "AI Community"],
    introducedBy: "7",
    addedAt: "2024-08-20",
    networkVisibility: "public",
  },
  {
    id: "11",
    name: "Fatima Al-Hassan",
    initials: "FA",
    title: "Venture Partner",
    company: "500 Global",
    email: "fatima@500.co",
    location: { city: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
    bigIdea: {
      title: "MENA Startup Ecosystem Builder",
      description: "Developing the infrastructure and investment thesis for the next wave of startups from the Middle East.",
      goals: ["Invest in 30 MENA startups", "Launch accelerator program", "Create cross-border network"],
    },
    valueProposition: "Gateway to MENA market opportunities and deep understanding of cross-cultural business dynamics.",
    tags: ["investor", "ecosystem", "mena"],
    circles: ["Investors Circle"],
    introducedBy: "3",
    addedAt: "2024-09-01",
    networkVisibility: "private",
  },
  {
    id: "12",
    name: "Alex Thompson",
    initials: "AT",
    title: "Open Source Lead",
    company: "Vercel",
    email: "alex@vercel.com",
    location: { city: "Austin", country: "USA", lat: 30.2672, lng: -97.7431 },
    bigIdea: {
      title: "Making Web Development Accessible",
      description: "Leading initiatives to make modern web development tools more accessible and beginner-friendly.",
      goals: ["Grow contributor community 10x", "Launch learning platform", "Mentor 100 new developers"],
    },
    valueProposition: "Deep expertise in developer tools and open-source community building. Great at making complex things simple.",
    tags: ["developer", "open-source", "education"],
    circles: ["Tech for Good", "Startup Founders"],
    introducedBy: "5",
    addedAt: "2024-10-15",
    networkVisibility: "public",
  },
]

export const CONNECTIONS: Connection[] = [
  { id: "conn1", from: "1", to: "3", relationship: "Introduced at TechCrunch Disrupt", strength: 5, date: "2024-05-10" },
  { id: "conn2", from: "1", to: "6", relationship: "Met at AI Summit Tokyo", strength: 4, date: "2024-04-18" },
  { id: "conn3", from: "2", to: "9", relationship: "Connected through design community", strength: 4, date: "2024-07-15" },
  { id: "conn4", from: "4", to: "5", relationship: "Collaborated on fintech project", strength: 4, date: "2024-02-28" },
  { id: "conn5", from: "4", to: "8", relationship: "Met at ETHGlobal", strength: 3, date: "2024-01-10" },
  { id: "conn6", from: "5", to: "12", relationship: "On Deck fellowship connection", strength: 4, date: "2024-10-15" },
  { id: "conn7", from: "7", to: "10", relationship: "Creative collaboration", strength: 4, date: "2024-08-20" },
  { id: "conn8", from: "3", to: "11", relationship: "Co-invested in climate deal", strength: 5, date: "2024-09-01" },
  { id: "conn9", from: "1", to: "5", relationship: "Friends from college", strength: 5, date: "2023-06-15" },
  { id: "conn10", from: "2", to: "7", relationship: "Design conference speakers", strength: 3, date: "2024-03-20" },
  { id: "conn11", from: "6", to: "8", relationship: "Tech meetup in Seoul", strength: 3, date: "2024-05-25" },
  { id: "conn12", from: "9", to: "3", relationship: "Sustainability summit", strength: 4, date: "2024-08-05" },
  { id: "conn13", from: "10", to: "12", relationship: "EdTech hackathon", strength: 3, date: "2024-09-15" },
  { id: "conn14", from: "11", to: "4", relationship: "Fintech MENA conference", strength: 3, date: "2024-07-20" },
  { id: "conn15", from: "1", to: "8", relationship: "Collaborated on open-source AI project", strength: 3, date: "2024-06-01" },
  { id: "conn16", from: "6", to: "10", relationship: "Shared panel on AI for social good", strength: 2, date: "2024-09-10" },
  { id: "conn17", from: "5", to: "7", relationship: "Community event in CDMX", strength: 3, date: "2024-07-05" },
  { id: "conn18", from: "2", to: "12", relationship: "Open source contributors", strength: 4, date: "2024-04-20" },
]

export const ALL_TAGS = [...new Set(CONTACTS.flatMap((c) => c.tags))].sort()
export const ALL_CIRCLES = [...new Set(CONTACTS.flatMap((c) => c.circles).filter(Boolean))].sort()

export function getContactById(id: string): Contact | undefined {
  return CONTACTS.find((c) => c.id === id)
}

export function getConnectionsForContact(contactId: string): Connection[] {
  return CONNECTIONS.filter((c) => c.from === contactId || c.to === contactId)
}

export function getConnectedContacts(contactId: string): Contact[] {
  const conns = getConnectionsForContact(contactId)
  const connectedIds = conns.map((c) => (c.from === contactId ? c.to : c.from))
  return CONTACTS.filter((c) => connectedIds.includes(c.id))
}

export function getIntroductionChain(contactId: string): Contact[] {
  const chain: Contact[] = []
  let current = getContactById(contactId)
  while (current?.introducedBy) {
    const introducer = getContactById(current.introducedBy)
    if (introducer && !chain.find((c) => c.id === introducer.id)) {
      chain.push(introducer)
      current = introducer
    } else {
      break
    }
  }
  return chain
}
