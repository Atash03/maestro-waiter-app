declare module 'react-native-zeroconf' {
  export interface ZeroconfService {
    name: string;
    fullName: string;
    host: string;
    port: number;
    addresses: string[];
    txt: Record<string, string>;
  }

  export default class Zeroconf {
    scan(type: string, protocol: string, domain: string): void;
    stop(): void;
    getServices(): Record<string, ZeroconfService>;
    removeDeviceListeners(): void;
    addDeviceListeners(): void;
    publishService(
      type: string,
      protocol: string,
      domain: string,
      name: string,
      port: number,
      txt?: Record<string, string>
    ): void;
    unpublishService(name: string): void;

    on(event: 'start', callback: () => void): void;
    on(event: 'stop', callback: () => void): void;
    on(event: 'found', callback: (name: string) => void): void;
    on(event: 'resolved', callback: (service: ZeroconfService) => void): void;
    on(event: 'remove', callback: (name: string) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'update', callback: () => void): void;
  }
}
