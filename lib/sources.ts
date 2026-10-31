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

export interface PortalTarget {
  url: string;
  portalName: string;
  suggestedGoal: string;
}

interface IndicatorMapping {
  keywords: string[];
  url: string;
  portalName: string;
  metricLabel: string;
}

export const INDICATOR_MAPPINGS: IndicatorMapping[] = [
  {
    keywords: ["nuclear", "reactor", "fission", "atomic energy"],
    url: "https://ourworldindata.org/nuclear-energy",
    portalName: "Our World in Data (Nuclear Energy)",
    metricLabel: "nuclear energy generation, share of electricity, or safety records",
  },
  {
    keywords: ["solar", "wind", "renewable", "clean energy"],
    url: "https://ourworldindata.org/renewable-energy",
    portalName: "Our World in Data (Renewable Energy)",
    metricLabel: "renewable energy capacity, electricity production, or growth rates",
  },
  {
    keywords: ["electricity", "power generation", "grid", "coal", "fossil fuel"],
    url: "https://ourworldindata.org/grapher/per-capita-electricity-source-stacked",
    portalName: "Our World in Data (Electricity Sources)",
    metricLabel: "per-capita electricity generation by fuel source",
  },
  {
    keywords: ["co2", "emissions", "carbon", "greenhouse gas"],
    url: "https://ourworldindata.org/co2-emissions",
    portalName: "Our World in Data (CO2 Emissions)",
    metricLabel: "annual or cumulative CO2 emissions and trends",
  },
  {
    keywords: ["climate", "temperature", "warming", "sea level"],
    url: "https://ourworldindata.org/climate-change",
    portalName: "Our World in Data (Climate Change)",
    metricLabel: "global surface temperature anomalies or climate indicators",
  },
  {
    keywords: ["life expectancy", "longevity", "lifespan"],
    url: "https://ourworldindata.org/life-expectancy",
    portalName: "Our World in Data (Life Expectancy)",
    metricLabel: "life expectancy at birth and historical mortality rates",
  },
  {
    keywords: ["vaccine", "vaccination", "immunization", "polio", "measles"],
    url: "https://ourworldindata.org/vaccination",
    portalName: "Our World in Data (Vaccines)",
    metricLabel: "vaccination coverage rates and prevented deaths",
  },
  {
    keywords: ["gdp", "economic growth", "inflation", "recession"],
    url: "https://ourworldindata.org/economic-growth",
    portalName: "Our World in Data (Economic Growth)",
    metricLabel: "GDP per capita and economic growth statistics",
  },
  {
    keywords: ["poverty", "extreme poverty", "income inequality"],
    url: "https://ourworldindata.org/poverty",
    portalName: "Our World in Data (Poverty)",
    metricLabel: "share of population living in poverty",
  },
  {
    keywords: ["population", "birth rate", "fertility", "demographics"],
    url: "https://ourworldindata.org/world-population-growth",
    portalName: "Our World in Data (Population Growth)",
    metricLabel: "global population size and annual growth rate",
  },
  {
    keywords: ["artificial intelligence", "ai", "machine learning", "gpu", "compute"],
    url: "https://ourworldindata.org/artificial-intelligence",
    portalName: "Our World in Data (AI)",
    metricLabel: "AI capabilities, training compute, and adoption trends",
  },
];

export function resolvePortalForClaim(claimText: string, topic?: string): PortalTarget {
  const combined = `${topic || ""} ${claimText}`.toLowerCase();

  for (const mapping of INDICATOR_MAPPINGS) {
    for (const kw of mapping.keywords) {
      if (combined.includes(kw)) {
        return {
          url: mapping.url,
          portalName: mapping.portalName,
          suggestedGoal: `Examine the charts and data on this page to fact-check this claim: "${claimText}". Locate the exact metric for ${mapping.metricLabel}. Return a JSON object with: { "verdict": "supported"|"refuted"|"misleading"|"unverifiable", "foundValue": "<exact number or metric>", "sourceUrl": "<page URL>", "explanation": "<one sentence explanation>" }`,
        };
      }
    }
  }

  // Default fallback portal
  return {
    url: "https://ourworldindata.org",
    portalName: "Our World in Data",
    suggestedGoal: `Search this data portal to verify or refute this claim: "${claimText}". Find the primary indicator or chart. Return a JSON object with: { "verdict": "supported"|"refuted"|"misleading"|"unverifiable", "foundValue": "<value>", "sourceUrl": "<url>", "explanation": "<one sentence>" }`,
  };
}
