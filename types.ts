export enum VerdictType {
  SAFE = "SAFE",
  RISKY = "RISKY",
  UNSAFE = "UNSAFE"
}

export interface EvidenceReport {
  imageAssessment?: {
    readable: boolean;
    ingredientsVisible: boolean;
    ingredientsComplete: boolean;
    allergenStatementVisible: boolean;
  };
  productIdentification?: {
    brand?: string;
    productName?: string;
    category?: string;
  };
  ingredients?: string[];
  glutenTriggers?: { ingredient: string; source: string }[];
  warnings?: { statement: string; type: string }[];
  glutenFreeClaim?: { found: boolean; text?: string };
  certification?: { found: boolean; type?: string };
  notes?: string;
}

export interface VerifiedAlternative {
  barcode: string;
  name: string;
  price: number;
  category?: string;
}

export interface AnalysisResult {
  verdict: VerdictType;
  verdictTitle: string; // e.g., "غير آمن"
  reasonCode?: string;
  analysis: string;
  guidance: string;
  alternatives?: string;
  matchedStoreItem?: string; // Legacy support: Name of the item
  alternative?: VerifiedAlternative | null;
  evidence?: EvidenceReport;
  timestamp: number;
  imageUrl?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}