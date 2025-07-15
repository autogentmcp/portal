declare module 'akeyless' {
  export interface Auth {
    accessId: string;
    accessKey: string;
  }

  export interface SetItem {
    name: string;
    value: string;
    token: string;
    type: string;
  }

  export interface GetSecretValue {
    names: string[];
    token: string;
  }

  export interface DeleteItem {
    name: string;
    token: string;
    deleteImmediately: boolean;
  }

  export class Auth {
    constructor(params: { accessId: string, accessKey: string });
  }

  export class SetItem {
    constructor(params: { name: string, value: string, token: string, type: string });
  }

  export class GetSecretValue {
    constructor(params: { names: string[], token: string });
  }

  export class DeleteItem {
    constructor(params: { name: string, token: string, deleteImmediately: boolean });
  }

  export class V2Api {
    auth(auth: Auth): Promise<{ token: string }>;
    setItem(item: SetItem): Promise<any>;
    getSecretValue(params: GetSecretValue): Promise<Record<string, string>>;
    deleteItem(params: DeleteItem): Promise<any>;
  }

  export class ApiClient {
    static get instance(): ApiClient;
    basePath: string;
  }
}
