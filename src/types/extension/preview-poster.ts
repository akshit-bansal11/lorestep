export interface PreviewPoster {
  title: string;
  /** Tailwind fill class for the fold corner; null leaves the poster unmarked. */
  fold: string | null;
  surface: string;
}
