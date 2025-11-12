import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
export declare class LocationsController {
    constructor();
    createLocation(dto: CreateLocationDto, user: Record<string, any>): Promise<{
        message: string;
        data: CreateLocationDto;
    }>;
    listLocations(user: Record<string, any>): Promise<{
        message: string;
    }>;
    getLocation(id: string, user: Record<string, any>): Promise<{
        message: string;
        id: string;
    }>;
    updateLocation(id: string, dto: UpdateLocationDto, user: Record<string, any>): Promise<{
        message: string;
        id: string;
        data: UpdateLocationDto;
    }>;
    deleteLocation(id: string, user: Record<string, any>): Promise<{
        message: string;
        id: string;
    }>;
    getLocationStats(id: string, user: Record<string, any>): Promise<{
        message: string;
        id: string;
    }>;
}
