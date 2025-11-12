export declare class CreateLocationDto {
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    isHeadquarters?: boolean;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
}
export declare class UpdateLocationDto {
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    isHeadquarters?: boolean;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
}
