export const TIER_1_DOMAINS = [
  "who.int",
  "un.org",
  "worldbank.org",
  "ourworldindata.org",
  "nature.com",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "cdc.gov",
  "nih.gov",
  "bls.gov",
  "census.gov",
  "nasa.gov",
  "epa.gov",
];

export const TIER_2_DOMAINS = [
  "wikipedia.org",
  "nytimes.com",
  "washingtonpost.com",
  "theguardian.com",
  "wsj.com",
  "bloomberg.com",
  "economist.com",
  "ft.com",
  "cnn.com",
  "forbes.com",
  "time.com",
  "scientificamerican.com",
  "pbs.org",
  "npr.org",
  "snopes.com",
  "politifact.com",
  "factcheck.org",
];

export function extractDomain(urlOrDomain: string): string {
  try {
    let hostname = urlOrDomain.trim().toLowerCase();
    if (hostname.includes("://")) {
      hostname = new URL(hostname).hostname;
    } else if (hostname.includes("/")) {
      hostname = hostname.split("/")[0];
    }
    // Remove port if any
    hostname = hostname.split(":")[0];
    // Remove leading www.
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return urlOrDomain.toLowerCase().trim();
  }
}

export function getDomainTier(urlOrDomain: string): 1 | 2 | 3 {
  const domain = extractDomain(urlOrDomain);

  // Any .gov or .gov.* domain is Tier 1
  if (domain.endsWith(".gov") || domain.includes(".gov.")) {
    return 1;
  }

  // Exact or subdomain match for Tier 1
  for (const t1 of TIER_1_DOMAINS) {
    if (domain === t1 || domain.endsWith("." + t1)) {
      return 1;
    }
  }

  // Exact or subdomain match for Tier 2
  for (const t2 of TIER_2_DOMAINS) {
    if (domain === t2 || domain.endsWith("." + t2)) {
      return 2;
    }
  }

  return 3;
}

export function getTier1SearchDomains(): string {
  // Comma-separated list of top tier 1 domains for TinySearch include_domains
  return "who.int,un.org,worldbank.org,ourworldindata.org,nature.com,reuters.com,apnews.com,bbc.com";
}

export interface PortalConfig {
  id: string;
  name: string;
  baseUrl: string;
  topics: string[];
}

export const PORTAL_MAP: PortalConfig[] = [
  {
    id: "owid",
    name: "Our World in Data",
    baseUrl: "https://ourworldindata.org",
    topics: ["energy", "health", "climate", "poverty", "population", "food", "environment", "technology"],
  },
  {
    id: "worldbank",
    name: "World Bank Open Data",
    baseUrl: "https://data.worldbank.org",
    topics: ["economy", "finance", "gdp", "trade", "education", "development"],
  },
  {
    id: "who",
    name: "World Health Organization",
    baseUrl: "https://www.who.int",
    topics: ["disease", "vaccine", "mortality", "health", "pandemic"],
  },
];
