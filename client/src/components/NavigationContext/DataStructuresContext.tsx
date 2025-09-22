export interface CardData {
  id: number;
  name: string;
  description: string;
  data_type: string;
  data_file: string;
  data_url: string
  photo: File | null;
  favorite: boolean;
}
