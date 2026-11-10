export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterColumn {
  heading: string;
  links: readonly FooterLink[];
}
