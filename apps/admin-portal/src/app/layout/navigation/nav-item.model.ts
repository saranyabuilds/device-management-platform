export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly permission?: string;
}
