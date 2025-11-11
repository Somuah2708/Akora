export interface NewsOutlet {
  id: string;
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export interface CountryOutlets {
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., gh, us)
  countryName: string;
  outlets: NewsOutlet[];
}
