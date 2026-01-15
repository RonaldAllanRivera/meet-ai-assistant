export type AnswerRequest = {
  question: string;
  context?: string[];
};

export type AnswerResponse = {
  answer: string;
  blocked?: boolean;
  reason?: string;
};

export type InstallResponse = {
  token: string;
  issuedAt: number;
  expiresAt: number;
};
