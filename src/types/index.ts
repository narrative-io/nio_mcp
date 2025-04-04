export interface Resource {
  id: string;
  name: string;
  content: string;
}

export interface ToolArguments {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
