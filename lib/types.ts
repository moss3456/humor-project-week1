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
