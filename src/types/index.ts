export interface Resource {
  id: string;
  name: string;
  content: string;
}

export interface AttributeProperty {
  display_name: string;
  description: string;
  type: string;
}

export interface Attribute {
  id: number;
  description: string;
  display_name: string;
  name: string;
  type: string;
  properties?: Record<string, AttributeProperty>;
}

export interface AttributeResponse {
  prev_page: number | null;
  current_page: number;
  next_page: number | null;
  total_records: number;
  total_pages: number;
  records: Attribute[];
}

export interface ToolArguments {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

