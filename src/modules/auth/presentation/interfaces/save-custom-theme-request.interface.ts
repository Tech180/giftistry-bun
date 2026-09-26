export interface SaveCustomThemeRequest {
  Id: string;
  Name: string;
  Colors: {
    Primary: string;
    Bg: string;
    Surface: string;
    Border: string;
    Text: string;
    TextMuted?: string;
  };
  Advanced?: {
    Shadows?: {
      Sm?: string;
      Md?: string;
      Lg?: string;
    };
    Fonts?: {
      Sans?: string;
    };
    Radius?: {
      Default?: string;
    };
  };
}
