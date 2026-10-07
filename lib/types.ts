export type Joke = {
  id: number;
  setup: string;
  punchline: string;
  category: string;
};

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export type CaptionTone =
  | "deadpan"
  | "absurd"
  | "observational"
  | "wildcard";

export type GalleryCaption = {
  id: string;
  text: string;
  tone: CaptionTone;
  display_order: number;
  upvotes: number;
  downvotes: number;
  viewer_vote: -1 | 0 | 1;
};

export type GalleryImage = {
  id: string;
  description: string;
  image_url: string;
  created_at: string;
  captions: GalleryCaption[];
};
